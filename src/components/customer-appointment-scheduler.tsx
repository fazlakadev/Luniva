"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Check, Plus, Sparkles, X } from "lucide-react";
import { Slot, SlotWeekPicker } from "@/components/ui/slot-week-picker";

interface CustomerAppointmentSchedulerProps {
  customerId: string;
  customerName: string;
  existingAppointments?: Array<{
    appointment_date: string;
    appointment_time?: string | null;
    title: string;
  }>;
}

const APPOINTMENT_TYPES = [
  "جلسة قياس واختيار مقاسات",
  "استلام وتجربة فستان / طقم",
  "استشارة تنسيق وتفصيل خاصة",
  "متابعة تسليم وتعديل القطع",
];

export default function CustomerAppointmentScheduler({
  customerId,
  customerName,
  existingAppointments = [],
}: CustomerAppointmentSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(APPOINTMENT_TYPES[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

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

      // Skip Friday prayers hour if needed or add lunch break at 13:00
      for (const h of hours) {
        for (const m of minutes) {
          const slotDate = new Date(day);
          slotDate.setHours(h, m, 0, 0);

          const timeString = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

          // Check if already booked in customer's appointments
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

  const handleConfirm = async (slot: Slot) => {
    const slotDate = new Date(slot.start);
    const yyyy = slotDate.getFullYear();
    const mm = String(slotDate.getMonth() + 1).padStart(2, "0");
    const dd = String(slotDate.getDate()).padStart(2, "0");
    const appointmentDate = `${yyyy}-${mm}-${dd}`;

    const hh = String(slotDate.getHours()).padStart(2, "0");
    const min = String(slotDate.getMinutes()).padStart(2, "0");
    const appointmentTime = `${hh}:${min}`;

    const finalTitle = customTitle.trim() || `${selectedType} - ${customerName}`;

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          title: finalTitle,
          appointmentDate,
          time: appointmentTime,
          kind: "fitting",
          tone: "formal",
          status: "pending",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذّر حفظ الموعد.");
      }

      setMessage("تم حجز وتثبيت الموعد بنجاح!");
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl py-2 px-3 text-xs font-black shadow-md transition active:scale-95 hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          color: "#fff",
        }}
      >
        <Sparkles size={14} className="text-purple-200" />
        <span>{isOpen ? "إغلاق جدول المواعيد" : "حجز موعد جديد بالجدول الذكي"}</span>
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
              className="rounded-3xl border p-5 sm:p-6 shadow-xl relative"
              style={{
                borderColor: "color-mix(in srgb, #7c3aed 35%, var(--line))",
                background: "color-mix(in srgb, var(--surface) 96%, transparent)",
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b pb-4 mb-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
                  >
                    <CalendarClock size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-ink">
                      حجز موعد لـ : {customerName}
                    </h3>
                    <p className="text-[11px] font-bold text-muted">
                      اختاري اليوم والفترة الزمنية المناسبة ثم اضغطي تأكيد
                    </p>
                  </div>
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

              {/* Appointment Title / Purpose Selection */}
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    نوع وموضوع الموعد:
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {APPOINTMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    ملاحظة إضافية أو تفصيل للموعد (اختياري):
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="مثال: تجربة مقاس الفستان الكحلي والتعديل"
                    className="w-full rounded-xl border p-2.5 text-xs font-bold bg-[var(--surface-2)] text-ink outline-none focus:border-purple-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              {/* Status Message */}
              {message && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-black text-emerald-700 dark:text-emerald-300">
                  <Check size={16} />
                  <span>{message}</span>
                </div>
              )}

              {/* SlotWeekPicker Component */}
              <div className="flex justify-center">
                <SlotWeekPicker
                  slots={slots}
                  slotMinutes={30}
                  title={`جدول المواعيد المتاحة لـ ${customerName}`}
                  onConfirm={handleConfirm}
                  className="w-full max-w-xl"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
