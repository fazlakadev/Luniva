"use client";

import { useState } from "react";
import {
  Mail,
  Search,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  Phone,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Reply,
  Check,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { formatWhatsAppPhone, generateWhatsAppUrl } from "@/lib/whatsapp-shared";
import type { ContactMessageRecord } from "@/lib/messages";

interface AdminMessagesHubProps {
  initialMessages: ContactMessageRecord[];
}

export default function AdminMessagesHub({ initialMessages }: AdminMessagesHubProps) {
  const [messages, setMessages] = useState<ContactMessageRecord[]>(initialMessages);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const toast = useToast();

  const stats = {
    total: messages.length,
    unread: messages.filter((m) => m.status === "unread").length,
    replied: messages.filter((m) => m.status === "replied").length,
  };

  const filteredMessages = messages.filter((m) => {
    if (filter !== "all" && m.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleSendReply(messageId: string) {
    if (!replyText.trim()) {
      toast.error("الرد فارغ", "يرجى كتابة نص الرد قبل الإرسال.");
      return;
    }

    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/messages/${messageId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyMessage: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر إرسال الرد.");

      toast.success("تم إرسال الرد بنجاح!", "تم إرسال الرد عبر البريد الإلكتروني إلى العميلة.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: "replied",
                reply_message: replyText.trim(),
                replied_at: new Date().toISOString(),
              }
            : m,
        ),
      );

      setReplyingMessageId(null);
      setReplyText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر إرسال الرد";
      toast.error("خطأ", msg);
    } finally {
      setSendingReply(false);
    }
  }

  function getWhatsAppUrl(msg: ContactMessageRecord) {
    if (!msg.phone) return "";
    const clean = formatWhatsAppPhone(msg.phone);
    const text = `مرحباً بكِ أستاذة ${msg.name} 🌸\nمن فريق لونيفا فاشون، بخصوص رسالتكِ: "${msg.subject || "استفسار تواصل"}"...`;
    return generateWhatsAppUrl(clean, text);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
          <Sparkles size={14} />
          مركز رسائل التواصل والدعم
        </div>
        <h1 className="text-2xl font-black text-ink">رسائل واستفسارات العميلات</h1>
        <p className="text-xs muted mt-1">
          متابعة رسائل نموذج التواصل، الرد المباشر على بريد العميلات، والتواصل السريع عبر واتساب.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">رسائل غير مقروءة</p>
          <p className="text-xl font-black text-rose-600 mt-1">{stats.unread}</p>
          <p className="text-[10px] muted mt-0.5">بانتظار الرد والمتابعة</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">تم الرد عليها</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{stats.replied}</p>
          <p className="text-[10px] muted mt-0.5">تم إرسال الرد للإيميل</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">إجمالي الرسائل</p>
          <p className="text-xl font-black text-ink mt-1">{stats.total}</p>
          <p className="text-[10px] muted mt-0.5">سجل الاستفسارات</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="app-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "all", label: "جميع الرسائل" },
            { key: "unread", label: "غير مقروءة" },
            { key: "replied", label: "تم الرد عليها" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filter === tab.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-[var(--surface-2)] text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute right-3 top-3 text-muted" />
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، الهاتف، أو الموضوع…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-emerald-600 outline-none w-full sm:w-64"
          />
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="app-card p-12 text-center muted space-y-2">
            <Mail size={32} className="mx-auto text-muted" />
            <p className="text-sm font-bold text-ink">لا توجد رسائل مطابقة.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isReplying = replyingMessageId === msg.id;
            const waUrl = getWhatsAppUrl(msg);

            return (
              <div
                key={msg.id}
                className={`app-card overflow-hidden border transition-all ${
                  msg.status === "unread"
                    ? "border-rose-300 dark:border-rose-900 shadow-md"
                    : "border-[var(--line)]"
                }`}
              >
                {/* Message Header */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-black text-xs ${
                        msg.status === "unread"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      <Mail size={18} />
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-ink">{msg.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            msg.status === "unread"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {msg.status === "unread" ? "غير مقروءة" : "تم الرد ✓"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] muted">
                        <span className="mono" dir="ltr">
                          {msg.email}
                        </span>
                        {msg.phone && (
                          <span className="mono" dir="ltr">
                            <Phone size={11} className="inline ml-1" />
                            {msg.phone}
                          </span>
                        )}
                        <span>{new Date(msg.created_at).toLocaleString("ar-EG")}</span>
                      </div>

                      {msg.subject && (
                        <p className="text-xs font-bold text-purple-700 dark:text-purple-300 pt-1">
                          الموضوع: {msg.subject}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Top Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {msg.phone && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-[#25D366] text-white hover:bg-[#20ba59] shadow-sm transition"
                        title="محادثة واتساب"
                      >
                        <MessageSquare size={13} />
                        واتساب
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReplyingMessageId(isReplying ? null : msg.id);
                        if (!isReplying) {
                          setReplyText(
                            `مرحباً بكِ أستاذة ${msg.name} 🌸\nنشكركِ لتواصلكِ مع لونيفا فاشون، بخصوص استفساركِ:\n`,
                          );
                        }
                      }}
                      className="btn btn-primary text-xs px-3.5 py-1.5 font-black inline-flex items-center gap-1.5"
                    >
                      <Reply size={13} />
                      {msg.status === "replied" ? "إرسال رد إضافي" : "الرد عبر الإيميل"}
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="px-5 pb-4">
                  <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </div>
                </div>

                {/* Previous Reply Display */}
                {msg.reply_message && (
                  <div className="mx-5 mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span>الرد المرسل للعميلة عبر البريد ({msg.replied_by || "الإدارة"}):</span>
                      {msg.replied_at && (
                        <span>{new Date(msg.replied_at).toLocaleString("ar-EG")}</span>
                      )}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.reply_message}</p>
                  </div>
                )}

                {/* Reply Drawer Form */}
                {isReplying && (
                  <div className="p-5 bg-[var(--surface-3)] border-t border-[var(--line)] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-ink flex items-center gap-1.5">
                        <Reply size={14} className="text-purple-600" />
                        الرد عبر البريد الإلكتروني إلى: <span className="mono">{msg.email}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setReplyingMessageId(null)}
                        className="text-xs text-muted hover:text-ink font-bold"
                      >
                        إلغاء
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتبي نص الرد الذي سيصل مباشرة لبريد العميلة…"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 outline-none"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] muted">
                        سيصل الرد باسم لونيفا فاشون بتنسيق راقي إلى صندوق بريد العميلة مباشرة.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSendReply(msg.id)}
                        disabled={sendingReply}
                        className="btn btn-primary text-xs px-5 py-2 font-black inline-flex items-center gap-1.5"
                      >
                        <Send size={13} />
                        {sendingReply ? "جارِ إرسال البريد…" : "إرسال الرد للعميلة"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
