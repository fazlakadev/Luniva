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
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import EventCalendar, { type CalendarEvent } from "@/components/ui/event-calendar";
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

type CustomerOption = { id: string; full_name: string };
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

const kindIcons = {
  followup: UsersRound,
  payment: Wallet,
  delivery: Truck,
  meeting: CalendarClock,
} as const;

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
  const [view, setView] = useState<"calendar" | "list">("calendar");
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
              <CalendarDays size={14} />تقويم
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

      {view === "calendar" ? (
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
      ) : (
        <section className="space-y-3">
          {filtered.length === 0 ? (
            <div className="app-card p-8 text-center">
              <EmptyState onAdd={openNew} />
            </div>
          ) : (
            filtered.map((record) => {
              const KindIcon = kindIcons[record.kind];
              const busy = busyId === record.id;
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

      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
          style={{ background: "rgba(20, 12, 17, 0.55)", backdropFilter: "blur(3px)" }}
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? "تعديل موعد" : "موعد جديد"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form
            onSubmit={save}
            className="page-enter my-auto w-full max-w-xl rounded-2xl border p-5 shadow-2xl sm:p-6"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{form.id ? "تعديل موعد" : "موعد جديد"}</p>
                <h2 className="section-title mt-1">{form.id ? "تحديث تفاصيل الموعد" : "إضافة موعد للمتابعة"}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-[var(--surface-3)] disabled:opacity-50"
                style={{ color: "var(--muted)" }}
                aria-label="إغلاق"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="field-label">عنوان الموعد</span>
                <input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  required
                  maxLength={180}
                  className="field"
                  placeholder="متابعة عميلة، تحصيل دفعة، تسليم طلب..."
                  autoFocus
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">التاريخ</span>
                  <input
                    value={form.date}
                    onChange={(event) => setField("date", event.target.value)}
                    type="date"
                    required
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="field-label">الوقت (اختياري)</span>
                  <input
                    value={form.time}
                    onChange={(event) => setField("time", event.target.value)}
                    type="time"
                    className="field"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">النوع</span>
                  <select
                    value={form.kind}
                    onChange={(event) => setField("kind", event.target.value as AppointmentKind)}
                    className="field"
                  >
                    {APPOINTMENT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>{appointmentKindLabels[kind]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">الحالة</span>
                  <select
                    value={form.status}
                    onChange={(event) => setField("status", event.target.value as AppointmentStatus)}
                    className="field"
                  >
                    {APPOINTMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>{appointmentStatusLabels[status]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">العميلة (اختياري)</span>
                  <select
                    value={form.customerId}
                    onChange={(event) => setField("customerId", event.target.value)}
                    className="field"
                  >
                    <option value="">بدون ربط</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">الفاتورة (اختياري)</span>
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
                    className="field"
                  >
                    <option value="">بدون ربط</option>
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
                <span className="field-label">لون التمييز</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {APPOINTMENT_TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setField("tone", tone)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold transition"
                      style={{
                        background: form.tone === tone ? "var(--brand-soft)" : "var(--surface-2)",
                        color: form.tone === tone ? "var(--brand-strong)" : "var(--muted)",
                        border: `1px solid ${form.tone === tone ? "var(--brand)" : "var(--line)"}`,
                      }}
                      aria-pressed={form.tone === tone}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: toneColor(tone) }}
                      />
                      {appointmentToneLabels[tone]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="field-label">ملاحظات (اختياري)</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="field resize-y"
                  placeholder="تفاصيل المتابعة أو المبلغ المطلوب..."
                />
              </label>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold leading-6"
                  style={{
                    background: "var(--danger-soft)",
                    color: "var(--danger)",
                    border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
                  }}
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={closeModal} disabled={saving} className="btn btn-outline px-4 py-2.5 text-xs">
                إلغاء
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary px-4 py-2.5 text-xs">
                {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {form.id ? "حفظ التعديلات" : "إضافة الموعد"}
              </button>
            </div>
          </form>
        </div>
      )}
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
