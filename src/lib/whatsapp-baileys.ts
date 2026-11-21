import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import { db, ensureWhatsAppTables } from "@/lib/db";
import { formatWhatsAppPhone, WhatsAppSessionInfo, WhatsAppChat, WhatsAppMessage } from "./whatsapp-shared";

export type BaileysStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

const AUTH_FOLDER = path.join(process.cwd(), "data", "whatsapp_auth");

class WhatsAppBaileysManager {
  private sock: WASocket | null = null;
  private status: BaileysStatus = "disconnected";
  private qrCodeDataUrl: string | null = null;
  private user: { id: string; name?: string; phone?: string } | null = null;
  private connectedAt: Date | null = null;
  private lastError: string | null = null;
  private isInitializing = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Empty constructor
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

  /**
   * Restores session credentials from PostgreSQL database if local files were purged.
   */
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

  /**
   * Backs up session credentials to PostgreSQL so they survive restarts / deployments.
   */
  private async backupAuthToDb(): Promise<void> {
    try {
      if (!fs.existsSync(AUTH_FOLDER)) return;
      const files = fs.readdirSync(AUTH_FOLDER);
      const sessionData: Record<string, string> = {};
      for (const file of files) {
        // Backup creds.json and app-state keys
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

  /**
   * Match incoming or outgoing WhatsApp phone/JID to a registered customer.
   */
  public async matchCustomer(phoneOrJid: string): Promise<{ id: string; full_name: string; customer_code: string | null } | null> {
    try {
      await ensureWhatsAppTables();
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

  /**
   * Initializes and starts Baileys Multi-Device connection.
   */
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

    try {
      if (!fs.existsSync(AUTH_FOLDER)) {
        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        await this.restoreAuthFromDb();
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

      const silentLogger = pino({ level: "silent" });

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: silentLogger,
        syncFullHistory: false,
        browser: ["Luniva Enterprise", "Chrome", "1.0.0"],
      });

      this.sock = sock;

      // Handle connection updates (QR code, connected, disconnected)
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: { dark: "#0f172a", light: "#ffffff" },
            });
            this.status = "qr_ready";
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
          await this.backupAuthToDb();
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          this.status = "disconnected";
          this.qrCodeDataUrl = null;
          this.sock = null;

          if (isLoggedOut) {
            this.user = null;
            this.connectedAt = null;
            this.lastError = "تم تسجيل الخروج من الجهاز.";
            // Purge local files and DB backup
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
            // Automatically attempt reconnect after 5 seconds
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              this.init().catch(console.error);
            }, 5000);
          }
        }
      });

      // Handle credentials update
      sock.ev.on("creds.update", async () => {
        await saveCreds();
        await this.backupAuthToDb();
      });

      // Handle incoming & outgoing messages
      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        for (const msg of messages) {
          if (!msg.message) continue;

          const jid = msg.key.remoteJid;
          if (!jid || jid.endsWith("@broadcast") || jid.includes("status@broadcast")) continue;

          const fromMe = Boolean(msg.key.fromMe);
          const messageId = msg.key.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const senderName = msg.pushName || (fromMe ? "لونيفا" : "عميلة لونيفا");

          // Extract text content
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.documentMessage?.caption ||
            (msg.message.imageMessage ? "[صورة]" : "") ||
            (msg.message.documentMessage ? "[مستند]" : "") ||
            (msg.message.audioMessage ? "[تسجيل صوتي]" : "") ||
            "";

          if (!text && !msg.message.imageMessage && !msg.message.documentMessage) continue;

          const rawPhone = jid.split("@")[0].replace(/\D/g, "");
          const matchedCust = await this.matchCustomer(jid);

          try {
            await ensureWhatsAppTables();

            // 1. Upsert or update chat
            await db.query(
              `INSERT INTO whatsapp_chats (jid, name, phone, customer_id, unread_count, last_message, last_message_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               ON CONFLICT (jid) DO UPDATE SET
                 name = COALESCE(EXCLUDED.name, whatsapp_chats.name),
                 customer_id = COALESCE(EXCLUDED.customer_id, whatsapp_chats.customer_id),
                 unread_count = CASE WHEN $7 = true THEN 0 ELSE whatsapp_chats.unread_count + 1 END,
                 last_message = EXCLUDED.last_message,
                 last_message_at = NOW(),
                 updated_at = NOW()`,
              [
                jid,
                matchedCust?.full_name || senderName,
                rawPhone,
                matchedCust?.id || null,
                fromMe ? 0 : 1,
                text || "[وسائط]",
                fromMe,
              ],
            );

            // 2. Insert message
            await db.query(
              `INSERT INTO whatsapp_messages (chat_jid, message_id, from_me, sender_jid, sender_name, content, status, customer_id, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT (message_id) DO NOTHING`,
              [
                jid,
                messageId,
                fromMe,
                msg.key.participant || jid,
                senderName,
                text || "[وسائط]",
                fromMe ? "sent" : "received",
                matchedCust?.id || null,
              ],
            );

            // 3. Handle Auto-Reply Bot for incoming customer messages
            if (!fromMe && text) {
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

  /**
   * Handle Smart Auto-Reply when enabled
   */
  private async handleAutoReply(jid: string, customer: { id: string; full_name: string } | null): Promise<void> {
    try {
      await ensureWhatsAppTables();
      const settingsRes = await db.query(
        "SELECT is_auto_reply_enabled, welcome_message FROM whatsapp_bot_settings WHERE id = 'default'",
      );
      const settings = settingsRes.rows[0];
      if (!settings?.is_auto_reply_enabled || !settings?.welcome_message) return;

      // Only reply if this is the first incoming message from customer in the last 6 hours
      const recentRes = await db.query(
        `SELECT id FROM whatsapp_messages
         WHERE chat_jid = $1 AND from_me = true AND created_at >= NOW() - INTERVAL '6 hours'
         LIMIT 1`,
        [jid],
      );

      if (recentRes.rowCount === 0) {
        let replyText = settings.welcome_message;
        if (customer) {
          replyText = replyText.replace(/\{اسم_العميلة\}/g, customer.full_name);
        } else {
          replyText = replyText.replace(/\{اسم_العميلة\}/g, "عزيزتي");
        }

        // Send auto-reply with a short realistic delay (1.5s)
        setTimeout(async () => {
          await this.sendMessage(jid, replyText);
        }, 1500);
      }
    } catch (err) {
      console.warn("Auto reply error:", err);
    }
  }

  /**
   * Send a WhatsApp message to a specific phone or JID.
   */
  public async sendMessage(
    to: string,
    text: string,
    mediaUrl?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.sock || this.status !== "connected") {
      return { success: false, error: "واتساب غير متصل. يرجى مسح رمز الاستجابة السريعة (QR) أولاً." };
    }

    try {
      // Normalize recipient JID
      let jid = to.trim();
      if (!jid.includes("@")) {
        const cleanPhone = formatWhatsAppPhone(jid);
        jid = `${cleanPhone}@s.whatsapp.net`;
      }

      // Send via Baileys socket
      const sentMsg = await this.sock.sendMessage(jid, { text: text.trim() });
      const messageId = sentMsg?.key?.id || `out_${Date.now()}`;

      const matchedCust = await this.matchCustomer(jid);
      const rawPhone = jid.split("@")[0].replace(/\D/g, "");

      await ensureWhatsAppTables();

      // Upsert into chats
      await db.query(
        `INSERT INTO whatsapp_chats (jid, name, phone, customer_id, unread_count, last_message, last_message_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())
         ON CONFLICT (jid) DO UPDATE SET
           customer_id = COALESCE(EXCLUDED.customer_id, whatsapp_chats.customer_id),
           unread_count = 0,
           last_message = EXCLUDED.last_message,
           last_message_at = NOW(),
           updated_at = NOW()`,
        [jid, matchedCust?.full_name || rawPhone, rawPhone, matchedCust?.id || null, text.trim()],
      );

      // Record message
      await db.query(
        `INSERT INTO whatsapp_messages (chat_jid, message_id, from_me, sender_jid, sender_name, content, status, customer_id, created_at)
         VALUES ($1, $2, true, $3, 'لونيفا للأزياء', $4, 'sent', $5, NOW())
         ON CONFLICT (message_id) DO NOTHING`,
        [jid, messageId, this.user?.id || "luniva@s.whatsapp.net", text.trim(), matchedCust?.id || null],
      );

      // Audit log
      await db.query(
        `INSERT INTO whatsapp_logs (customer_id, customer_name, phone, template_category, message, status, sent_by)
         VALUES ($1, $2, $3, 'direct', $4, 'sent', 'admin')`,
        [matchedCust?.id || null, matchedCust?.full_name || null, rawPhone, text.trim()],
      );

      return { success: true, messageId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Failed to send WhatsApp message via Baileys:", err);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Disconnects and logs out the WhatsApp session.
   */
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

// Global singleton instance
declare global {
  var __whatsappBaileysManager: WhatsAppBaileysManager | undefined;
}

export const baileysManager = globalThis.__whatsappBaileysManager || new WhatsAppBaileysManager();
if (process.env.NODE_ENV !== "production") {
  globalThis.__whatsappBaileysManager = baileysManager;
}

/**
 * Retrieve chats list with customer info and unread counters.
 */
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

/**
 * Retrieve messages for a specific chat.
 */
export async function getBaileysMessages(chatJid: string, limit = 80): Promise<WhatsAppMessage[]> {
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

/**
 * Mark a chat as read.
 */
export async function markChatAsRead(chatJid: string): Promise<void> {
  await ensureWhatsAppTables();
  await db.query("UPDATE whatsapp_chats SET unread_count = 0 WHERE jid = $1", [chatJid]);
}
