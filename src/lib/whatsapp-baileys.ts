import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import { db, ensureWhatsAppTables } from "@/lib/db";
import { saveMedia } from "@/lib/media-storage";
import { formatWhatsAppPhone, WhatsAppSessionInfo, WhatsAppChat, WhatsAppMessage, WhatsAppBotSettings } from "./whatsapp-shared";

export type BaileysStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export type BaileysStreamEvent =
  | { type: "new_message"; data: WhatsAppMessage; chat?: Partial<WhatsAppChat> }
  | { type: "chat_updated"; data: Partial<WhatsAppChat> }
  | { type: "status_update"; data: WhatsAppSessionInfo };

type EventSubscriber = (event: BaileysStreamEvent) => void;

const AUTH_FOLDER = path.join(process.cwd(), "data", "whatsapp_auth");

function isCurrentlyNight(startTime = "22:00", endTime = "09:00"): boolean {
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hour12: false });
    const [curH, curM] = timeStr.split(":").map(Number);
    const currentMinutes = curH * 60 + curM;

    const [startH, startM] = startTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = endTime.split(":").map(Number);
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  } catch {
    return false;
  }
}

class WhatsAppBaileysManager {
  private sock: WASocket | null = null;
  private status: BaileysStatus = "disconnected";
  private qrCodeDataUrl: string | null = null;
  private user: { id: string; name?: string; phone?: string } | null = null;
  private connectedAt: Date | null = null;
  private lastError: string | null = null;
  private isInitializing = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribers = new Set<EventSubscriber>();
  private silentLogger = pino({ level: "silent" });

  constructor() {
    // Empty constructor
  }

  public subscribe(cb: EventSubscriber): void {
    this.subscribers.add(cb);
  }

  public unsubscribe(cb: EventSubscriber): void {
    this.subscribers.delete(cb);
  }

