"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Users,
  Sparkles,
  FileText,
  Clock,
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
  Filter,
  DollarSign,
  Phone,
  RefreshCw,
  QrCode,
  Smartphone,
  Bot,
  Settings2,
  LogOut,
  Wifi,
  WifiOff,
  Zap,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
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
  WhatsAppSessionInfo,
  WhatsAppChat,
  WhatsAppMessage,
  WhatsAppBotSettings,
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
  initialChats?: WhatsAppChat[];
}

export default function WhatsAppHub({
  initialTemplates,
  initialLogs,
  initialStats,
  initialAudience,
  initialChats = [],
}: WhatsAppHubProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"chats" | "qr" | "bot" | "campaigns" | "templates" | "logs">("chats");

  // ==========================================
  // 1. BAILEYS SESSION & QR CODE STATE
  // ==========================================
  const [session, setSession] = useState<WhatsAppSessionInfo>({
    status: "disconnected",
    qrCode: null,
    user: null,
    connectedAt: null,
    lastError: null,
  });
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  // Poll Baileys status
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/baileys/status");
      if (res.ok) {
        const data: WhatsAppSessionInfo = await res.json();
        setSession(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 4 seconds if in connecting or qr_ready status
    const interval = setInterval(() => {
      if (session.status === "connecting" || session.status === "qr_ready" || activeTab === "qr") {
        fetchStatus();
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [session.status, activeTab]);

  const handleStartConnection = async () => {
    setIsSessionLoading(true);
    try {
      const res = await fetch("/api/whatsapp/baileys/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل بدء جلسة واتساب");
      setSession(data);
      toast.success("جاري تشغيل محرك واتساب وتوليد رمز QR...");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء تشغيل واتساب");
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("هل أنتِ متأكدة من رغبتكِ في تسجيل الخروج وقطع اتصال واتساب؟")) return;
    setIsSessionLoading(true);
    try {
      const res = await fetch("/api/whatsapp/baileys/logout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الخروج");
      setSession({
        status: "disconnected",
        qrCode: null,
        user: null,
        connectedAt: null,
        lastError: null,
      });
      toast.success("تم قطع الاتصال وتسجيل الخروج بنجاح.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الخروج");
    } finally {
      setIsSessionLoading(false);
    }
  };

  // ==========================================
  // 2. LIVE CHATS & MESSAGES STATE
  // ==========================================
  const [chats, setChats] = useState<WhatsAppChat[]>(initialChats);
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(initialChats[0]?.jid || null);
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"all" | "customers" | "unread">("all");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch chats list
  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/whatsapp/baileys/chats?filter=${chatFilter}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (!selectedChatJid && data.length > 0) {
          setSelectedChatJid(data[0].jid);
        }
      }
    } catch {
      // ignore
    }
  };

  // Poll chats periodically
  useEffect(() => {
    if (activeTab === "chats") {
      fetchChats();
      const interval = setInterval(fetchChats, 6000);
      return () => clearInterval(interval);
    }
  }, [activeTab, chatFilter]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChatJid) return;
    let isMounted = true;
    setIsLoadingMessages(true);

    fetch(`/api/whatsapp/baileys/messages?jid=${encodeURIComponent(selectedChatJid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          setMessages(Array.isArray(data) ? data : []);
          setIsLoadingMessages(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChatJid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.jid === selectedChatJid) || null;
  }, [chats, selectedChatJid]);

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (!chatSearch.trim()) return true;
      const q = chatSearch.toLowerCase();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.last_message && c.last_message.toLowerCase().includes(q))
      );
    });
  }, [chats, chatSearch]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatJid || isSendingMessage) return;
    const textToSend = messageInput.trim();
    setIsSendingMessage(true);

    // Optimistic UI update
    const optimisticMsg: WhatsAppMessage = {
      id: `temp_${Date.now()}`,
      chat_jid: selectedChatJid,
      message_id: `temp_${Date.now()}`,
      from_me: true,
      sender_jid: "luniva",
      sender_name: "لونيفا للأزياء",
      content: textToSend,
      media_url: null,
      media_type: null,
      status: "pending",
      customer_id: activeChat?.customer_id || null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput("");

    try {
      const res = await fetch("/api/whatsapp/baileys/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selectedChatJid, text: textToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الرسالة");

      // Mark message as sent
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: "sent", message_id: data.messageId } : m)),
      );
      fetchChats();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذر إرسال الرسالة");
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: "failed" } : m)),
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ==========================================
  // 3. BOT & AUTO-REPLY SETTINGS STATE
  // ==========================================
  const [botSettings, setBotSettings] = useState<WhatsAppBotSettings>({
    is_auto_reply_enabled: false,
    welcome_message: "أهلاً بكِ في لونيفا (Luniva) للأزياء ✨ نسعد بخدمتك دائماً. سيتواصل معكِ أحد ممثلينا في أقرب وقت 💕",
    order_notification_enabled: true,
    invoice_auto_send: true,
  });
  const [isSavingBot, setIsSavingBot] = useState(false);

  useEffect(() => {
    if (activeTab === "bot") {
      fetch("/api/whatsapp/baileys/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data && !data.error) setBotSettings(data);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const handleSaveBotSettings = async () => {
    setIsSavingBot(true);
    try {
      const res = await fetch("/api/whatsapp/baileys/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botSettings),
      });
      if (!res.ok) throw new Error("فشل حفظ إعدادات البوت");
      toast.success("تم حفظ إعدادات الرد التلقائي والبوت بنجاح.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setIsSavingBot(false);
    }
  };

  // ==========================================
  // 4. CAMPAIGNS & BROADCASTS STATE
  // ==========================================
  const [segment, setSegment] = useState<"all" | "vip" | "with_balance" | "inactive_30d">("all");
  const [audience, setAudience] = useState<BroadcastCustomer[]>(initialAudience);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplates[0]?.id || "");
  const [customCampaignText, setCustomCampaignText] = useState("");
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState<{ sent: number; total: number } | null>(null);

  const fetchAudience = async (targetSegment: typeof segment) => {
    setLoadingAudience(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns?segment=${targetSegment}`);
      if (res.ok) {
        const data = await res.json();
        setAudience(data);
      }
    } catch {
      toast.error("فشل تحميل قائمة العميلات المستهدفة");
    } finally {
      setLoadingAudience(false);
    }
  };

  const handleSegmentChange = (newSegment: typeof segment) => {
    setSegment(newSegment);
    fetchAudience(newSegment);
  };

  const handleSendCampaign = async () => {
    if (audience.length === 0) {
      toast.error("لا توجد عميلات مستهدفات في هذه الفئة.");
      return;
    }
    const templateContent = customCampaignText.trim() || initialTemplates.find((t) => t.id === selectedTemplateId)?.content || "";
    if (!templateContent) {
      toast.error("يرجى اختيار قالب أو كتابة نص الرسالة.");
      return;
    }

    if (session.status !== "connected") {
      toast.error("واتساب غير متصل. يرجى مسح رمز QR أولاً في تبويب الاتصال.");
      setActiveTab("qr");
      return;
    }

    if (!confirm(`هل أنتِ متأكدة من إرسال الحملة إلى ${audience.length} عميلة عبر واتساب الآن؟`)) return;

    setIsSendingCampaign(true);
    setCampaignProgress({ sent: 0, total: audience.length });

    try {
      const res = await fetch("/api/whatsapp/baileys/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: audience,
          templateContent,
          category: "marketing",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الحملة");

      toast.success(`اكتملت الحملة بنجاح! تم إرسال ${data.sentCount} رسالة.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الحملة");
    } finally {
      setIsSendingCampaign(false);
      setCampaignProgress(null);
    }
  };

  // ==========================================
  // 5. TEMPLATES MANAGEMENT STATE
  // ==========================================
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<WhatsAppTemplateCategory>("marketing");
  const [tplContent, setTplContent] = useState("");

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !tplContent.trim()) {
      toast.error("يرجى إدخال اسم القالب ومحتواه.");
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTemplate?.id,
          name: tplName.trim(),
          category: tplCategory,
          content: tplContent.trim(),
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || "فشل حفظ القالب");

      if (editingTemplate) {
        setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
        toast.success("تم تحديث القالب بنجاح.");
      } else {
        setTemplates((prev) => [saved, ...prev]);
        toast.success("تم إنشاء القالب الجديد بنجاح.");
      }

      setEditingTemplate(null);
      setIsCreatingTemplate(false);
      setTplName("");
      setTplContent("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ القالب");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("هل أنتِ متأكدة من حذف هذا القالب؟")) return;
    try {
      const res = await fetch(`/api/whatsapp/templates?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل حذف القالب");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("تم حذف القالب.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الحذف");
    }
  };

  // Total unread count across all chats
  const totalUnreadCount = useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  }, [chats]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card/95 to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  منظومة واتساب لونيفا المتطورة (Baileys Engine)
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  محادثات حية مباشرة، ربط تلقائي بملفات العميلات، رمز QR دائم، وحملات مؤتمتة
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status Badge & Quick Action */}
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold shadow-xs ${
                session.status === "connected"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : session.status === "qr_ready"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
              }`}
            >
              {session.status === "connected" ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>واتساب متصل ({session.user?.phone || session.user?.name || "جاهز"})</span>
                </>
              ) : session.status === "qr_ready" ? (
                <>
                  <QrCode className="h-4 w-4 animate-pulse" />
                  <span>في انتظار مسح رمز QR</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>واتساب غير متصل</span>
                </>
              )}
            </div>

            {session.status === "connected" ? (
              <button
                onClick={handleLogout}
                disabled={isSessionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-500/20"
                title="تسجيل الخروج وقطع الاتصال"
              >
                <LogOut className="h-3.5 w-3.5" />
                قطع الاتصال
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("qr")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <QrCode className="h-3.5 w-3.5" />
                مسح رمز QR
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <button
            onClick={() => setActiveTab("chats")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "chats"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            المحادثات الحية
            {totalUnreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "qr"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <QrCode className="h-4 w-4" />
            الاتصال ورمز QR
            {session.status === "qr_ready" && (
              <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("bot")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "bot"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4" />
            البوت والرد التلقائي
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "campaigns"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Zap className="h-4 w-4" />
            الحملات التسويقية
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "templates"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            قوالب الرسائل
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "logs"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            السجل والإحصائيات
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE CHATS HUB (WHATSAPP WEB STYLE) */}
      {/* ========================================================================= */}
      {activeTab === "chats" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Chat List (Sidebar: 4 cols) */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm lg:col-span-4 h-[720px]">
            {/* Search and Filters */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحثي بالاسم، الهاتف، أو الرسالة..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pr-9 pl-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setChatFilter("all")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    chatFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  الكل ({chats.length})
                </button>
                <button
                  onClick={() => setChatFilter("customers")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    chatFilter === "customers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  العميلات
                </button>
                <button
                  onClick={() => setChatFilter("unread")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    chatFilter === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  غير مقروءة ({totalUnreadCount})
                </button>
              </div>
            </div>

            {/* Chats Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 stroke-[1.5] text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">لا توجد محادثات مطابقة</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    ستظهر المحادثات هنا تلقائياً عند استلام أو إرسال أي رسالة عبر واتساب
                  </p>
                </div>
              ) : (
                filteredChats.map((c) => {
                  const isSelected = c.jid === selectedChatJid;
                  return (
                    <button
                      key={c.jid}
                      onClick={() => setSelectedChatJid(c.jid)}
                      className={`w-full p-3.5 text-right transition flex items-start gap-3 hover:bg-muted/60 ${
                        isSelected ? "bg-primary/10 border-r-4 border-r-primary" : ""
                      }`}
                    >
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-700 font-bold text-sm">
                        {c.name ? c.name.charAt(0) : "W"}
                        {c.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                            {c.unread_count}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm truncate text-foreground">
                            {c.customer_name || c.name || c.phone || "محادثة"}
                          </h4>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {c.last_message_at
                              ? new Date(c.last_message_at).toLocaleTimeString("ar-EG", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          {c.customer_code && (
                            <span className="inline-block rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-medium text-primary shrink-0">
                              {c.customer_code}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {c.last_message || "محادثة جديدة"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Conversation Messages Area (8 cols) */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm lg:col-span-8 h-[720px]">
            {activeChat ? (
              <>
                {/* Active Chat Header */}
                <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 font-bold">
                      {activeChat.name ? activeChat.name.charAt(0) : "W"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">
                          {activeChat.customer_name || activeChat.name || activeChat.phone}
                        </h3>
                        {activeChat.customer_id && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            عميلة مسجلة
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {activeChat.phone ? `+${activeChat.phone}` : activeChat.jid}
                      </p>
                    </div>
                  </div>

                  {/* Customer Profile Quick Link */}
                  {activeChat.customer_id && (
                    <Link
                      href={`/customers/${activeChat.customer_id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    >
                      <span>ملف العميلة</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2 text-primary" />
                      جاري تحميل الرسائل...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                      <Sparkles className="h-8 w-8 text-primary/40 mb-2" />
                      <p className="text-sm font-medium">لا توجد رسائل سابقة في هذه المحادثة</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        اكتبي رسالتكِ بالأسفل لبدء التواصل المباشر مع العميلة عبر واتساب
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.from_me;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tr-xs"
                                : "bg-card border border-border text-foreground rounded-tl-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
                              {isMe && (
                                <CheckCheck className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input & Quick Templates Bar */}
                <div className="border-t border-border p-3 bg-card space-y-2">
                  {/* Quick Templates Selector */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> قوالب سريعة:
                    </span>
                    {templates.slice(0, 4).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          const compiled = compileTemplate(tpl.content, {
                            اسم_العميلة: activeChat.customer_name || activeChat.name || "عزيزتي",
                          });
                          setMessageInput(compiled);
                        }}
                        className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground shrink-0"
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>

                  {/* Textarea and Send Button */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="اكتبي رسالتكِ هنا... (اضغطي Enter للإرسال، Shift+Enter لسطر جديد)"
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-input bg-background p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    <button
                      type="submit"
                      disabled={!messageInput.trim() || isSendingMessage}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSendingMessage ? (
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
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Smartphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-base font-bold text-foreground">حددي محادثة للبدء</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  يمكنكِ اختيار أي محادثة من القائمة الجانبية لقراءة الرسائل والرد مباشرة عبر واتساب
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BAILEYS SESSION & QR CODE */}
      {/* ========================================================================= */}
      {activeTab === "qr" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main QR Card (7 cols) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">ربط واتساب عبر رمز QR</h3>
                  <p className="text-xs text-muted-foreground">
                    تقنية Baileys Multi-Device الأصلية — يعمل الاتصال بشكل دائم في السيرفر
                  </p>
                </div>
              </div>

              <button
                onClick={fetchStatus}
                disabled={isSessionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSessionLoading ? "animate-spin" : ""}`} />
                تحديث الحالة
              </button>
            </div>

            {/* Status View */}
            {session.status === "connected" ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    واتساب متصل ويعمل بنجاح!
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    جميع الرسائل الواردة والصادرة يتم مزامنتها تلقائياً وحفظها في قاعدة البيانات.
                  </p>
                </div>

                <div className="inline-block rounded-xl border border-emerald-500/20 bg-background/80 p-4 text-sm font-mono text-foreground" dir="ltr">
                  <p><strong>Phone:</strong> {session.user?.phone ? `+${session.user.phone}` : "Linked"}</p>
                  <p><strong>Device:</strong> {session.user?.name || "Luniva WhatsApp"}</p>
                  {session.connectedAt && (
                    <p><strong>Connected At:</strong> {new Date(session.connectedAt).toLocaleString("ar-EG")}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isSessionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج وربط جهاز آخر
                  </button>
                </div>
              </div>
            ) : session.status === "qr_ready" && session.qrCode ? (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
                <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4 bg-white shadow-md">
                  <img
                    src={session.qrCode}
                    alt="WhatsApp QR Code"
                    className="h-64 w-64 object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">امسحي الرمز الآن عبر تطبيق WhatsApp</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    يتم تحديث الرمز تلقائياً في خوادم واتساب لضمان أعلى مستوى أمان
                  </p>
                </div>
              </div>
            ) : session.status === "connecting" ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                <h4 className="font-bold text-foreground">جاري تهيئة جلسة واتساب وتوليد الرمز...</h4>
                <p className="text-xs text-muted-foreground">قد يستغرق ذلك بضع ثوانٍ</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <WifiOff className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <h4 className="font-bold text-lg text-foreground">واتساب غير متصل حالياً</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    اضغطي على الزر أدناه لتوليد رمز الاستجابة السريعة (QR Code) ومسحه بهاتفك
                  </p>
                </div>
                <button
                  onClick={handleStartConnection}
                  disabled={isSessionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <QrCode className="h-5 w-5" />
                  بدء الاتصال وتوليد رمز QR
                </button>
              </div>
            )}
          </div>

          {/* Instructions and Features Guide (5 cols) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-5 space-y-6">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              كيف يعمل النظام؟
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">افتحي تطبيق WhatsApp</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    على هاتفك المحمول أو هاتف العمل الخاص بلونيفا
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">اختاري "الأجهزة المرتبطة"</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    من قائمة الإعدادات (في الآيفون) أو القائمة العلوية ذات الثلاث نقاط (في الأندرويد)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">امسحي رمز QR</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    وجّهي كاميرا هاتفك نحو رمز QR المعروض على الشاشة
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">ارتباط دائم وآمن</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    يتم حفظ مفاتيح الجلسة في قاعدة البيانات (Neon PostgreSQL) لضمان استمرار الاتصال حتى بعد إعادة تشغيل السيرفر
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SMART AUTO-REPLY BOT & AUTOMATIONS */}
      {/* ========================================================================= */}
      {activeTab === "bot" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-8 space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                إعدادات البوت والرد التلقائي الذكي
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                تكوين الردود التلقائية ورسائل الترحيب للعميلات عبر واتساب
              </p>
            </div>

            {/* Toggle 1: Auto-reply */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 p-4 bg-muted/10">
              <div>
                <h4 className="text-sm font-bold text-foreground">تفعيل الرد التلقائي على الرسائل الجديدة</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  يرد البوت فوراً على أي عميلة تراسل المتجر لأول مرة اليوم
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={botSettings.is_auto_reply_enabled}
                  onChange={(e) =>
                    setBotSettings((prev) => ({ ...prev, is_auto_reply_enabled: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted-foreground/30 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all"></div>
              </label>
            </div>

            {/* Welcome message text */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">نص رسالة الترحيب التلقائية:</label>
              <textarea
                rows={4}
                value={botSettings.welcome_message}
                onChange={(e) =>
                  setBotSettings((prev) => ({ ...prev, welcome_message: e.target.value }))
                }
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                يمكنكِ استخدام الوسم <code className="bg-muted px-1.5 py-0.5 rounded text-primary">{"{اسم_العميلة}"}</code> ليتم استبداله تلقائياً باسم العميلة.
              </p>
            </div>

            {/* Toggle 2: Order Notification */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 p-4 bg-muted/10">
              <div>
                <h4 className="text-sm font-bold text-foreground">إشعار العميلة تلقائياً عند إنشاء طلب شراء جديد</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إرسال رسالة واتساب للعميلة تؤكد استلام طلبها من المتجر
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={botSettings.order_notification_enabled}
                  onChange={(e) =>
                    setBotSettings((prev) => ({ ...prev, order_notification_enabled: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted-foreground/30 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all"></div>
              </label>
            </div>

            {/* Toggle 3: Invoice auto-send */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 p-4 bg-muted/10">
              <div>
                <h4 className="text-sm font-bold text-foreground">إرسال رابط الفاتورة الإلكترونية عبر واتساب</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إرسال الفاتورة مع رابط الاستعراض والتحميل فور إنشائها في النظام
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={botSettings.invoice_auto_send}
                  onChange={(e) =>
                    setBotSettings((prev) => ({ ...prev, invoice_auto_send: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted-foreground/30 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all"></div>
              </label>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveBotSettings}
                disabled={isSavingBot}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                {isSavingBot ? <RefreshCw className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                حفظ الإعدادات
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-4 space-y-4">
            <h3 className="font-bold text-base text-foreground">معاينة رد البوت</h3>
            <div className="rounded-2xl border border-border bg-muted/10 p-4 text-xs space-y-2">
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tr-xs bg-primary px-3.5 py-2 text-primary-foreground max-w-[85%]">
                  <p className="whitespace-pre-wrap">
                    {botSettings.welcome_message.replace(/\{اسم_العميلة\}/g, "سارة أحمد")}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              يقوم البوت بالتحقق من هوية العميلة تلقائياً بناءً على رقم هاتفها، وإذا كانت مسجلة في المتجر يحييها باسمها الحقيقي.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MARKETING CAMPAIGNS (BROADCASTS) */}
      {/* ========================================================================= */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">الحملات التسويقية ورسائل البث الجماعي</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  أرسلي عروضكِ وتخفيضاتكِ مباشرة إلى هواتف العميلات عبر واتساب بأمان وبدون حظر
                </p>
              </div>

              {/* Segment filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "جميع العميلات" },
                  { key: "vip", label: "عميلات VIP" },
                  { key: "with_balance", label: "عليهن متبقي" },
                  { key: "inactive_30d", label: "غير نشطات (30+ يوم)" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleSegmentChange(s.key as typeof segment)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      segment === s.key ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Composer */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">اختاري قالباً محفوظاً أو اكتبي نصاً مخصصاً:</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      const tpl = templates.find((t) => t.id === e.target.value);
                      if (tpl) setCustomCampaignText(tpl.content);
                    }}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">-- قالب مخصص --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({templateCategoryLabels[t.category]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">نص الرسالة:</label>
                  <textarea
                    rows={6}
                    value={customCampaignText}
                    onChange={(e) => setCustomCampaignText(e.target.value)}
                    placeholder="اكتبي نص الرسالة التسويقية هنا..."
                    className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>الوسوم المتاحة:</span>
                    <button
                      type="button"
                      onClick={() => setCustomCampaignText((prev) => prev + " {اسم_العميلة} ")}
                      className="rounded bg-muted px-1.5 py-0.5 text-primary hover:bg-muted/80"
                    >
                      {"{اسم_العميلة}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCampaignText((prev) => prev + " {إجمالي_المشتريات} ")}
                      className="rounded bg-muted px-1.5 py-0.5 text-primary hover:bg-muted/80"
                    >
                      {"{إجمالي_المشتريات}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCampaignText((prev) => prev + " {المبلغ_المتبقي} ")}
                      className="rounded bg-muted px-1.5 py-0.5 text-primary hover:bg-muted/80"
                    >
                      {"{المبلغ_المتبقي}"}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSendCampaign}
                    disabled={isSendingCampaign || audience.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSendingCampaign ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>جاري الإرسال ({campaignProgress?.sent || 0} / {campaignProgress?.total || audience.length})...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>إرسال الحملة إلى {audience.length} عميلة الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Target Audience Summary List */}
              <div className="rounded-xl border border-border bg-muted/10 p-4 lg:col-span-5 flex flex-col h-[380px]">
                <h4 className="font-bold text-sm text-foreground mb-3 flex items-center justify-between">
                  <span>الجمهور المستهدف ({audience.length} عميلة)</span>
                  {loadingAudience && <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />}
                </h4>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {audience.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-10">
                      لا توجد عميلات في هذا التصنيف
                    </p>
                  ) : (
                    audience.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-2.5 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{a.full_name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                            {a.phone}
                          </p>
                        </div>
                        <div className="text-left font-mono text-[11px]">
                          <span className="text-emerald-600 font-semibold">{formatMoney(a.total_spent)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SAVED TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground">قوالب رسائل الواتساب</h3>
            <button
              onClick={() => {
                setIsCreatingTemplate(true);
                setEditingTemplate(null);
                setTplName("");
                setTplContent("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              قالب جديد
            </button>
          </div>

          {/* Create or Edit Form */}
          {(isCreatingTemplate || editingTemplate) && (
            <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-md space-y-4">
              <h4 className="font-bold text-base text-foreground">
                {editingTemplate ? "تعديل القالب" : "إنشاء قالب جديد"}
              </h4>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">اسم القالب:</label>
                  <input
                    type="text"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="مثال: رسالة ترحيبية خاصة"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">التصنيف:</label>
                  <select
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value as WhatsAppTemplateCategory)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    {Object.entries(templateCategoryLabels).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">محتوى القالب:</label>
                <textarea
                  rows={4}
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  placeholder="اكتبي نص القالب..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingTemplate(false);
                    setEditingTemplate(null);
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  حفظ القالب
                </button>
              </div>
            </div>
          )}

          {/* Templates Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {templateCategoryLabels[tpl.category]}
                    </span>
                    {tpl.is_default && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        افتراضي
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{tpl.name}</h4>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 leading-relaxed">
                    {tpl.content}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-border/60 pt-3">
                  <button
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setTplName(tpl.name);
                      setTplCategory(tpl.category);
                      setTplContent(tpl.content);
                      setIsCreatingTemplate(false);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="تعديل"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {!tpl.is_default && (
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUDIT LOGS & STATS */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">إجمالي الرسائل المرسلة</p>
              <p className="mt-1 text-2xl font-bold text-foreground font-mono">
                {initialStats.total_sent}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">مرسل اليوم</p>
              <p className="mt-1 text-2xl font-bold text-primary font-mono">
                {initialStats.sent_today}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">عميلات تم الوصول إليهن</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 font-mono">
                {initialStats.unique_customers_reached}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">قوالب جاهزة</p>
              <p className="mt-1 text-2xl font-bold text-foreground font-mono">
                {templates.length}
              </p>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border p-4 bg-muted/20">
              <h3 className="font-bold text-base text-foreground">سجل إرسال رسائل الواتساب</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-3">العميلة</th>
                    <th className="p-3">الهاتف</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3">نص الرسالة</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {initialLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">
                        {log.customer_name || "عميلة عامة"}
                      </td>
                      <td className="p-3 font-mono" dir="ltr">
                        {log.phone}
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px]">
                          {log.template_category || "مباشر"}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-muted-foreground">
                        {log.message}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCheck className="h-3.5 w-3.5" />
                          تم الإرسال
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}
