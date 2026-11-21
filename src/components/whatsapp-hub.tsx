"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  Users,
  Sparkles,
  FileText,
  Clock,
  History,
  CheckCheck,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  Copy,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  Phone,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/toast";
import {
  WhatsAppTemplate,
  WhatsAppLogEntry,
  BroadcastCustomer,
  WhatsAppTemplateCategory,
  templateCategoryLabels,
  compileTemplate,
  formatWhatsAppPhone,
  generateWhatsAppUrl,
} from "@/lib/whatsapp-shared";
import { formatMoney } from "@/lib/format";

interface WhatsAppHubProps {
  initialTemplates: WhatsAppTemplate[];
  initialLogs: WhatsAppLogEntry[];
  initialStats: {
    total_sent: number;
    sent_today: number;
    unique_customers_reached: number;
    templates_count: number;
  };
  initialAudience: BroadcastCustomer[];
}

export default function WhatsAppHub({
  initialTemplates,
  initialLogs,
  initialStats,
  initialAudience,
}: WhatsAppHubProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Tab State
  const [activeTab, setActiveTab] = useState<"campaigns" | "templates" | "direct" | "logs">("campaigns");

  // Templates state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<WhatsAppTemplateCategory>("marketing");
  const [tplContent, setTplContent] = useState("");

  // Campaign State
  const [segment, setSegment] = useState<"all" | "vip" | "with_balance" | "inactive_30d">("all");
  const [audience, setAudience] = useState<BroadcastCustomer[]>(initialAudience);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplates.find((t) => t.category === "marketing")?.id || initialTemplates[0]?.id || ""
  );
  const [customCampaignMessage, setCustomCampaignMessage] = useState("");
  const [audienceSearch, setAudienceSearch] = useState("");
  const [sentCustomerIds, setSentCustomerIds] = useState<Set<string>>(new Set());

  // Sequential Sender State
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  // Direct Send State
  const [directPhone, setDirectPhone] = useState("");
  const [directName, setDirectName] = useState("");
  const [directTemplateId, setDirectTemplateId] = useState<string>("");
  const [directMessage, setDirectMessage] = useState("");

  // Logs State
  const [logs, setLogs] = useState<WhatsAppLogEntry[]>(initialLogs);
  const [logFilter, setLogFilter] = useState("");

  // Selected Campaign Template
  const activeCampaignTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Handle changing segment
  async function handleSegmentChange(newSegment: "all" | "vip" | "with_balance" | "inactive_30d") {
    setSegment(newSegment);
    setLoadingAudience(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns?segment=${newSegment}`);
      const data = await res.json();
      if (data.success && data.audience) {
        setAudience(data.audience);
      }
    } catch {
      toast.error("تعذر تحميل الجمهور", "يرجى التحقق من الاتصال بالشبكة.");
    } finally {
      setLoadingAudience(false);
    }
  }

  // Filtered Audience
  const filteredAudience = useMemo(() => {
    if (!audienceSearch.trim()) return audience;
    const q = audienceSearch.toLowerCase().trim();
    return audience.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [audience, audienceSearch]);

  // Compute live preview message for a specific or sample customer
  function getSamplePreviewMessage(sampleCustomer?: BroadcastCustomer) {
    const rawTemplate = customCampaignMessage || activeCampaignTemplate?.content || "";
    if (!rawTemplate) return "اكتبي نص الرسالة أو اختاري قالبًا لعرض المعاينة…";

    const vars = {
      اسم_العميلة: sampleCustomer ? sampleCustomer.full_name : "سارة أحمد",
      المتبقي: sampleCustomer ? formatMoney(sampleCustomer.open_balance) : "450 ج.م",
      إجمالي_المشتريات: sampleCustomer ? formatMoney(sampleCustomer.total_spent) : "3,200 ج.م",
      اسم_البراند: "لونيفا فاشون",
      رابط_المتجر: window.location.origin,
      رقم_الفاتورة: "INV-2026-089",
      المبلغ_المدفوع: "500 ج.م",
      تاريخ_الموعد: "غدًا الساعة 5 مساءً",
      نوع_الموعد: "بروفة قياس الفستان",
    };

    return compileTemplate(rawTemplate, vars);
  }

  // Send to Single Customer in Campaign
  async function handleSendToCustomer(customer: BroadcastCustomer) {
    const rawTemplate = customCampaignMessage || activeCampaignTemplate?.content || "";
    const vars = {
      اسم_العميلة: customer.full_name,
      المتبقي: formatMoney(customer.open_balance),
      إجمالي_المشتريات: formatMoney(customer.total_spent),
      اسم_البراند: "لونيفا فاشون",
      رابط_المتجر: window.location.origin,
    };
    const compiled = compileTemplate(rawTemplate, vars);

    try {
      // 1. Log dispatch in background
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.full_name,
          phone: customer.phone,
          templateCategory: activeCampaignTemplate?.category || "marketing",
          message: compiled,
          sentBy: "المسؤول",
        }),
      });

      // 2. Mark as sent locally
      setSentCustomerIds((prev) => new Set([...prev, customer.id]));

      // 3. Open WhatsApp link
      const url = generateWhatsAppUrl(customer.phone, compiled);
      window.open(url, "_blank", "noopener,noreferrer");

      toast.success("تم تجهيز المحادثة", `تم فتح واتساب للعميلة ${customer.full_name}`);
    } catch {
      toast.error("حدث خطأ", "تعذر تسجيل الإرسال.");
    }
  }

  // Sequential Sender Step
  async function advanceSequential(stepIndex: number) {
    if (stepIndex >= filteredAudience.length) {
      setCurrentIndex(null);
      toast.success("اكتملت الحملة بنجاح!", "تم إرسال رسائل جميع العميلات المحددة.");
      return;
    }
    const customer = filteredAudience[stepIndex];
    setCurrentIndex(stepIndex);
    await handleSendToCustomer(customer);
  }

  // Save Template Action
  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!tplName.trim() || !tplContent.trim()) {
      toast.error("بيانات غير مكتملة", "يرجى كتابة اسم القالب ومحتواه.");
      return;
    }

    try {
      const payload = {
        id: editingTemplate?.id,
        category: tplCategory,
        name: tplName.trim(),
        content: tplContent.trim(),
      };

      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (editingTemplate) {
        setTemplates((prev) => prev.map((t) => (t.id === data.template.id ? data.template : t)));
        toast.success("تم تحديث القالب", "تم حفظ التعديلات بنجاح.");
      } else {
        setTemplates((prev) => [data.template, ...prev]);
        toast.success("تم إنشاء القالب", "تمت إضافة القالب الجديد بنجاح.");
      }

      setEditingTemplate(null);
      setIsCreatingTemplate(false);
      setTplName("");
      setTplContent("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر حفظ القالب";
      toast.error("خطأ", msg);
    }
  }

  // Delete Template Action
  async function handleDeleteTemplate(id: string) {
    if (!confirm("هل أنتِ متأكدة من حذف هذا القالب؟")) return;
    try {
      const res = await fetch(`/api/whatsapp/templates?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("تم حذف القالب", "تمت إزالة القالب من النظام.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر حذف القالب";
      toast.error("خطأ", msg);
    }
  }

  // Direct Send Action
  async function handleDirectSend(e: React.FormEvent) {
    e.preventDefault();
    if (!directPhone.trim() || !directMessage.trim()) {
      toast.error("بيانات ناقصة", "يرجى إدخال رقم الهاتف ونص الرسالة.");
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: directName || "عميلة",
          phone: directPhone,
          message: directMessage,
          templateCategory: "custom",
          sentBy: "المسؤول",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("تم فتح واتساب", `تم توجيه الرسالة إلى ${data.formattedPhone}`);

      // Refresh logs
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          customer_id: null,
          customer_name: directName || null,
          phone: data.formattedPhone,
          template_category: "custom",
          message: directMessage,
          status: "sent",
          sent_by: "المسؤول",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setDirectPhone("");
      setDirectName("");
      setDirectMessage("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر الإرسال";
      toast.error("خطأ", msg);
    }
  }

  // Insert tag chip into active textarea
  function insertTag(tag: string, targetState: "template" | "direct" | "campaign") {
    const formatted = `{${tag}}`;
    if (targetState === "template") {
      setTplContent((prev) => prev + " " + formatted);
    } else if (targetState === "direct") {
      setDirectMessage((prev) => prev + " " + formatted);
    } else if (targetState === "campaign") {
      setCustomCampaignMessage((prev) => prev + " " + formatted);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(37, 211, 102, 0.12)", color: "#128C7E" }}>
            <Sparkles size={14} className="text-[#25D366]" />
            أتمتة وحملات الواتساب المجانية 100%
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight" style={{ color: "var(--brand-strong)" }}>
            مركز التسويق وأتمتة الواتساب
          </h1>
          <p className="mt-1 text-xs font-medium muted">
            أرسلي فواتير، تذكيرات سداد ومواعيد، وحملات تسويقية مجزأة بنقرة واحدة عبر واتساب مباشرة وبدون تكلفة.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="app-card px-3.5 py-2 text-center" style={{ minWidth: "105px" }}>
            <span className="text-[10px] font-bold muted">المرسلة اليوم</span>
            <p className="mt-0.5 text-lg font-black text-[#25D366]">{initialStats.sent_today}</p>
          </div>
          <div className="app-card px-3.5 py-2 text-center" style={{ minWidth: "105px" }}>
            <span className="text-[10px] font-bold muted">إجمالي الإرسال</span>
            <p className="mt-0.5 text-lg font-black" style={{ color: "var(--brand-strong)" }}>{initialStats.total_sent}</p>
          </div>
          <div className="app-card px-3.5 py-2 text-center" style={{ minWidth: "105px" }}>
            <span className="text-[10px] font-bold muted">عميلات مخدومة</span>
            <p className="mt-0.5 text-lg font-black" style={{ color: "var(--lav-strong)" }}>{initialStats.unique_customers_reached}</p>
          </div>
          <div className="app-card px-3.5 py-2 text-center" style={{ minWidth: "105px" }}>
            <span className="text-[10px] font-bold muted">القوالب الجاهزة</span>
            <p className="mt-0.5 text-lg font-black" style={{ color: "var(--brand-strong)" }}>{templates.length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black transition-all border-b-2 -mb-px ${
            activeTab === "campaigns"
              ? "border-[#25D366] text-[#128C7E] dark:text-[#25D366]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users size={16} />
          حملات البث الذكية (Broadcast)
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black transition-all border-b-2 -mb-px ${
            activeTab === "templates"
              ? "border-[#25D366] text-[#128C7E] dark:text-[#25D366]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText size={16} />
          إدارة القوالب ({templates.length})
        </button>

        <button
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black transition-all border-b-2 -mb-px ${
            activeTab === "direct"
              ? "border-[#25D366] text-[#128C7E] dark:text-[#25D366]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Send size={16} />
          إرسال سريع ومباشر
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black transition-all border-b-2 -mb-px ${
            activeTab === "logs"
              ? "border-[#25D366] text-[#128C7E] dark:text-[#25D366]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <History size={16} />
          سجل الإرسال والإحصائيات
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Setup Column (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Audience Segmentation Selector */}
            <div className="app-card p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <Filter size={14} /> 1. تحديد شريحة الجمهور المستهدفة
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: "all", label: "جميع العميلات", hint: "كامل جهات الاتصال" },
                  { key: "vip", label: "عميلات VIP", hint: "مشتروات +4000 ج.م" },
                  { key: "with_balance", label: "متبقي عليهم رصيد", hint: "تذكير بالسداد" },
                  { key: "inactive_30d", label: "خاملات +30 يوم", hint: "إعادة تنشيط ومبيعات" },
                ].map((seg) => (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={() => handleSegmentChange(seg.key as any)}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      segment === seg.key
                        ? "border-[#25D366] bg-[rgba(37,211,102,0.08)] shadow-sm"
                        : "border-[var(--line)] bg-[var(--surface-2)] hover:border-gray-400"
                    }`}
                  >
                    <p className={`text-xs font-black ${segment === seg.key ? "text-[#128C7E] dark:text-[#25D366]" : ""}`}>
                      {seg.label}
                    </p>
                    <p className="text-[10px] muted mt-0.5">{seg.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Template Selection & Customization */}
            <div className="app-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <FileText size={14} /> 2. اختيار أو كتابة رسالة الحملة
                </h3>
                <span className="text-[11px] font-bold muted">
                  المتغيرات تتبدل تلقائياً لكل عميلة
                </span>
              </div>

              {/* Template Picker Pills */}
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setCustomCampaignMessage("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedTemplateId === tpl.id && !customCampaignMessage
                        ? "bg-[#25D366] text-white border-[#25D366] shadow-sm"
                        : "bg-[var(--surface-2)] border-[var(--line)] text-gray-600 dark:text-zinc-300 hover:border-gray-400"
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>

              {/* Custom message override textarea */}
              <div>
                <label className="block text-[11px] font-bold mb-1.5 text-gray-500">
                  تعديل نص الرسالة أو كتابة رسالة خاصة بهذه الحملة:
                </label>
                <textarea
                  rows={6}
                  value={customCampaignMessage || activeCampaignTemplate?.content || ""}
                  onChange={(e) => setCustomCampaignMessage(e.target.value)}
                  dir="rtl"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  placeholder="اكتبي نص الرسالة هنا…"
                />
              </div>

              {/* Dynamic tag chips */}
              <div>
                <p className="text-[10px] font-bold muted mb-1.5">انقري لإدراج متغير ذكي:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["اسم_العميلة", "المتبقي", "إجمالي_المشتريات", "اسم_البراند", "رابط_المتجر"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTag(tag, "campaign")}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                    >
                      <Plus size={10} />
                      {`{${tag}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Targeted Audience List */}
            <div className="app-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <Users size={16} className="text-[#25D366]" />
                    قائمة الجمهور المستهدف ({filteredAudience.length} عميلة)
                  </h3>
                  <p className="text-[11px] muted">
                    تم إرسال: {sentCustomerIds.size} من أصل {filteredAudience.length}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو الهاتف…"
                      value={audienceSearch}
                      onChange={(e) => setAudienceSearch(e.target.value)}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pr-8 pl-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                    />
                  </div>

                  {currentIndex !== null ? (
                    <button
                      onClick={() => setCurrentIndex(null)}
                      className="btn btn-outline text-xs px-3 py-1.5 border-rose-300 text-rose-600"
                    >
                      إيقاف التتابع
                    </button>
                  ) : (
                    <button
                      onClick={() => advanceSequential(0)}
                      disabled={filteredAudience.length === 0}
                      className="btn text-xs px-3 py-1.5 bg-[#25D366] text-white hover:bg-[#20ba59] font-black shadow-sm disabled:opacity-50"
                    >
                      بدء الإرسال المتتابع
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar if sequential is running */}
              {currentIndex !== null && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex justify-between items-center text-xs font-black text-emerald-800 dark:text-emerald-300 mb-1.5">
                    <span>جارِ معالجة العميلة {currentIndex + 1} من {filteredAudience.length}</span>
                    <button
                      onClick={() => advanceSequential((currentIndex ?? 0) + 1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366] text-white text-[11px]"
                    >
                      التالية <ChevronLeft size={12} />
                    </button>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-2">
                    <div
                      className="bg-[#25D366] h-2 rounded-full transition-all"
                      style={{ width: `${Math.round(((currentIndex + 1) / filteredAudience.length) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Audience Table */}
              <div className="overflow-x-auto max-h-[420px] rounded-xl border border-[var(--line)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2)] sticky top-0 border-b border-[var(--line)] font-black text-gray-500">
                    <tr>
                      <th className="p-3">العميلة</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">المشتريات</th>
                      <th className="p-3">المتبقي</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {loadingAudience ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center muted">
                          <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                          جارِ تجميع بيانات الشريحة…
                        </td>
                      </tr>
                    ) : filteredAudience.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center muted">
                          لا توجد عميلات ينطبق عليهن هذا التصنيف
                        </td>
                      </tr>
                    ) : (
                      filteredAudience.map((cust, idx) => {
                        const isSent = sentCustomerIds.has(cust.id);
                        const isCurrent = currentIndex === idx;
                        return (
                          <tr
                            key={cust.id}
                            className={`transition-colors ${
                              isCurrent
                                ? "bg-emerald-50 dark:bg-emerald-950/40"
                                : isSent
                                ? "opacity-60 bg-[var(--surface-2)]"
                                : "hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            <td className="p-3 font-bold">
                              {cust.full_name}
                              {cust.total_spent >= 4000 && (
                                <span className="mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  VIP
                                </span>
                              )}
                            </td>
                            <td className="p-3 mono font-medium" dir="ltr">
                              {cust.phone}
                            </td>
                            <td className="p-3 font-medium">
                              {formatMoney(cust.total_spent)}
                            </td>
                            <td className="p-3">
                              {cust.open_balance > 0 ? (
                                <span className="text-rose-600 font-black">
                                  {formatMoney(cust.open_balance)}
                                </span>
                              ) : (
                                <span className="text-gray-400">0 ج.م</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleSendToCustomer(cust)}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
                                  isSent
                                    ? "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                                    : "bg-[#25D366] text-white hover:bg-[#20ba59]"
                                }`}
                              >
                                {isSent ? (
                                  <>
                                    <CheckCheck size={13} className="text-[#25D366]" /> تم الإرسال
                                  </>
                                ) : (
                                  <>
                                    <Send size={12} /> إرسال عبر واتساب
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right / Live Phone Mockup Preview (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-4">
              <div className="app-card p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
                  <span>معاينة حية لشكل الرسالة في واتساب</span>
                  <span className="text-[#25D366] font-bold text-[10px] flex items-center gap-1">
                    <CheckCheck size={13} /> مطابق للتطبيق
                  </span>
                </h3>

                {/* Smartphone Shell */}
                <div className="mx-auto max-w-[340px] rounded-[36px] p-3 shadow-2xl border-4 border-zinc-800 bg-zinc-900 text-white">
                  {/* Phone Speaker Notch */}
                  <div className="mx-auto h-4 w-28 rounded-full bg-zinc-800 mb-2 flex items-center justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-700" />
                  </div>

                  {/* WhatsApp App Header */}
                  <div className="rounded-t-2xl bg-[#075E54] p-3 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-black text-xs border border-white/20">
                        L
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black leading-tight text-white">Luniva Fashion</p>
                        <p className="text-[9px] text-emerald-200">متصل الآن • حساب معتمد</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Phone size={14} />
                    </div>
                  </div>

                  {/* Chat Wallpaper Container */}
                  <div
                    className="p-3 min-h-[300px] max-h-[380px] overflow-y-auto flex flex-col justify-end text-zinc-900"
                    style={{
                      backgroundColor: "#ECE5DD",
                      backgroundImage: "radial-gradient(#d3c7b7 0.75px, transparent 0.75px)",
                      backgroundSize: "12px 12px",
                    }}
                  >
                    <div className="text-center my-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/70 text-[9px] font-bold text-zinc-600 shadow-xs">
                        اليوم
                      </span>
                    </div>

                    {/* WhatsApp Chat Bubble */}
                    <div className="relative self-start max-w-[92%] rounded-2xl rounded-tr-none bg-[#DCF8C6] p-3 shadow-md text-right text-xs leading-relaxed border border-[#c1e7a6]">
                      <p className="whitespace-pre-line text-[11px] font-medium text-zinc-800 select-text">
                        {getSamplePreviewMessage(filteredAudience[0])}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-zinc-500">
                        <span>12:45 م</span>
                        <CheckCheck size={13} className="text-[#34B7F1]" />
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Input Bar */}
                  <div className="rounded-b-2xl bg-zinc-800 p-2 flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-zinc-700 px-3 py-1.5 text-[10px] text-zinc-400 text-right">
                      رسالة…
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                      <Send size={12} />
                    </div>
                  </div>
                </div>

                {/* Helpful instructions */}
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] leading-5 text-amber-800 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-1 mb-1">
                    <AlertCircle size={14} /> نصيحة للأمان والموثوقية:
                  </p>
                  يتم فتح المحادثات عبر رابط واتساب الرسمي مجاناً 100%. نظام التتابع يضمن لك مراجعة كل رسالة قبل اعتمادها، مما يمنع حظر رقمك أو تصنيفه كرسائل مزعجة (Spam).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES MANAGER */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-black" style={{ color: "var(--brand-strong)" }}>
                إدارة قوالب رسائل الواتساب
              </h2>
              <p className="text-xs muted">
                يمكنك تخصيص نصوص الرسائل الافتراضية للفواتير والتحصيل والمواعيد، أو إضافة قوالب تسويقية جديدة.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTplName("");
                setTplCategory("custom");
                setTplContent("");
                setIsCreatingTemplate(true);
              }}
              className="btn btn-primary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> إضافة قالب جديد
            </button>
          </div>

          {/* Form Modal / Inline Editor */}
          {isCreatingTemplate && (
            <div className="app-card p-5 border-2 border-[#25D366]/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#128C7E] dark:text-[#25D366]">
                  {editingTemplate ? "تعديل القالب" : "إنشاء قالب رسالة جديد"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingTemplate(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 muted">اسم القالب</label>
                    <input
                      type="text"
                      required
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="مثال: خصم نهاية الموسم"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[#25D366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 muted">التصنيف</label>
                    <select
                      value={tplCategory}
                      onChange={(e) => setTplCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[#25D366]"
                    >
                      {Object.entries(templateCategoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold muted">نص الرسالة</label>
                    <span className="text-[10px] muted">استخدمي الأقواس لإدراج المتغيرات</span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={tplContent}
                    onChange={(e) => setTplContent(e.target.value)}
                    dir="rtl"
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed focus:ring-2 focus:ring-[#25D366]"
                    placeholder="اكتبي نص الرسالة هنا…"
                  />
                </div>

                {/* Tag chips shortcut */}
                <div>
                  <p className="text-[10px] font-bold muted mb-1.5">إدراج متغير سريع:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "اسم_العميلة",
                      "رقم_الفاتورة",
                      "المبلغ_المدفوع",
                      "المتبقي",
                      "تاريخ_الموعد",
                      "نوع_الموعد",
                      "رابط_الفاتورة",
                      "اسم_البراند",
                      "رابط_المتجر",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag, "template")}
                        className="px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono hover:bg-emerald-100"
                      >
                        {`{${tag}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    className="btn btn-outline text-xs px-4 py-2"
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary text-xs px-5 py-2">
                    حفظ القالب
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="app-card p-4 flex flex-col justify-between transition-all hover:border-[#25D366]/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {templateCategoryLabels[tpl.category] || tpl.category}
                    </span>
                    {tpl.is_default && (
                      <span className="text-[10px] font-bold text-gray-400">افتراضي</span>
                    )}
                  </div>
                  <h4 className="text-sm font-black mb-2" style={{ color: "var(--brand-strong)" }}>
                    {tpl.name}
                  </h4>
                  <p className="text-xs leading-relaxed muted whitespace-pre-line bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--line)]">
                    {tpl.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between">
                  <span className="text-[10px] muted">
                    {new Date(tpl.updated_at).toLocaleDateString("ar-EG")}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setTplName(tpl.name);
                        setTplCategory(tpl.category);
                        setTplContent(tpl.content);
                        setIsCreatingTemplate(true);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800"
                      title="تعديل القالب"
                    >
                      <Edit3 size={14} />
                    </button>
                    {!tpl.is_default && (
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800"
                        title="حذف القالب"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT QUICK SEND */}
      {activeTab === "direct" && (
        <div className="max-w-2xl mx-auto app-card p-6 space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-[#25D366] flex items-center justify-center mb-2">
              <Send size={24} />
            </div>
            <h2 className="text-lg font-black" style={{ color: "var(--brand-strong)" }}>
              إرسال رسالة واتساب فورية
            </h2>
            <p className="text-xs muted mt-1">
              أدخلي رقم الهاتف ونص الرسالة ليتم توجيهها فورًا إلى محادثة واتساب الرسمية مع تسجيلها في النظام.
            </p>
          </div>

          <form onSubmit={handleDirectSend} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 muted">اسم العميلة (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: ياسمين عمر"
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[#25D366]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 muted">رقم هاتف الواتساب</label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  dir="ltr"
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs text-right focus:ring-2 focus:ring-[#25D366]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 muted">اختيار قالب جاهز (اختياري):</label>
              <select
                value={directTemplateId}
                onChange={(e) => {
                  setDirectTemplateId(e.target.value);
                  const selected = templates.find((t) => t.id === e.target.value);
                  if (selected) {
                    setDirectMessage(
                      compileTemplate(selected.content, {
                        اسم_العميلة: directName || "عميلتنا العزيزة",
                        اسم_البراند: "لونيفا فاشون",
                        رابط_المتجر: window.location.origin,
                      })
                    );
                  }
                }}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">-- اختاري قالباً لملء النص تلقائياً --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({templateCategoryLabels[tpl.category] || tpl.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 muted">نص الرسالة المرسلة:</label>
              <textarea
                rows={5}
                required
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
                dir="rtl"
                placeholder="اكتبي نص الرسالة هنا…"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed focus:ring-2 focus:ring-[#25D366]"
              />
            </div>

            <button
              type="submit"
              className="w-full btn py-3 text-sm font-black bg-[#25D366] text-white hover:bg-[#20ba59] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Send size={16} /> فتح وإرسال عبر تطبيق واتساب
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: DISPATCH HISTORY & LOGS */}
      {activeTab === "logs" && (
        <div className="app-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: "var(--brand-strong)" }}>
                <History size={18} className="text-[#25D366]" />
                سجل رسائل الواتساب الصادرة ({logs.length})
              </h2>
              <p className="text-xs muted">
                سجل موثق بجميع الإشعارات، الفواتير، والحملات التسويقية التي تم إرسالها للعميلات.
              </p>
            </div>

            <div className="relative">
              <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث في السجل بالاسم أو الهاتف…"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pr-8 pl-3 py-1.5 text-xs focus:ring-1 focus:ring-[#25D366]"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--line)] font-black text-gray-500">
                <tr>
                  <th className="p-3">العميلة</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">مقتطف من الرسالة</th>
                  <th className="p-3">بواسطة</th>
                  <th className="p-3">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {logs
                  .filter((log) => {
                    if (!logFilter.trim()) return true;
                    const q = logFilter.toLowerCase();
                    return (
                      (log.customer_name && log.customer_name.toLowerCase().includes(q)) ||
                      log.phone.includes(q) ||
                      log.message.toLowerCase().includes(q)
                    );
                  })
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="p-3 font-bold">
                        {log.customer_name || "عميلة بدون اسم"}
                      </td>
                      <td className="p-3 mono font-medium" dir="ltr">
                        {log.phone}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {templateCategoryLabels[log.template_category as WhatsAppTemplateCategory] ||
                            log.template_category ||
                            "مخصص"}
                        </span>
                      </td>
                      <td className="p-3 max-w-[280px] truncate muted" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-3 text-[11px] muted font-medium">
                        {log.sent_by || "النظام"}
                      </td>
                      <td className="p-3 text-[11px] muted" dir="ltr">
                        {new Date(log.created_at).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
