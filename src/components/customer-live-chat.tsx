"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  CheckCheck,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Video,
  FileText,
  RefreshCw,
  Phone,
  User,
  AlertCircle,
  Play,
  Pause,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { formatWhatsAppPhone, WhatsAppMessage, compileTemplate } from "@/lib/whatsapp-shared";
import { formatMoney } from "@/lib/format";

interface CustomerLiveChatProps {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode?: string | null;
  customerBalance?: number;
  customerImageUrl?: string | null;
}

export default function CustomerLiveChat({
  customerId,
  customerName,
  customerPhone,
  customerCode,
  customerBalance = 0,
  customerImageUrl,
}: CustomerLiveChatProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cleanPhone = formatWhatsAppPhone(customerPhone);
  const chatJid = cleanPhone ? `${cleanPhone}@s.whatsapp.net` : "";

  // 1. Fetch initial message history
  const fetchMessages = async () => {
    if (!chatJid) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/whatsapp/baileys/messages?jid=${encodeURIComponent(chatJid)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chatJid]);

  // 2. Real-time Live SSE Stream Subscription
  useEffect(() => {
    if (!chatJid) return;
    const es = new EventSource("/api/whatsapp/baileys/stream");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_message") {
          const newMsg: WhatsAppMessage = event.data;
          // Check if this message belongs to our active customer chat
          if (newMsg.chat_jid === chatJid || newMsg.chat_jid.replace(/\D/g, "") === cleanPhone) {
            setMessages((prev) => {
              if (prev.some((m) => m.message_id === newMsg.message_id || m.id === newMsg.id)) {
                return prev;
              }
              return [...prev, newMsg];
            });
          }
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, [chatJid, cleanPhone]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Send Message
  const handleSend = async () => {
    if ((!inputText.trim() && !selectedFile) || isSending || !chatJid) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    const tempId = `temp_${Date.now()}`;

    // Optimistic UI preview
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      chat_jid: chatJid,
      message_id: tempId,
      from_me: true,
      sender_jid: "me",
      sender_name: "لونيفا للأزياء",
      content: textToSend || (selectedFile ? `[${selectedFile.name}]` : ""),
      media_url: filePreview || null,
      media_type: selectedFile?.type.startsWith("image/") ? "image" : selectedFile?.type.startsWith("audio/") ? "audio" : selectedFile?.type.startsWith("video/") ? "video" : null,
      status: "pending",
      customer_id: customerId,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setSelectedFile(null);
    setFilePreview(null);

    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("to", chatJid);
        formData.append("text", textToSend);
        formData.append("file", selectedFile);

        res = await fetch("/api/whatsapp/baileys/send", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/whatsapp/baileys/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: chatJid, text: textToSend }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الرسالة");

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sent", message_id: data.messageId } : m)),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذر إرسال الرسالة");
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="app-card overflow-hidden border border-border shadow-md">
      {/* Top Banner with Customer Avatar and Live Sync Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-gradient-to-r from-card via-card to-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {customerImageUrl ? (
              <img
                src={customerImageUrl}
                alt={customerName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500/30"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 font-bold text-sm ring-2 ring-emerald-500/30">
                {customerName.charAt(0)}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">{customerName}</h3>
              {customerCode && (
                <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {customerCode}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono" dir="ltr">
              {customerPhone}
            </p>
          </div>
        </div>

        {/* Live Status Tag */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            محادثة متزامنة لحظياً (Live)
          </span>

          <button
            onClick={fetchMessages}
            disabled={loading}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            title="تحديث الرسائل"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="h-[460px] overflow-y-auto p-4 space-y-3 bg-muted/5 text-right">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin ml-2 text-primary" />
            جاري مزامنة المحادثة...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-6">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold text-foreground">لا توجد رسائل سابقة مع هذه العميلة</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              اكتبي رسالتكِ أو أرفقي صورة / فاتورة بالأسفل لبدء المحادثة المباشرة عبر واتساب
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from_me;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-card border border-border text-foreground rounded-tl-xs"
                  }`}
                >
                  {/* Media Content Display */}
                  {msg.media_type === "image" && msg.media_url && (
                    <div className="mb-2 overflow-hidden rounded-xl">
                      <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={msg.media_url}
                          alt="مرفق صورة"
                          className="max-h-64 w-auto rounded-xl object-contain hover:opacity-95 transition"
                        />
                      </a>
                    </div>
                  )}

                  {msg.media_type === "video" && msg.media_url && (
                    <div className="mb-2 overflow-hidden rounded-xl">
                      <video src={msg.media_url} controls className="max-h-64 w-full rounded-xl" />
                    </div>
                  )}

                  {msg.media_type === "audio" && msg.media_url && (
                    <div className="mb-2">
                      <audio src={msg.media_url} controls className="w-full h-9" />
                    </div>
                  )}

                  {msg.media_type === "document" && msg.media_url && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 p-2.5 hover:bg-black/15 transition text-xs font-semibold"
                    >
                      <FileText className="h-5 w-5 shrink-0" />
                      <span className="truncate">فتح المستند / الملف المرفق</span>
                    </a>
                  )}

                  {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}

                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                    }`}
                  >
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && <CheckCheck className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected File Preview Banner */}
      {selectedFile && (
        <div className="flex items-center justify-between border-t border-border bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center gap-2">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <FileText className="h-6 w-6 text-primary" />
            )}
            <span className="font-semibold text-foreground truncate max-w-xs">{selectedFile.name}</span>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
              setFilePreview(null);
            }}
            className="text-rose-500 hover:text-rose-600 font-bold"
          >
            إلغاء المرفق ✕
          </button>
        </div>
      )}

      {/* Input Composer */}
      <div className="border-t border-border bg-card p-3 space-y-2">
        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() =>
              setInputText(`مرحباً بكِ ${customerName} 💕 يسعدنا تواصلكِ مع لونيفا للأزياء. كيف يمكننا مساعدتكِ اليوم؟`)
            }
            className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
          >
            👋 ترحيب
          </button>
          <button
            type="button"
            onClick={() =>
              setInputText(
                `أهلاً بكِ ${customerName} ✨ نود تذكيركِ بوجود رصيد متبقي قدره ${formatMoney(customerBalance)} على حسابكِ لدى لونيفا 💕`,
              )
            }
            className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
          >
            💰 تذكير بالرصيد
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="إرفاق صورة، تسجيل صوتي، أو ملف"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="اكتبي رسالتكِ للعميلة هنا... (اضغطي Enter للإرسال)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-input bg-background p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || isSending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>إرسال</span>
                <Send className="h-4 w-4 rotate-180" />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
