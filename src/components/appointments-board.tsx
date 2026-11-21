"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  List,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  Truck,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import EventCalendar, { type CalendarEvent } from "@/components/ui/event-calendar";
import { Slot, SlotWeekPicker } from "@/components/ui/slot-week-picker";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { formatMoney } from "@/lib/format";
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TONES,
  appointmentKindLabels,
  appointmentStatusClass,
  appointmentStatusLabels,
  appointmentToneLabels,
  dateKey,
  isPastPending,
  isToday,
  parseAppointmentDate,
  sortAppointments,
  todayKey,
  type AppointmentKind,
  type AppointmentRecord,
  type AppointmentStatus,
  type AppointmentTone,
} from "@/lib/appointment-shared";

type CustomerOption = { id: string; full_name: string; phone?: string | null };
type InvoiceOption = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  total: string;
  status: string;
};

type FormState = {
  id: string | null;
  title: string;
  date: string;
  time: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  tone: AppointmentTone;
  customerId: string;
  invoiceId: string;
  notes: string;
};

const kindIcons: Record<AppointmentKind, any> = {
  followup: UsersRound,
  payment: Wallet,
  delivery: Truck,
  meeting: CalendarClock,
  fitting: Scissors,
  consultation: Sparkles,
};

/** Maps appointment tones onto the Luniva CSS variables. */
function toneColor(tone: AppointmentTone) {
  if (tone === "accent") return "var(--brand)";
  if (tone === "info") return "var(--lav)";
  if (tone === "neutral") return "var(--muted)";
  return `var(--${tone})`;
}

function emptyForm(date = todayKey()): FormState {
  return {
    id: null,
    title: "",
    date,
    time: "",
    kind: "followup",
    status: "pending",
    tone: "accent",
    customerId: "",
    invoiceId: "",
    notes: "",
  };
}