  public emitEvent(event: BaileysStreamEvent): void {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.warn("Error notifying event subscriber:", err);
      }
    }
  }

  public getStatus(): WhatsAppSessionInfo {
    return {
      status: this.status,
      qrCode: this.qrCodeDataUrl,
      user: this.user,
      connectedAt: this.connectedAt ? this.connectedAt.toISOString() : null,
      lastError: this.lastError,
    };
  }

  private async restoreAuthFromDb(): Promise<void> {
    try {
      await ensureWhatsAppTables();
      const res = await db.query(
        "SELECT session_data, phone, push_name, connected_at FROM whatsapp_sessions_backup WHERE id = 'default'",
      );
      if (res.rowCount && res.rows[0]?.session_data) {
        if (!fs.existsSync(AUTH_FOLDER)) {
          fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }
        const sessionData = res.rows[0].session_data;
        if (typeof sessionData === "object") {
          for (const [filename, content] of Object.entries(sessionData)) {
            const filePath = path.join(AUTH_FOLDER, filename);
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, typeof content === "string" ? content : JSON.stringify(content), "utf8");
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to restore WhatsApp session from DB:", err);
    }
  }

  private async backupAuthToDb(): Promise<void> {
    try {
      if (!fs.existsSync(AUTH_FOLDER)) return;
      const files = fs.readdirSync(AUTH_FOLDER);
      const sessionData: Record<string, string> = {};
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(AUTH_FOLDER, file);
          sessionData[file] = fs.readFileSync(filePath, "utf8");
        }
      }

      await ensureWhatsAppTables();
      await db.query(
        `INSERT INTO whatsapp_sessions_backup (id, session_data, phone, push_name, connected_at, updated_at)
         VALUES ('default', $1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           session_data = EXCLUDED.session_data,
           phone = COALESCE(EXCLUDED.phone, whatsapp_sessions_backup.phone),
           push_name = COALESCE(EXCLUDED.push_name, whatsapp_sessions_backup.push_name),
           connected_at = COALESCE(EXCLUDED.connected_at, whatsapp_sessions_backup.connected_at),
           updated_at = NOW()`,
        [
          JSON.stringify(sessionData),
          this.user?.phone || null,
          this.user?.name || null,
          this.connectedAt || null,
        ],
      );
    } catch (err) {
      console.warn("Failed to backup WhatsApp auth to DB:", err);
    }
  }

  public async matchCustomer(phoneOrJid: string): Promise<{ id: string; full_name: string; customer_code: string | null } | null> {
    try {
      await ensureWhatsAppTables();

      // 1. Check if chat already has a linked customer in whatsapp_chats
      const existingChat = await db.query(
        "SELECT customer_id FROM whatsapp_chats WHERE jid = $1 AND customer_id IS NOT NULL LIMIT 1",
        [phoneOrJid],
      );
      if (existingChat.rowCount && existingChat.rows[0]?.customer_id) {
        const custRes = await db.query(
          "SELECT id, full_name, customer_code FROM customers WHERE id = $1",
          [existingChat.rows[0].customer_id],
        );
        if (custRes.rowCount) return custRes.rows[0];
      }

      // 2. Normalize digits
      const rawNumber = phoneOrJid.split("@")[0].replace(/\D/g, "");
      if (!rawNumber) return null;

      const localEgypt = rawNumber.startsWith("20") && rawNumber.length === 12 ? "0" + rawNumber.slice(2) : rawNumber;
      const intlEgypt = rawNumber.startsWith("01") && rawNumber.length === 11 ? "2" + rawNumber : rawNumber;

      const res = await db.query(
        `SELECT id, full_name, customer_code FROM customers
         WHERE phone = $1 OR phone = $2 OR phone = $3 OR phone = $4
            OR id IN (SELECT customer_id FROM customer_phones WHERE phone = $1 OR phone = $2 OR phone = $3 OR phone = $4)
         LIMIT 1`,
        [rawNumber, localEgypt, intlEgypt, `+${intlEgypt}`],
      );

      return res.rows[0] || null;
    } catch {
      return null;
    }
  }

  public async init(): Promise<WhatsAppSessionInfo> {
    if (this.sock && (this.status === "connected" || this.status === "connecting" || this.status === "qr_ready")) {
      return this.getStatus();
    }

    if (this.isInitializing) {
      return this.getStatus();
    }

    this.isInitializing = true;
    this.status = "connecting";
    this.lastError = null;
    this.emitEvent({ type: "status_update", data: this.getStatus() });

    try {
      if (!fs.existsSync(AUTH_FOLDER)) {
        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        await this.restoreAuthFromDb();
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: this.silentLogger,
        syncFullHistory: false,
        browser: ["Luniva Enterprise", "Chrome", "1.0.0"],
      });

      this.sock = sock;

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              width: 340,
              margin: 2,
              color: { dark: "#0f172a", light: "#ffffff" },
            });
            this.status = "qr_ready";
            this.emitEvent({ type: "status_update", data: this.getStatus() });
          } catch (qrErr) {
            console.error("QR generation error:", qrErr);
          }
        }

        if (connection === "open") {
          this.status = "connected";
          this.qrCodeDataUrl = null;
          this.connectedAt = new Date();
          const userJid = sock.user?.id || "";
          const phone = userJid.split(":")[0]?.replace(/\D/g, "") || "";
          this.user = {
            id: userJid,
            name: sock.user?.name || "لونيفا للأزياء",
            phone,
          };
          this.lastError = null;
          this.emitEvent({ type: "status_update", data: this.getStatus() });
          await this.backupAuthToDb();
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          this.status = "disconnected";
          this.qrCodeDataUrl = null;
          this.sock = null;
          this.emitEvent({ type: "status_update", data: this.getStatus() });

          if (isLoggedOut) {
            this.user = null;
            this.connectedAt = null;
            this.lastError = "تم تسجيل الخروج من الجهاز.";
            try {
              if (fs.existsSync(AUTH_FOLDER)) {
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
              }
              await db.query("DELETE FROM whatsapp_sessions_backup WHERE id = 'default'");
            } catch {
              // ignore
            }
          } else {
            this.lastError = "تم قطع الاتصال مؤقتاً، جاري المحاولة...";
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              this.init().catch(console.error);
            }, 4000);
          }
        }
      });

      sock.ev.on("creds.update", async () => {
        await saveCreds();
        await this.backupAuthToDb();
      });

      // Handle incoming messages
      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        for (const msg of messages) {
          if (!msg.message) continue;

          const jid = msg.key.remoteJid;
          if (!jid || jid.endsWith("@broadcast") || jid.includes("status@broadcast")) continue;

          const fromMe = Boolean(msg.key.fromMe);
          const messageId = msg.key.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const senderName = msg.pushName || (fromMe ? "لونيفا" : "عميلة لونيفا");

          // Download media if attached using database storage (Zero filesystem dependency)
          let mediaUrl: string | null = null;
          let mediaType: "image" | "video" | "audio" | "document" | null = null;

          if (msg.message.imageMessage) {
            mediaType = "image";
            try {
              const buffer = (await downloadMediaMessage(msg, "buffer", {}, { logger: this.silentLogger, reuploadRequest: sock.updateMediaMessage })) as Buffer;
              if (buffer && buffer.length > 0) {
                mediaUrl = await saveMedia({ buffer, mimeType: "image/jpeg", fileName: `img_${messageId}.jpg` });
              }
            } catch (err) {
              console.warn("Could not download image attachment:", err);
            }
          } else if (msg.message.audioMessage) {
            mediaType = "audio";
            try {
              const buffer = (await downloadMediaMessage(msg, "buffer", {}, { logger: this.silentLogger, reuploadRequest: sock.updateMediaMessage })) as Buffer;
              if (buffer && buffer.length > 0) {
                mediaUrl = await saveMedia({ buffer, mimeType: "audio/ogg", fileName: `audio_${messageId}.ogg` });
              }
            } catch (err) {
              console.warn("Could not download audio attachment:", err);
            }
          } else if (msg.message.videoMessage) {
            mediaType = "video";
            try {
              const buffer = (await downloadMediaMessage(msg, "buffer", {}, { logger: this.silentLogger, reuploadRequest: sock.updateMediaMessage })) as Buffer;
              if (buffer && buffer.length > 0) {
                mediaUrl = await saveMedia({ buffer, mimeType: "video/mp4", fileName: `video_${messageId}.mp4` });
              }
            } catch (err) {
              console.warn("Could not download video attachment:", err);
            }
          } else if (msg.message.documentMessage) {
            mediaType = "document";
            try {
              const buffer = (await downloadMediaMessage(msg, "buffer", {}, { logger: this.silentLogger, reuploadRequest: sock.updateMediaMessage })) as Buffer;
              if (buffer && buffer.length > 0) {
                const origName = msg.message.documentMessage.fileName || `file_${messageId}.pdf`;
                const mime = msg.message.documentMessage.mimetype || "application/pdf";
                mediaUrl = await saveMedia({ buffer, mimeType: mime, fileName: origName });
              }
            } catch (err) {
              console.warn("Could not download doc attachment:", err);
            }
          }

          // Text content
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            msg.message.documentMessage?.caption ||
            (mediaType === "image" ? "[صورة]" : "") ||
            (mediaType === "audio" ? "[تسجيل صوتي]" : "") ||
            (mediaType === "video" ? "[فيديو]" : "") ||
            (mediaType === "document" ? "[مستند]" : "") ||
            "";

          if (!text && !mediaUrl) continue;

          const rawPhone = jid.split("@")[0].replace(/\D/g, "");
          const matchedCust = await this.matchCustomer(jid);

          // Attempt to fetch profile picture in background
          let profilePic: string | null = null;
          try {
            const pic = await sock.profilePictureUrl(jid, "image");
            profilePic = pic || null;
          } catch {
            // Profile picture may not be public
          }

          try {
            await ensureWhatsAppTables();

            // 1. Upsert or update chat
            const chatRes = await db.query(
              `INSERT INTO whatsapp_chats (jid, name, phone, customer_id, unread_count, last_message, last_message_at, image_url, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
               ON CONFLICT (jid) DO UPDATE SET
                 name = COALESCE(EXCLUDED.name, whatsapp_chats.name),
                 customer_id = COALESCE(EXCLUDED.customer_id, whatsapp_chats.customer_id),
                 unread_count = CASE WHEN $8 = true THEN 0 ELSE whatsapp_chats.unread_count + 1 END,
                 last_message = EXCLUDED.last_message,
                 last_message_at = NOW(),
                 image_url = COALESCE(EXCLUDED.image_url, whatsapp_chats.image_url),
                 updated_at = NOW()
               RETURNING *`,
              [
                jid,
                matchedCust?.full_name || senderName,
                rawPhone,
                matchedCust?.id || null,
                fromMe ? 0 : 1,
                text || `[${mediaType}]`,
                profilePic,
                fromMe,
              ],
            );

            // 2. Insert message
            const msgRes = await db.query(
              `INSERT INTO whatsapp_messages (chat_jid, message_id, from_me, sender_jid, sender_name, content, media_url, media_type, status, customer_id, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
               ON CONFLICT (message_id) DO NOTHING
               RETURNING *`,
              [
                jid,
                messageId,
                fromMe,
                msg.key.participant || jid,
                senderName,
                text || `[${mediaType}]`,
                mediaUrl,
                mediaType,
                fromMe ? "sent" : "received",
                matchedCust?.id || null,
              ],
            );

            const savedMsg: WhatsAppMessage = msgRes.rows[0] || {
              id: messageId,
              chat_jid: jid,
              message_id: messageId,
              from_me: fromMe,
              sender_jid: msg.key.participant || jid,
              sender_name: senderName,
              content: text || `[${mediaType}]`,
              media_url: mediaUrl,
              media_type: mediaType,
              status: fromMe ? "sent" : "received",
              customer_id: matchedCust?.id || null,
              created_at: new Date().toISOString(),
            };

            // 3. BROADCAST REAL-TIME EVENT OVER SSE
            this.emitEvent({
              type: "new_message",
              data: savedMsg,
              chat: chatRes.rows[0],
            });

            // 4. Handle Smart Auto-Reply (Night Mode & Daytime Bot)
            if (!fromMe && (text || mediaUrl)) {
              await this.handleAutoReply(jid, matchedCust);
            }
          } catch (dbErr) {
            console.error("Error saving WhatsApp message to DB:", dbErr);
          }
        }
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.status = "disconnected";
      this.lastError = errorMsg;
      console.error("Failed to initialize Baileys:", err);
    } finally {
      this.isInitializing = false;
    }

    return this.getStatus();
  }

  private async handleAutoReply(jid: string, customer: { id: string; full_name: string } | null): Promise<void> {
    try {
      await ensureWhatsAppTables();
      const settingsRes = await db.query(
        `SELECT is_auto_reply_enabled, welcome_message, is_night_mode_enabled,
                night_start_time, night_end_time, night_message, always_reply_night
         FROM whatsapp_bot_settings WHERE id = 'default'`,
      );
      const settings: WhatsAppBotSettings = settingsRes.rows[0];
      if (!settings) return;

      const isNight = isCurrentlyNight(settings.night_start_time || "22:00", settings.night_end_time || "09:00");

      let shouldReply = false;
      let replyMessageTemplate = "";

      if (isNight && settings.is_night_mode_enabled && settings.night_message) {
        replyMessageTemplate = settings.night_message;

        if (settings.always_reply_night) {
          const recentNight = await db.query(
            `SELECT id FROM whatsapp_messages
             WHERE chat_jid = $1 AND from_me = true AND created_at >= NOW() - INTERVAL '15 minutes'
             LIMIT 1`,
            [jid],
          );
          if (recentNight.rowCount === 0) {
            shouldReply = true;
          }
        } else {
          const recentNight = await db.query(
            `SELECT id FROM whatsapp_messages
             WHERE chat_jid = $1 AND from_me = true AND created_at >= NOW() - INTERVAL '6 hours'
             LIMIT 1`,
            [jid],
          );
          if (recentNight.rowCount === 0) {
            shouldReply = true;
          }
        }
      } else if (!isNight && settings.is_auto_reply_enabled && settings.welcome_message) {
        replyMessageTemplate = settings.welcome_message;

        const recentDay = await db.query(
          `SELECT id FROM whatsapp_messages
           WHERE chat_jid = $1 AND from_me = true AND created_at >= NOW() - INTERVAL '6 hours'
           LIMIT 1`,
          [jid],
        );
        if (recentDay.rowCount === 0) {
          shouldReply = true;
        }
      }

      if (shouldReply && replyMessageTemplate) {
        const custName = customer?.full_name || "عزيزتي";
        const finalMessage = replyMessageTemplate.replace(/\{اسم_العميلة\}/g, custName);

        setTimeout(async () => {
          await this.sendMessage(jid, finalMessage);
        }, 1500);
      }
    } catch (err) {
      console.warn("Auto-reply processing error:", err);
    }
  }

  public async sendMessage(
    to: string,
    text: string,
    mediaFile?: {
      buffer: Buffer;
      mimetype: string;
      type: "image" | "video" | "audio" | "document";
      fileName?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.sock || this.status !== "connected") {
      return { success: false, error: "واتساب غير متصل. يرجى مسح رمز الاستجابة السريعة (QR) أولاً." };
    }

    try {
      let jid = to.trim();
      if (!jid.includes("@")) {
        const cleanPhone = formatWhatsAppPhone(jid);
        jid = `${cleanPhone}@s.whatsapp.net`;
      }

      let sentMsg;
      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | "audio" | "document" | null = null;

      if (mediaFile) {
        mediaType = mediaFile.type;
        // Save persistent media
        mediaUrl = await saveMedia({
          buffer: mediaFile.buffer,
          mimeType: mediaFile.mimetype,
          fileName: mediaFile.fileName || `file_${Date.now()}`,
        });

        if (mediaFile.type === "image") {
          sentMsg = await this.sock.sendMessage(jid, { image: mediaFile.buffer, caption: text.trim() || undefined });
        } else if (mediaFile.type === "video") {
          sentMsg = await this.sock.sendMessage(jid, { video: mediaFile.buffer, caption: text.trim() || undefined });
        } else if (mediaFile.type === "audio") {
          sentMsg = await this.sock.sendMessage(jid, { audio: mediaFile.buffer, ptt: true, mimetype: "audio/mp4" });
        } else {
          sentMsg = await this.sock.sendMessage(jid, {
            document: mediaFile.buffer,
            mimetype: mediaFile.mimetype || "application/octet-stream",
            fileName: mediaFile.fileName || "document.pdf",
            caption: text.trim() || undefined,
          });
        }
      } else {
        sentMsg = await this.sock.sendMessage(jid, { text: text.trim() });
      }

      const messageId = sentMsg?.key?.id || `out_${Date.now()}`;
      const matchedCust = await this.matchCustomer(jid);
      const rawPhone = jid.split("@")[0].replace(/\D/g, "");

      await ensureWhatsAppTables();

      // Upsert into chats
      const chatRes = await db.query(
        `INSERT INTO whatsapp_chats (jid, name, phone, customer_id, unread_count, last_message, last_message_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())
         ON CONFLICT (jid) DO UPDATE SET
           customer_id = COALESCE(EXCLUDED.customer_id, whatsapp_chats.customer_id),
           unread_count = 0,
           last_message = EXCLUDED.last_message,
           last_message_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [jid, matchedCust?.full_name || rawPhone, rawPhone, matchedCust?.id || null, text.trim() || `[${mediaType}]`],
      );

      // Record message
      const msgRes = await db.query(
        `INSERT INTO whatsapp_messages (chat_jid, message_id, from_me, sender_jid, sender_name, content, media_url, media_type, status, customer_id, created_at)
         VALUES ($1, $2, true, $3, 'لونيفا للأزياء', $4, $5, $6, 'sent', $7, NOW())
         ON CONFLICT (message_id) DO NOTHING
         RETURNING *`,
        [jid, messageId, this.user?.id || "luniva@s.whatsapp.net", text.trim() || `[${mediaType}]`, mediaUrl, mediaType, matchedCust?.id || null],
      );

      const savedMsg: WhatsAppMessage = msgRes.rows[0] || {
        id: messageId,
        chat_jid: jid,
        message_id: messageId,
        from_me: true,
        sender_jid: this.user?.id || "luniva",
        sender_name: "لونيفا للأزياء",
        content: text.trim() || `[${mediaType}]`,
        media_url: mediaUrl,
        media_type: mediaType,
        status: "sent",
        customer_id: matchedCust?.id || null,
        created_at: new Date().toISOString(),
      };

      this.emitEvent({
        type: "new_message",
        data: savedMsg,
        chat: chatRes.rows[0],
      });

      // Audit log
      await db.query(
        `INSERT INTO whatsapp_logs (customer_id, customer_name, phone, template_category, message, status, sent_by)
         VALUES ($1, $2, $3, 'direct', $4, 'sent', 'admin')`,
        [matchedCust?.id || null, matchedCust?.full_name || null, rawPhone, text.trim() || `[${mediaType}]`],
      );

      return { success: true, messageId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Failed to send WhatsApp message via Baileys:", err);
      return { success: false, error: errorMsg };
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
      }
    } catch {
      // ignore
    } finally {
      this.sock = null;
      this.status = "disconnected";
      this.qrCodeDataUrl = null;
      this.user = null;
      this.connectedAt = null;
      this.emitEvent({ type: "status_update", data: this.getStatus() });

      try {
        if (fs.existsSync(AUTH_FOLDER)) {
          fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        }
        await ensureWhatsAppTables();
        await db.query("DELETE FROM whatsapp_sessions_backup WHERE id = 'default'");
      } catch (err) {
        console.warn("Failed to clear auth folder:", err);
      }
    }
  }
}

declare global {
  var __whatsappBaileysManager: WhatsAppBaileysManager | undefined;
}

export const baileysManager = globalThis.__whatsappBaileysManager || new WhatsAppBaileysManager();
if (process.env.NODE_ENV !== "production") {
  globalThis.__whatsappBaileysManager = baileysManager;
}

export async function getBaileysChats(filter = "all"): Promise<WhatsAppChat[]> {
  await ensureWhatsAppTables();
  let where = "";
  if (filter === "unread") {
    where = "WHERE c.unread_count > 0";
  } else if (filter === "customers") {
    where = "WHERE c.customer_id IS NOT NULL";
  }

  const res = await db.query(`
    SELECT
      c.id,
      c.jid,
      c.name,
      c.phone,
      c.customer_id,
      cust.full_name AS customer_name,
      cust.customer_code,
      COALESCE(cust.image_url, c.image_url) AS image_url,
      c.unread_count,
      c.last_message,
      c.last_message_at::text,
      c.is_pinned,
      c.is_archived
    FROM whatsapp_chats c
    LEFT JOIN customers cust ON cust.id = c.customer_id
    ${where}
    ORDER BY c.is_pinned DESC, c.last_message_at DESC
    LIMIT 100
  `);

  return res.rows;
}

export async function getBaileysMessages(chatJid: string, limit = 100): Promise<WhatsAppMessage[]> {
  await ensureWhatsAppTables();
  const res = await db.query(
    `SELECT
      id,
      chat_jid,
      message_id,
      from_me,
      sender_jid,
      sender_name,
      content,
      media_url,
      media_type,
      status,
      customer_id,
      created_at::text
     FROM whatsapp_messages
     WHERE chat_jid = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [chatJid, limit],
  );

  return res.rows;
}

export async function markChatAsRead(chatJid: string): Promise<void> {
  await ensureWhatsAppTables();
  await db.query("UPDATE whatsapp_chats SET unread_count = 0 WHERE jid = $1", [chatJid]);
}
