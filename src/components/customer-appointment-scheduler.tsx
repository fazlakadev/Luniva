"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Slot, SlotWeekPicker } from "@/components/ui/slot-week-picker";
import { useToast } from "@/components/toast";
import { formatWhatsAppPhone, generateWhatsAppUrl } from "@/lib/whatsapp-shared";

interface CustomerAppointmentSchedulerProps {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  existingAppointments?: Array<{
    appointment_date: string;
    appointment_time?: string | null;
    title: string;
  }>;
  invoices?: Array<{
    id: string;
    invoice_number: string;
  }>;
}

const APPOINTMENT_TYPES = [
  { value: "fitting", label: "جلسة قياس وبروفة فستان" },
  { value: "consultation", label: "استشارة تنسيق وتصميم خاصة" },
  { value: "delivery", label: "استلام وتسليم القطع" },
  { value: "measurement", label: "أخذ مقاسات أولية" },
  { value: "collection", label: "متابعة سداد وتحصيل" },
  { value: "custom", label: "موعد مخصص" },
];

export default function CustomerAppointmentScheduler({
  customerId,
  customerName,
  customerPhone,
  existingAppointments = [],
  invoices = [],
}: CustomerAppointmentSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [schedulerMode, setSchedulerMode] = useState<"slots" | "manual">("slots");
  const [selectedKind, setSelectedKind] = useState("fitting");
  const [customTitle, setCustomTitle] = useState("");
  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [manualTime, setManualTime] = useState("16:00");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{
    date: string;
    time?: string;
    title: string;
  } | null>(null);

  const router = useRouter();
  const toast = useToast();

  // Generate slots for the next 28 days during business hours (10:00 to 20:00)
  const slots: Slot[] = useMemo(() => {
    const list: Slot[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const minutes = [0, 30];

    for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
      const day = new Date(today.getTime() + dayOffset * 86_400_000);
      const yyyy = day.getFullYear();
      const mm = String(day.getMonth() + 1).padStart(2, "0");
      const dd = String(day.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      for (const h of hours) {
        for (const m of minutes) {
          const slotDate = new Date(day);
          slotDate.setHours(h, m, 0, 0);

          const timeString = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

          const isBooked = existingAppointments.some(
            (app) =>
              app.appointment_date === dateKey &&
              app.appointment_time?.startsWith(timeString),
          );

          let unavailableReason: string | undefined = undefined;
          if (isBooked) {
            unavailableReason = "يوجد موعد مسجل في هذا الوقت";
          } else if (h === 13 && m === 30) {
            unavailableReason = "استراحة فريق العمل";
          }

          list.push({
            start: slotDate.toISOString(),
            unavailableReason,
          });
        }
      }
    }
    return list;
  }, [existingAppointments]);

  // Slot Confirm Handler
  const handleSlotConfirm = async (slot: Slot) => {
    const slotDate = new Date(slot.start);
    const appointmentDate = slotDate.toISOString().slice(0, 10);
    const hh = String(slotDate.getHours()).padStart(2, "0");
    const min = String(slotDate.getMinutes()).padStart(2, "0");
    const appointmentTime = `${hh}:${min}`;

    const kindObj = APPOINTMENT_TYPES.find((t) => t.value === selectedKind);
    const finalTitle = customTitle.trim() || `${kindObj?.label || "موعد"} - ${customerName}`;

    await executeBooking({
      appointmentDate,
      appointmentTime,
      title: finalTitle,
      kind: selectedKind,
      invoiceId: selectedInvoiceId || undefined,
      notes: notes.trim() || undefined,
    });
  };

  // Manual Form Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate) {
      toast.error("تاريخ الموعد مطلوب", "يرجى اختيار تاريخ الموعد.");
      return;
    }

    const kindObj = APPOINTMENT_TYPES.find((t) => t.value === selectedKind);
    const finalTitle = customTitle.trim() || `${kindObj?.label || "موعد"} - ${customerName}`;

    await executeBooking({
      appointmentDate: manualDate,
      appointmentTime: manualTime || undefined,
      title: finalTitle,
      kind: selectedKind,
      invoiceId: selectedInvoiceId || undefined,
      notes: notes.trim() || undefined,
    });
  };

  // Shared booking execution
  async function executeBooking(payload: {
    appointmentDate: string;
    appointmentTime?: string;
    title: string;
    kind: string;
    invoiceId?: string;
    notes?: string;
  }) {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          title: payload.title,
          appointmentDate: payload.appointmentDate,
          time: payload.appointmentTime,
          kind: payload.kind,
          tone: "accent",
          status: "pending",
          invoiceId: payload.invoiceId || null,
          notes: payload.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذّر حفظ الموعد.");
      }

      setBookedDetails({
        date: payload.appointmentDate,
        time: payload.appointmentTime,
        title: payload.title,
      });

      toast.success("تم حجز الموعد بنجاح", `تم تثبيت ${payload.title} بنجاح.`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر حفظ الموعد";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  // Send WhatsApp confirmation
  function sendWhatsAppConfirmation() {
    if (!bookedDetails || !customerPhone) return;
    const clean = formatWhatsAppPhone(customerPhone);
    const timeText = bookedDetails.time ? ` في تمام الساعة ${bookedDetails.time}` : "";
    const msg = `مرحباً بكِ أستاذة ${customerName} 🌸\nيسعدنا تأكيد موعدكِ في لونيفا فاشون:\n✨ "${bookedDetails.title}"\n📅 التاريخ: ${bookedDetails.date}${timeText}\n\nنتشرف بحضوركِ ونسعد بخدمتكِ دائماً! ✨`;

    const url = generateWhatsAppUrl(clean, msg);
    window.open(url, "_blank", "noopener,noreferrer");

    // Log concurrently
    fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        customerName,
        phone: clean,
        message: msg,
        templateCategory: "appointment",
        sentBy: "المسؤول",
      }),
    }).catch(() => null);

    toast.success("تم فتح واتساب", "تم توجيه رسالة التأكيد إلى العميلة.");
  }

  return (
    <div>
      {/* Unified Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setBookedDetails(null);
        }}
        className="inline-flex items-center gap-2 rounded-xl py-2 px-3.5 text-xs font-black shadow-md transition active:scale-95 hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          color: "#fff",
        }}
      >
        <Sparkles size={14} className="text-purple-200" />
        <span>{isOpen ? "إغلاق جدولة المواعيد" : "حجز موعد ومتابعة للعميلة"}</span>
      </button>

      {/* Expandable Booking Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            <div
              className="rounded-3xl border p-5 sm:p-6 shadow-2xl relative"
              style={{
                borderColor: "color-mix(in srgb, #7c3aed 35%, var(--line))",
                background: "color-mix(in srgb, var(--surface) 98%, transparent)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b pb-4 mb-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
                  >
                    <CalendarClock size={20} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-ink">
                      حجز موعد متابعة لـ : {customerName}
                    </h3>
                    <p className="text-[11px] font-bold text-muted">
                      اختاري طريقة الحجز المفضلة (الجدول الأسبوعي الذكي أو التحديد اليدوي المباشر)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mode switcher tabs */}
                  <div className="flex items-center bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setSchedulerMode("slots")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        schedulerMode === "slots"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <Sparkles size={12} className="inline ml-1" />
                      الجدول الذكي
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulerMode("manual")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        schedulerMode === "manual"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <SlidersHorizontal size={12} className="inline ml-1" />
                      تحديد يدوي
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full border text-muted hover:text-ink hover:bg-[var(--surface-2)] transition"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Success & WhatsApp Confirmation Alert */}
              {bookedDetails && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                    <Check size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <p>تم تثبيت الموعد بنجاح! ({bookedDetails.title})</p>
                      <p className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                        التاريخ: {bookedDetails.date} {bookedDetails.time ? `الساعة ${bookedDetails.time}` : ""}
                      </p>
                    </div>
                  </div>

                  {customerPhone && (
                    <button
                      type="button"
                      onClick={sendWhatsAppConfirmation}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#25D366] text-white hover:bg-[#20ba59] shadow-md transition"
                    >
                      <Send size={13} />
                      إرسال تأكيد الموعد عبر واتساب
                    </button>
                  )}
                </div>
              )}

              {/* Common Configuration: Purpose & Invoice Link */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    نوع الموعد:
                  </label>
                  <select
                    value={selectedKind}
                    onChange={(e) => setSelectedKind(e.target.value)}
                    className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {APPOINTMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    عنوان أو تفصيل إضافي:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="مثال: تجربة الفستان الملكي واستلامه"
                    className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    ربط بفاتورة (اختياري):
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <option value="">-- بدون ربط بفاتورة --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        فاتورة {inv.invoice_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode 1: SlotWeekPicker */}
              {schedulerMode === "slots" && (
                <div className="flex flex-col items-center">
                  <SlotWeekPicker
                    slots={slots}
                    slotMinutes={30}
                    title={`جدول المواعيد المتاحة لـ ${customerName}`}
                    onConfirm={handleSlotConfirm}
                    className="w-full max-w-xl"
                  />
                </div>
              )}

              {/* Mode 2: Manual Booking Form */}
              {schedulerMode === "manual" && (
                <form onSubmit={handleManualSubmit} className="space-y-4 max-w-xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-ink mb-1.5 flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-purple-600" />
                        تاريخ الموعد:
                      </label>
                      <input
                        type="date"
                        required
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                        style={{ borderColor: "var(--line)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-ink mb-1.5 flex items-center gap-1.5">
                        <Clock size={14} className="text-purple-600" />
                        وقت الموعد:
                      </label>
                      <input
                        type="time"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                        style={{ borderColor: "var(--line)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-ink mb-1.5">
                      ملاحظات وتفاصيل التجهيز:
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي ملاحظات تخص تجهيز القطع أو التعديلات المطلوبة قبل الحضور…"
                      className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                      style={{ borderColor: "var(--line)" }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="btn btn-outline text-xs px-4 py-2"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn text-xs px-5 py-2 font-black text-white bg-purple-600 hover:bg-purple-700 shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      {loading ? "جارِ الحفظ…" : "تأكيد وحفظ الموعد"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
