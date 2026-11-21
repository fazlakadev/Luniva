"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  CalendarDays,
  Wallet,
  Sparkles,
  Gift,
  CheckCheck,
  Phone,
  Copy,
  Clock,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/toast";
import {
  formatWhatsAppPhone,
  generateWhatsAppUrl,
  compileTemplate,
} from "@/lib/whatsapp-shared";
import { formatMoney } from "@/lib/format";

interface CustomerWhatsAppBoxProps {
  customerId: string;
  customerName: string;
  phones: string[];
  openBalance: number;
  totalSpent: number;
  nextAppointment?: {
    date: string;
    time?: string | null;
    title: string;
  } | null;
  initialLogs?: Array<{
    id: string;
    message: string;
    template_category: string | null;
    created_at: string;
    sent_by: string | null;
  }>;
}

export default function CustomerWhatsAppBox({
  customerId,
  customerName,
  phones,
  openBalance,
  totalSpent,
  nextAppointment,
  initialLogs = [],
}: CustomerWhatsAppBoxProps) {
  const toast = useToast();
  const [selectedPhone, setSelectedPhone] = useState(phones[0] || "");
  const [message, setMessage] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [logs, setLogs] = useState(initialLogs);
  const [showLogs, setShowLogs] = useState(false);

  // Quick preset templates tailored for fashion atelier/store
  const presets = [
    {
      id: "appointment",
      label: "تذكير بالموعد",
      icon: CalendarDays,
      color: "#8b5cf6",
      generate: () => {
        const appText = nextAppointment
          ? `نذكركِ بموعدكِ القادم: "${nextAppointment.title}" يوم ${nextAppointment.date}${
              nextAppointment.time ? ` الساعة ${nextAppointment.time}` : ""
            }.`
          : "يسعدنا ترتيب موعد بروفة قياس لكِ في أتيليه لونيفا في الوقت الذي يناسبكِ.";
        return `مرحباً بكِ أستاذة {اسم_العميلة} 🌸\nمن أتيليه لونيفا فاشون.\n${appText}\nنتشرف بزيارتكِ ويسعدنا دائماً خدمتكِ ✨`;
      },
    },
    {
      id: "balance",
      label: "تذكير بالرصيد المتبقي",
      icon: Wallet,
      color: "#f59e0b",
      generate: () =>
        `مرحباً بكِ أستاذة {اسم_العميلة} 🌸\nمن لونيفا فاشون.\nنود إحاطتكِ علماً بأن الرصيد المتبقي على حسابكِ هو {المتبقي}.\nيمكنكِ السداد في أي وقت، وإذا كنتِ قد قمتِ بالتحويل يرجى إرسال الإشعار للتوثيق.\nشكراً لتعاملكِ الراقي معنا ✨`,
    },
    {
      id: "thankyou",
      label: "شكر ومتابعة طلب",
      icon: Sparkles,
      color: "#10b981",
      generate: () =>
        `مرحباً بكِ أستاذة {اسم_العميلة} ✨\nنتمنى أن تكون قطع لونيفا فاشون قد نالت إعجابكِ التام وأبرزت إطلالتكِ بأجمل صورة 👗🌸\nنسعد دائماً باختياركِ لنا ويسرنا تكرار زيارتكِ قريباً!`,
    },
    {
      id: "promo",
      label: "عرض خاص وتشكيلة جديدة",
      icon: Gift,
      color: "#ec4899",
      generate: () =>
        `مرحباً أستاذة {اسم_العميلة} العزيزة 💖\nلأنكِ من عميلاتنا المميزات، يسعدنا دعوتكِ لمشاهدة التشكيلة الجديدة الحصرية من لونيفا فاشون مع خصم خاص لكِ على طلبكِ القادم ✨👗`,
    },
  ];

  function applyPreset(presetId: string) {
    const p = presets.find((item) => item.id === presetId);
    if (!p) return;
    setSelectedPreset(presetId);

    const compiled = compileTemplate(p.generate(), {
      اسم_العميلة: customerName,
      المتبقي: formatMoney(openBalance),
      إجمالي_المشتريات: formatMoney(totalSpent),
      اسم_البراند: "لونيفا فاشون",
      رابط_المتجر: typeof window !== "undefined" ? window.location.origin : "",
      تاريخ_الموعد: nextAppointment?.date || "قريباً",
    });

    setMessage(compiled);
  }

  function insertTag(tag: string) {
    setMessage((prev) => prev + " " + `{${tag}}`);
  }

  async function handleSend() {
    if (!selectedPhone.trim()) {
      toast.error("رقم الهاتف غير محدد", "يرجى تحديد رقم هاتف صالح للعميلة.");
      return;
    }
    if (!message.trim()) {
      toast.error("الرسالة فارغة", "يرجى كتابة نص الرسالة أولاً.");
      return;
    }

    const clean = formatWhatsAppPhone(selectedPhone);
    if (!clean || clean.length < 8) {
      toast.error("رقم غير صالح", "رقم الهاتف غير صالح للاستخدام مع واتساب.");
      return;
    }

    // 1. Immediately open WhatsApp deep-link
    const url = generateWhatsAppUrl(clean, message);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("تم فتح محادثة واتساب", `جارِ إرسال الرسالة إلى ${clean}`);

    // 2. Concurrently record log
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          customerName,
          phone: clean,
          message,
          templateCategory: selectedPreset || "custom",
          sentBy: "المسؤول",
        }),
      });

      setLogs((prev) => [
        {
          id: Math.random().toString(),
          message,
          template_category: selectedPreset || "custom",
          created_at: new Date().toISOString(),
          sent_by: "المسؤول",
        },
        ...prev,
      ]);
    } catch {
      // url was already opened
    }
  }

  return (
    <section className="app-card overflow-hidden border-2 border-emerald-500/20 shadow-lg">
      {/* Header Banner */}
      <div
        className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(37,211,102,0.1), rgba(18,140,126,0.05))",
          borderColor: "var(--line)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#25D366] text-white shadow-md shadow-emerald-500/20">
            <MessageSquare size={20} />
          </span>
          <div>
            <h2 className="text-sm font-black flex items-center gap-2" style={{ color: "var(--ink)" }}>
              مراسلة العميلة عبر واتساب
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
                تكامل مجاني ومباشر
              </span>
            </h2>
            <p className="text-[11px] font-bold muted">
              إرسال تذكيرات مواعيد وسداد ورسائل شكر بنقرة واحدة من ملف العميلة
            </p>
          </div>
        </div>

        {/* Phone Selector Tabs (if multiple phones) */}
        <div className="flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--line)]">
          {phones.map((phone, idx) => (
            <button
              key={phone}
              type="button"
              onClick={() => setSelectedPhone(phone)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                selectedPhone === phone
                  ? "bg-[#25D366] text-white shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
              dir="ltr"
            >
              <Phone size={11} className="inline ml-1" />
              {phone}
              {idx === 0 && <span className="mr-1 text-[9px] opacity-80">(الأساسي)</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Preset Action Pills */}
        <div>
          <label className="block text-xs font-black text-ink mb-2">
            نماذج سريعة جاهزة للاستخدام:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-right transition-all ${
                    isSelected
                      ? "border-[#25D366] bg-[rgba(37,211,102,0.08)] shadow-sm"
                      : "border-[var(--line)] bg-[var(--surface-2)] hover:border-gray-400"
                  }`}
                >
                  <span
                    className="p-1.5 rounded-lg mb-1.5"
                    style={{ background: `${preset.color}18`, color: preset.color }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-black leading-tight text-ink">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Input Box */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-ink">نص الرسالة:</label>
            <div className="flex items-center gap-1.5 text-[10px] muted">
              <span>إدراج سريع:</span>
              {["اسم_العميلة", "المتبقي", "تاريخ_الموعد"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 hover:bg-emerald-100 font-mono text-[9px]"
                >
                  {`{${tag}}`}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            dir="rtl"
            placeholder="اكتبي نص الرسالة هنا أو اضغطي على أحد النماذج الجاهزة أعلاه…"
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowLogs((prev) => !prev)}
            className="text-xs font-bold text-muted hover:text-ink inline-flex items-center gap-1"
          >
            <Clock size={13} />
            <span>سجل الرسائل السابقة ({logs.length})</span>
            <ChevronDown size={13} className={`transition-transform ${showLogs ? "rotate-180" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim()}
            className="btn text-xs px-5 py-2.5 font-black bg-[#25D366] text-white hover:bg-[#20ba59] shadow-md shadow-emerald-500/20 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={14} />
            فتح وإرسال عبر تطبيق واتساب
          </button>
        </div>

        {/* Logs Drawer */}
        {showLogs && (
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            <h4 className="text-xs font-black text-ink mb-2">أحدث الرسائل المرسلة لهذه العميلة:</h4>
            {logs.length === 0 ? (
              <p className="text-xs muted p-3 text-center bg-[var(--surface-2)] rounded-xl">
                لم يتم إرسال رسائل واتساب مسجلة لهذه العميلة بعد.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] muted">
                      <span className="font-bold text-[#128C7E] dark:text-[#25D366]">
                        {log.template_category || "مخصص"}
                      </span>
                      <span>{new Date(log.created_at).toLocaleString("ar-EG")}</span>
                    </div>
                    <p className="text-ink leading-relaxed whitespace-pre-line">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
