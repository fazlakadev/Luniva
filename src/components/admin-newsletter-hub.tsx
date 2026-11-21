"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  Copy,
  Download,
  Eye,
  Mail,
  MailCheck,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type { CampaignRow, SubscriberRow } from "@/lib/newsletter";
import { useToast } from "@/components/toast";

export default function AdminNewsletterHub() {
  const toast = useToast();

  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"subscribers" | "compose" | "history">("subscribers");

  // Compose campaign form state
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/admin/newsletter${q}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setSubscribers(data.subscribers || []);
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error("Failed to load newsletter data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search]);

  async function handleDelete(id: string, email: string) {
    if (!confirm(`هل أنتِ متأكدة من حذف المشتركة "${email}" من النشرة البريدية؟`)) return;

    try {
      const res = await fetch(`/api/admin/newsletter?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم الحذف", `تم حذف ${email} من قائمة المشتركات.`);
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error("خطأ", "تعذر حذف المشتركة.");
      }
    } catch {
      toast.error("خطأ", "حدث خطأ أثناء الحذف.");
    }
  }

  function handleCopyAllEmails() {
    const list = subscribers.map((s) => s.email).join(", ");
    if (!list) {
      toast.error("لا توجد إيميلات", "قائمة المشتركات فارغة.");
      return;
    }
    navigator.clipboard.writeText(list);
    setCopied(true);
    toast.success("تم النسخ بنجاح", `تم نسخ (${subscribers.length}) بريد إلكتروني إلى الحافظة.`);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleExportCsv() {
    if (subscribers.length === 0) {
      toast.error("لا توجد بيانات", "لا يوجد مشتركون لتصديرهم.");
      return;
    }
    const headers = "Email,Source,Status,Created At\n";
    const rows = subscribers
      .map((s) => `"${s.email}","${s.source}","${s.status}","${s.created_at}"`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `luniva_newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم التصدير", "تم تنزيل ملف CSV بنجاح.");
  }

  async function handleSendCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      toast.error("بيانات ناقصة", "يرجى كتابة عنوان النشرة ومحتوى الرسالة.");
      return;
    }

    if (!confirm(`هل أنتِ متأكدة من إرسال هذه النشرة إلى (${subscribers.length}) مشتركة نشطة؟`)) {
      return;
    }

    setSending(true);
    const toastId = toast.loading("جارِ إرسال النشرة البريدية...");
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), previewText: previewText.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر إرسال النشرة");

      toast.update(toastId, {
        tone: "success",
        title: "تم الإرسال بنجاح!",
        description: data.message || `تم إرسال النشرة إلى ${data.count} مشتركة.`,
      });

      setSubject("");
      setPreviewText("");
      setContent("");
      setActiveTab("history");
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر إرسال النشرة";
      toast.update(toastId, { tone: "error", title: "فشل الإرسال", description: msg });
    } finally {
      setSending(false);
    }
  }

  const activeSubscribersCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            <Users size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-[var(--muted-2)]">المشتركون النشطون</p>
            <p className="mt-0.5 text-xl font-black text-[var(--ink)] sm:text-2xl">
              {activeSubscribersCount}
            </p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
            <Mail size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-[var(--muted-2)]">إجمالي عناوين البريد</p>
            <p className="mt-0.5 text-xl font-black text-[var(--ink)] sm:text-2xl">
              {subscribers.length}
            </p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <span className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
            <Send size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-[var(--muted-2)]">الحملات البريدية المرسلة</p>
            <p className="mt-0.5 text-xl font-black text-emerald-600 dark:text-emerald-400 sm:text-2xl">
              {campaigns.length}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] p-2 rounded-2xl">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("subscribers")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "subscribers"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Users size={15} />
            <span>قائمة المشتركات ({subscribers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "compose"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Send size={15} />
            <span>إرسال نشرة بريدية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "history"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <MailCheck size={15} />
            <span>سجل الحملات ({campaigns.length})</span>
          </button>
        </div>

        {activeTab === "subscribers" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAllEmails}
              className="btn btn-secondary text-xs font-bold px-3 py-1.5"
              title="نسخ جميع الإيميلات"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? "تم النسخ ✓" : "نسخ الإيميلات"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="btn btn-secondary text-xs font-bold px-3 py-1.5"
              title="تصدير ملف CSV"
            >
              <Download size={13} />
              <span>تصدير CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Subscribers List */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحثي عن بريد إلكتروني..."
                className="field pr-10 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={loadData}
              className="btn btn-secondary px-3 py-2 text-xs"
              title="تحديث البيانات"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="app-card overflow-hidden">
            {loading && subscribers.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-xs text-[var(--muted)]">
                <RefreshCw size={18} className="animate-spin text-[var(--brand)] mr-2" />
                جارِ تحميل المشتركات...
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-12 text-center">
                <Mail size={32} className="mx-auto text-[var(--muted-2)]" />
                <p className="mt-3 text-sm font-black text-[var(--ink)]">لا يوجد مشتركون مطابقون</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  عندما تشترك العميلات من المتجر أو شريط التنقل ستظهر عناوينهن هنا تلقائياً.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted-2)]">
                      <th className="p-3.5 font-bold">البريد الإلكتروني</th>
                      <th className="p-3.5 font-bold">مصدر الاشتراك</th>
                      <th className="p-3.5 font-bold">الحالة</th>
                      <th className="p-3.5 font-bold">تاريخ الانضمام</th>
                      <th className="p-3.5 font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="transition hover:bg-[var(--surface-2)]/60">
                        <td className="p-3.5 font-black text-[var(--ink)]" dir="ltr">
                          {sub.email}
                        </td>
                        <td className="p-3.5">
                          <span className="badge badge-muted text-[10px]">
                            {sub.source === "navbar" ? "شريط التنقل" : sub.source === "footer" ? "تذييل الموقع" : "المتجر"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="badge badge-success text-[10px]">نشط</span>
                        </td>
                        <td className="p-3.5 text-[var(--muted)]">
                          {new Date(sub.created_at).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id, sub.email)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition"
                            title="حذف من النشرة"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Compose & Send Campaign */}
      {activeTab === "compose" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <form onSubmit={handleSendCampaign} className="app-card p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-4">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <Send size={18} />
              </span>
              <div>
                <h2 className="text-sm font-black text-[var(--ink)] sm:text-base">إنشاء حملة بريدية جديدة</h2>
                <p className="text-xs text-[var(--muted)]">
                  سيتم إرسال هذا البريد إلى ({activeSubscribersCount}) مشتركة نشطة دفعة واحدة بتصميم لونيفا الفاخر.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="field-label">عنوان موضوع الإيميل (Subject) *</span>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثال: إطلاق كولكشن شتاء 2026 الحصري + خصم 15% ✨"
                className="field"
              />
              <span className="field-hint">يظهر كعنوان رئيسي في صندوق البريد الوارد</span>
            </label>

            <label className="block">
              <span className="field-label">نص المعاينة المختصر (Pre-header)</span>
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="مثال: شاهدي أجمل فساتين السهرة وبكدجات المناسبات مع كود خصم خاص"
                className="field"
              />
              <span className="field-hint">يظهر بجانب العنوان في تطبيق البريد قبل فتح الرسالة</span>
            </label>

            <label className="block">
              <span className="field-label">محتوى الرسالة *</span>
              <textarea
                required
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`أهلاً بكِ في عالم لونيفا،

يسرنا إعلامكِ بتوفر أحدث تشكيلة من فساتين السهرة والبكدجات التوفيرية في أحدث جلسات التصميم.

استخدمي كود الخصم التالي عند الطلب: LUNIVA15

تفضلي بزيارة المتجر واستمتعي بتجربة استفسار وحجز فورية بدون دفع إلكتروني.`}
                className="field resize-none leading-relaxed"
              />
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending || activeSubscribersCount === 0}
                className="btn btn-primary w-full justify-center py-3 text-xs font-black shadow-md disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>جارِ الإرسال للمشتركات...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>إرسال النشرة إلى ({activeSubscribersCount}) مشتركة</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Preview Card */}
          <div className="space-y-3">
            <p className="text-xs font-black text-[var(--muted-2)] flex items-center gap-1.5">
              <Eye size={14} /> معاينة شكل الإيميل عند المستلمة:
            </p>
            <div className="app-card overflow-hidden border border-[var(--line)] shadow-lg bg-[#faf7f5] text-[#1e1b18]">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#7c2d3a] to-[#9e3d4c] p-6 text-center text-white">
                <p className="text-lg font-black tracking-widest">LUNIVA FASHION</p>
                <p className="text-[11px] opacity-90 mt-1">النشرة البريدية الحصرية لأزياء لونيفا</p>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-7 space-y-3">
                <h3 className="text-base font-black text-[#7c2d3a]">
                  {subject || "عنوان موضوع النشرة البريدية يظهر هنا"}
                </h3>
                {previewText && (
                  <p className="text-xs font-bold text-[#6b635e]">{previewText}</p>
                )}
                <div className="text-xs leading-relaxed text-[#332d29] whitespace-pre-line pt-2 border-t border-[#ebd9d2]">
                  {content || "نص ومحتوى النشرة البريدية سيظهر هنا بأسلوب أنيق ومنسق..."}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#ebd9d2] bg-[#fdfbf9] p-4 text-center text-[10px] text-[#8a7e78]">
                <p>© {new Date().getFullYear()} لونيفا لتصميم وتصنيع الأزياء النسائية — جميع الحقوق محفوظة.</p>
                <p className="mt-1">وصلتكِ هذه الرسالة لاشتراككِ في نادي عميلات لونيفا.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Campaign History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="app-card p-12 text-center">
              <MailCheck size={32} className="mx-auto text-[var(--muted-2)]" />
              <p className="mt-3 text-sm font-black text-[var(--ink)]">لم يتم إرسال حملات بريدية بعد</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                انتقلي إلى تبويب "إرسال نشرة بريدية" لإطلاق أول حملة ترويجية للمشتركات.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("compose")}
                className="btn btn-primary mt-4 text-xs font-black"
              >
                إنشاء أول حملة الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="app-card p-5 transition hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                        <Check size={16} />
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-[var(--ink)]">{camp.subject}</h3>
                        {camp.preview_text && (
                          <p className="text-xs text-[var(--muted)]">{camp.preview_text}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="badge badge-brand">
                        <Users size={12} /> {camp.recipients_count} مستلمة
                      </span>
                      <span className="flex items-center gap-1 text-[var(--muted)]">
                        <Calendar size={13} />
                        {new Date(camp.created_at).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-[var(--muted)] line-clamp-3 leading-relaxed whitespace-pre-line">
                    {camp.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