export default function AppointmentsBoard({
  initialAppointments,
  customers,
  invoices,
  presetCustomerId = null,
  presetInvoiceId = null,
}: {
  initialAppointments: AppointmentRecord[];
  customers: CustomerOption[];
  invoices: InvoiceOption[];
  presetCustomerId?: string | null;
  presetInvoiceId?: string | null;
}) {
  const toast = useToast();
  const presetInvoice = presetInvoiceId ? invoices.find((item) => item.id === presetInvoiceId) : undefined;
  const presetCustomer = presetCustomerId ?? presetInvoice?.customer_id ?? "";

  const [appointments, setAppointments] = useState<AppointmentRecord[]>(initialAppointments);
  const [view, setView] = useState<"calendar" | "slots" | "list">("calendar");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Date>(new Date());
  const [modalOpen, setModalOpen] = useState(Boolean(presetCustomerId || presetInvoiceId));
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm(),
    customerId: presetCustomer,
    invoiceId: presetInvoice?.id ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Generate 28 days of 30-min appointment slots for SlotWeekPicker
  const appointmentSlots: Slot[] = useMemo(() => {
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
      const dateKeyStr = `${yyyy}-${mm}-${dd}`;

      for (const h of hours) {
        for (const m of minutes) {
          const slotDate = new Date(day);
          slotDate.setHours(h, m, 0, 0);
          const timeString = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

          const booked = appointments.find(
            (app) =>
              app.status !== "cancelled" &&
              app.appointment_date === dateKeyStr &&
              app.appointment_time?.startsWith(timeString),
          );

          let unavailableReason: string | undefined = undefined;
          if (booked) {
            unavailableReason = `محجوز: ${booked.title}${booked.customer_name ? ` (${booked.customer_name})` : ""}`;
          }

          list.push({
            start: slotDate.toISOString(),
            unavailableReason,
          });
        }
      }
    }
    return list;
  }, [appointments]);

  const handleSlotConfirm = (slot: Slot) => {
    const d = new Date(slot.start);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dKey = `${yyyy}-${mm}-${dd}`;
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const tKey = `${hh}:${min}`;

    setForm({
      ...emptyForm(dKey),
      time: tKey,
      title: "موعد متابعة وقياس",
      kind: "fitting",
      customerId: presetCustomer,
      invoiceId: presetInvoice?.id ?? "",
    });
    setModalOpen(true);
  };

  const byId = useMemo(() => new Map(appointments.map((item) => [item.id, item])), [appointments]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortAppointments(
      appointments.filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (!needle) return true;
        return [item.title, item.notes, item.customer_name, item.invoice_number]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      }),
    );
  }, [appointments, query, statusFilter]);

  const events = useMemo<CalendarEvent[]>(
    () =>
      filtered.map((item) => ({
        id: item.id,
        title: item.title,
        date: parseAppointmentDate(item.appointment_date),
        time: item.appointment_time ?? undefined,
        description: item.notes ?? undefined,
        tone: item.tone,
      })),
    [filtered],
  );

  const stats = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    let overdue = 0;
    for (const item of appointments) {
      if (item.status === "cancelled") continue;
      if (isToday(item)) today += 1;
      if (item.status === "pending" && item.appointment_date >= todayKey()) upcoming += 1;
      if (isPastPending(item)) overdue += 1;
    }
    return { today, upcoming, overdue };
  }, [appointments]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNew() {
    setForm(emptyForm(dateKey(selected)));
    setError("");
    setModalOpen(true);
  }

  function openEdit(record: AppointmentRecord) {
    setForm({
      id: record.id,
      title: record.title,
      date: record.appointment_date,
      time: record.appointment_time ?? "",
      kind: record.kind,
      status: record.status,
      tone: record.tone,
      customerId: record.customer_id ?? "",
      invoiceId: record.invoice_id ?? "",
      notes: record.notes ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!form.title.trim()) {
      setError("عنوان الموعد مطلوب.");
      return;
    }
    if (!form.date) {
      setError("تاريخ الموعد مطلوب.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/appointments", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id ?? undefined,
          title: form.title.trim(),
          appointmentDate: form.date,
          time: form.time,
          kind: form.kind,
          status: form.status,
          tone: form.tone,
          customerId: form.customerId || null,
          invoiceId: form.invoiceId || null,
          notes: form.notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذّر حفظ الموعد.");

      const saved = data.appointment as AppointmentRecord;
      setAppointments((current) =>
        form.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved],
      );
      setSelected(parseAppointmentDate(saved.appointment_date));
      setModalOpen(false);
      toast.success(form.id ? "تم تحديث الموعد" : "تمت إضافة الموعد", saved.title);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر حفظ الموعد.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: AppointmentRecord) {
    if (!window.confirm(`حذف موعد «${record.title}»؟`)) return;
    setBusyId(record.id);
    try {
      const response = await fetch("/api/appointments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذّر حذف الموعد.");
      setAppointments((current) => current.filter((item) => item.id !== record.id));
      toast.success("تم حذف الموعد", record.title);
    } catch (reason) {
      toast.error("لم يتم الحذف", reason instanceof Error ? reason.message : "تعذّر حذف الموعد.");
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(record: AppointmentRecord, status: AppointmentStatus) {
    setBusyId(record.id);
    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذّر تحديث حالة الموعد.");
      const saved = data.appointment as AppointmentRecord;
      setAppointments((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      toast.success("تم تحديث الحالة", appointmentStatusLabels[status]);
    } catch (reason) {
      toast.error("لم يتم التحديث", reason instanceof Error ? reason.message : "تعذّر تحديث الحالة.");
    } finally {
      setBusyId(null);
    }
  }

  const renderEventExtra = (event: CalendarEvent) => {
    const record = byId.get(event.id);
    if (!record) return null;

    const phone = record.customer_phone || customers.find((c) => c.id === record.customer_id)?.phone;
    let waLink = "";
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const formattedPhone = cleanPhone.startsWith("0") ? `20${cleanPhone.slice(1)}` : cleanPhone;
      const msg = `مرحباً ${record.customer_name || "عزيزتنا"}، نذكّرك بموعدك لدى لونيفا (${record.title}) يوم ${record.appointment_date}${record.appointment_time ? ` الساعة ${record.appointment_time}` : ""}. يسعدنا ويشرفنا حضورك!`;
      waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    }

    return (
      <span className="mt-1 flex flex-wrap items-center gap-1">
        <span className="badge badge-muted text-[9px]">{appointmentKindLabels[record.kind]}</span>
        <span className={`badge ${appointmentStatusClass[record.status]} text-[9px]`}>
          {appointmentStatusLabels[record.status]}
        </span>
        {record.customer_id && record.customer_name && (
          <Link href={`/customers/${record.customer_id}`} className="badge badge-brand text-[9px]">
            {record.customer_name}
          </Link>
        )}
        {record.invoice_id && record.invoice_number && (
          <Link href={`/invoices/${record.invoice_id}`} className="badge badge-lav text-[9px]">
            {record.invoice_number}
          </Link>
        )}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="badge text-[9px] text-white flex items-center gap-1 font-bold"
            style={{ background: "#25D366" }}
            title="إرسال تذكير واتساب"
          >
            <MessageCircle size={9} />واتساب
          </a>
        )}
        <button
          type="button"
          onClick={() => openEdit(record)}
          className="badge badge-brand text-[9px]"
          aria-label={`تعديل ${record.title}`}
        >
          <Pencil size={10} />تعديل
        </button>
        <button
          type="button"
          onClick={() => void remove(record)}
          disabled={busyId === record.id}
          className="badge badge-danger text-[9px] disabled:opacity-50"
          aria-label={`حذف ${record.title}`}
        >
          <Trash2 size={10} />حذف
        </button>
      </span>
    );
  };

  return (
    <div className="page-enter">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">متابعة العملاء والتحصيل</p>
          <h1 className="page-title mt-1">المواعيد والمتابعات</h1>
          <p className="page-subtitle mt-2 max-w-xl">
            جدول واحد للمتابعات والتحصيل والتسليم، مرتبط بملفات العميلات والفواتير حتى لا تفوتك خطوة.
          </p>
        </div>
        <button type="button" onClick={openNew} className="btn btn-primary shrink-0 px-4 py-2.5 text-xs">
          <Plus size={15} />موعد جديد
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={CalendarDays} label="مواعيد اليوم" value={stats.today} tone="brand" />
        <StatCard icon={Clock} label="قادمة قيد الانتظار" value={stats.upcoming} tone="lav" />
        <StatCard icon={AlertTriangle} label="متأخرة بلا متابعة" value={stats.overdue} tone="warning" />
      </div>

      <section className="app-card mb-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl p-1" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition"
              style={
                view === "calendar"
                  ? { background: "var(--brand)", color: "#fff" }
                  : { color: "var(--muted)" }
              }
              aria-pressed={view === "calendar"}
            >
              <CalendarDays size={14} />تقويم شهري
            </button>
            <button
              type="button"
              onClick={() => setView("slots")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition"
              style={
                view === "slots"
                  ? { background: "var(--brand)", color: "#fff" }
                  : { color: "var(--muted)" }
              }
              aria-pressed={view === "slots"}
            >
              <Sparkles size={14} />حجز أسبوعي ذكي
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition"
              style={view === "list" ? { background: "var(--brand)", color: "#fff" } : { color: "var(--muted)" }}
              aria-pressed={view === "list"}
            >
              <List size={14} />قائمة
            </button>
          </div>

          <label className="min-w-[130px] flex-[0_1_160px]">
            <span className="sr-only">فلترة حسب الحالة</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | AppointmentStatus)}
              className="field w-full py-2 text-xs"
              aria-label="فلترة حسب الحالة"
            >
              <option value="all">كل الحالات</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{appointmentStatusLabels[status]}</option>
              ))}
            </select>
          </label>

          <label className="min-w-[180px] flex-[1_1_240px]">
            <span className="relative block">
              <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-2)" }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="ابحثي بالعنوان أو العميلة أو الفاتورة"
                aria-label="بحث في المواعيد"
                className="field w-full py-2 pe-9 text-xs"
              />
            </span>
          </label>

          <span className="ms-auto text-[11px] font-bold" style={{ color: "var(--muted-2)" }}>
            {filtered.length.toLocaleString("ar-EG")} موعد
          </span>
        </div>
      </section>

      {view === "calendar" && (
        <section className="app-card p-3 sm:p-5">
          {appointments.length === 0 ? (
            <EmptyState onAdd={openNew} />
          ) : (
            <EventCalendar
              events={events}
              selectedDate={selected}
              onSelectedDateChange={setSelected}
              readOnly
              renderEventExtra={renderEventExtra}
            />
          )}
        </section>
      )}

      {view === "slots" && (
        <section className="app-card p-4 sm:p-6">
          <div
            className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b pb-3"
            style={{ borderColor: "var(--line)" }}
          >
            <div>
              <h3 className="text-sm font-black text-ink">حجز وتوزيع المواعيد الأسبوعي الذكي</h3>
              <p className="text-xs text-muted">
                اختاري الفترة الزمنية المتاحة لتثبيت موعد جديد مباشرة، المواعيد المحجوزة مسبقاً تظهر مظللة مع اسم العميلة.
              </p>
            </div>
            <button type="button" onClick={openNew} className="btn btn-primary text-xs self-start sm:self-auto">
              <Plus size={14} /> موعد مخصص
            </button>
          </div>
          <div className="flex justify-center py-2">
            <SlotWeekPicker
              slots={appointmentSlots}
              onConfirm={handleSlotConfirm}
              slotMinutes={30}
              title="جدول الفترات المتاحة"
            />
          </div>
        </section>
      )}

      {view === "list" && (
        <section className="space-y-3">
          {filtered.length === 0 ? (
            <div className="app-card p-8 text-center">
              <EmptyState onAdd={openNew} />
            </div>
          ) : (
            filtered.map((record) => {
              const KindIcon = kindIcons[record.kind] || CalendarClock;
              const busy = busyId === record.id;
              const phone = record.customer_phone || customers.find((c) => c.id === record.customer_id)?.phone;
              let waLink = "";
              if (phone) {
                const cleanPhone = phone.replace(/[^0-9]/g, "");
                const formattedPhone = cleanPhone.startsWith("0") ? `20${cleanPhone.slice(1)}` : cleanPhone;
                const msg = `مرحباً ${record.customer_name || "عزيزتنا"}، نذكّرك بموعدك لدى لونيفا (${record.title}) يوم ${record.appointment_date}${record.appointment_time ? ` الساعة ${record.appointment_time}` : ""}. يسعدنا ويشرفنا حضورك!`;
                waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
              }

              return (
                <article
                  key={record.id}
                  className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  style={isPastPending(record) ? { borderColor: "color-mix(in srgb, var(--warning) 45%, transparent)" } : undefined}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                      style={{ background: "var(--surface-2)", color: "var(--brand-strong)", border: "1px solid var(--line)" }}
                    >
                      <KindIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>{record.title}</h2>
                        <span className={`badge ${appointmentStatusClass[record.status]} text-[9px]`}>
                          {appointmentStatusLabels[record.status]}
                        </span>
                        <span className="badge badge-muted text-[9px]">{appointmentKindLabels[record.kind]}</span>
                        {isPastPending(record) && <span className="badge badge-warning text-[9px]">متأخر</span>}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold" style={{ color: "var(--muted)" }}>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={12} />
                          {parseAppointmentDate(record.appointment_date).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        {record.appointment_time && (
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Clock size={12} />{record.appointment_time}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ background: toneColor(record.tone) }} />
                          {appointmentToneLabels[record.tone]}
                        </span>
                      </p>
                      {(record.customer_name || record.invoice_number) && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {record.customer_id && record.customer_name && (
                            <Link href={`/customers/${record.customer_id}`} className="badge badge-brand text-[9px]">
                              <UsersRound size={10} />{record.customer_name}
                            </Link>
                          )}
                          {record.invoice_id && record.invoice_number && (
                            <Link href={`/invoices/${record.invoice_id}`} className="badge badge-lav text-[9px]">
                              {record.invoice_number}
                            </Link>
                          )}
                        </p>
                      )}
                      {record.notes && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-6" style={{ color: "var(--muted)" }}>{record.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn px-2.5 py-1.5 text-[10px] font-bold text-white transition active:scale-95 flex items-center gap-1 shadow-sm"
                        style={{ background: "#25D366" }}
                        title="إرسال تذكير واتساب للعميلة"
                      >
                        <MessageCircle size={12} />
                        <span>تذكير واتساب</span>
                      </a>
                    )}
                    {record.status !== "done" && (
                      <button
                        type="button"
                        onClick={() => void setStatus(record, "done")}
                        disabled={busy}
                        className="btn btn-soft px-2.5 py-1.5 text-[10px]"
                      >
                        <CheckCircle2 size={12} />تم
                      </button>
                    )}
                    {record.status === "done" && (
                      <button
                        type="button"
                        onClick={() => void setStatus(record, "pending")}
                        disabled={busy}
                        className="btn btn-soft px-2.5 py-1.5 text-[10px]"
                      >
                        <Clock size={12} />إعادة فتح
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(record)}
                      className="btn btn-outline px-2.5 py-1.5 text-[10px]"
                    >
                      <Pencil size={12} />تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(record)}
                      disabled={busy}
                      className="btn px-2.5 py-1.5 text-[10px]"
                      style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                    >
                      {busy ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      حذف
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Redesigned Animated Modal: Fully responsive, never clipped from bottom */}
      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? "تعديل موعد" : "موعد جديد"}
          >
            {/* Backdrop with blur & fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card with spring animation and fixed scrollable container */}
            <motion.form
              onSubmit={save}
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative z-10 w-full max-w-xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl overflow-hidden"
              style={{
                boxShadow: "0 25px 60px -15px rgba(0,0,0,0.4), 0 0 35px -5px rgba(124,58,237,0.15)",
              }}
            >
              {/* Header (fixed at top of modal) */}
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6 bg-[var(--surface)] shrink-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, var(--brand), #9333ea)" }}
                  >
                    <CalendarClock size={18} />
                  </span>
                  <div>
                    <p className="text-[10px] font-black tracking-wide text-purple-600 dark:text-purple-400">
                      {form.id ? "تعديل موعد" : "موعد جديد"}
                    </p>
                    <h2 className="text-sm font-black text-ink">
                      {form.id ? "تحديث تفاصيل الموعد" : "إضافة موعد للمتابعة والحجز"}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-muted hover:text-ink hover:bg-[var(--surface-2)] transition disabled:opacity-50"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Form Body (flex-1 overflow-y-auto ensures never clipped!) */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
                <label className="block">
                  <span className="block text-xs font-black text-ink mb-1.5">عنوان الموعد / الغرض</span>
                  <input
                    value={form.title}
                    onChange={(event) => setField("title", event.target.value)}
                    required
                    maxLength={180}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    placeholder="متابعة عميلة، جلسة قياس، تحصيل دفعة، تسليم طلب..."
                    autoFocus
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-xs font-black text-ink mb-1.5">التاريخ</span>
                    <input
                      value={form.date}
                      onChange={(event) => setField("date", event.target.value)}
                      type="date"
                      required
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-black text-ink mb-1.5">الوقت (اختياري)</span>
                    <input
                      value={form.time}
                      onChange={(event) => setField("time", event.target.value)}
                      type="time"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-xs font-black text-ink mb-1.5">نوع الموعد</span>
                    <select
                      value={form.kind}
                      onChange={(event) => setField("kind", event.target.value as AppointmentKind)}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    >
                      {APPOINTMENT_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {appointmentKindLabels[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-black text-ink mb-1.5">حالة الموعد</span>
                    <select
                      value={form.status}
                      onChange={(event) => setField("status", event.target.value as AppointmentStatus)}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    >
                      {APPOINTMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {appointmentStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-xs font-black text-ink mb-1.5">العميلة (اختياري)</span>
                    <select
                      value={form.customerId}
                      onChange={(event) => setField("customerId", event.target.value)}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    >
                      <option value="">بدون ربط بعميلة</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.full_name} {customer.phone ? `(${customer.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-black text-ink mb-1.5">الفاتورة المرتبطة (اختياري)</span>
                    <select
                      value={form.invoiceId}
                      onChange={(event) => {
                        const invoiceId = event.target.value;
                        const invoice = invoices.find((item) => item.id === invoiceId);
                        setForm((current) => ({
                          ...current,
                          invoiceId,
                          customerId: invoice?.customer_id ?? current.customerId,
                        }));
                      }}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 transition"
                    >
                      <option value="">بدون ربط بفاتورة</option>
                      {invoices
                        .filter((invoice) => !form.customerId || invoice.customer_id === form.customerId)
                        .map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.invoice_number} · {formatMoney(invoice.total)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <div>
                  <span className="block text-xs font-black text-ink mb-1.5">لون التمييز</span>
                  <div className="flex flex-wrap gap-1.5">
                    {APPOINTMENT_TONES.map((tone) => {
                      const isSelected = form.tone === tone;
                      return (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setField("tone", tone)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition active:scale-95",
                            isSelected
                              ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40"
                              : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink hover:bg-[var(--surface-3)]",
                          )}
                          aria-pressed={isSelected}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: isSelected ? "#fff" : toneColor(tone) }}
                          />
                          {appointmentToneLabels[tone]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="block text-xs font-black text-ink mb-1.5">ملاحظات إضافية</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500 resize-y transition"
                    placeholder="أي تفاصيل خاصة بالمتابعة أو الطلب أو القياسات..."
                  />
                </label>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl p-3 text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                  >
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Footer (fixed at bottom of modal, never clipped!) */}
              <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3.5 sm:px-6 bg-[var(--surface-2)]/60 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[var(--line)] px-4 py-2 text-xs font-bold text-muted hover:text-ink hover:bg-[var(--surface-3)] transition"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: "linear-gradient(135deg, var(--brand), #9333ea)" }}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>{form.id ? "حفظ التعديلات" : "تأكيد وإضافة الموعد"}</span>
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  tone: "brand" | "lav" | "warning";
}) {
  const background = tone === "brand" ? "var(--brand-soft)" : tone === "lav" ? "var(--lav-soft)" : "var(--warning-soft)";
  const color = tone === "brand" ? "var(--brand-strong)" : tone === "lav" ? "var(--lav-strong)" : "var(--warning)";
  return (
    <div className="app-card flex items-center gap-3 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background, color }}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>{label}</p>
        <p className="text-xl font-black leading-tight" style={{ color: "var(--ink)" }}>{value.toLocaleString("ar-EG")}</p>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
        <CalendarDays size={26} />
      </span>
      <div>
        <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>لا توجد مواعيد بعد</p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>أضيفي أول موعد متابعة واربطيه بعميلة أو فاتورة.</p>
      </div>
      <button type="button" onClick={onAdd} className="btn btn-primary px-4 py-2 text-xs">
        <Plus size={14} />إضافة موعد
      </button>
    </div>
  );
}
