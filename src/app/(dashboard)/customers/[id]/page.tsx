import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import DeleteButton from "@/components/delete-button";
import InvoiceCta from "@/components/invoice-cta";
import ZoomableImage from "@/components/zoomable-image";
import CustomerAppointmentScheduler from "@/components/customer-appointment-scheduler";
import { getCustomerAppointments } from "@/lib/appointments";
import {
  appointmentKindLabels,
  appointmentStatusClass,
  appointmentStatusLabels,
  isPastPending,
} from "@/lib/appointment-shared";
import { db, ensureCustomersTable } from "@/lib/db";
import { getCustomerBalance, getCustomerInvoices } from "@/lib/invoice-queries";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { invoiceStatusLabels, type InvoiceStatus } from "@/lib/invoices";

const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  unpaid: "badge-danger",
  partial: "badge-warning",
  paid: "badge-success",
  cancelled: "badge-muted",
};

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureCustomersTable();
  const { id } = await params;

  const result = await db.query(
    "SELECT id, full_name, phone, customer_code, address, image_url, created_at FROM customers WHERE id = $1",
    [id],
  );
  const customer = result.rows[0];
  if (!customer) notFound();

  const phonesResult = await db.query(
    "SELECT phone FROM customer_phones WHERE customer_id = $1 ORDER BY created_at",
    [id],
  );
  const phones: string[] = phonesResult.rows.map((row) => row.phone);
  const extraPhones = phones.filter((phone) => phone !== customer.phone);
  const [invoices, balance, appointments] = await Promise.all([
    getCustomerInvoices(id),
    getCustomerBalance(id),
    getCustomerAppointments(id, 4),
  ]);
  const initials = customer.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Link href="/customers" className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
          <ChevronRight size={16} />كل العملاء
        </Link>
        <div className="flex flex-wrap gap-2">
          <InvoiceCta href={`/invoices/new?customer=${id}`} label="فاتورة جديدة" variant="compact" />
          <Link href={`/customers/${id}/statement`} className="btn btn-soft"><FileText size={16} />كشف الحساب</Link>
          <Link href={`/customers/${id}/edit`} className="btn btn-soft"><Pencil size={16} />تعديل البيانات</Link>
          <DeleteButton endpoint={`/api/customers/${id}`} returnTo="/customers" label="العميلة" />
        </div>
      </div>

      <section className="app-card overflow-hidden">
        <div className="relative h-40" style={{ background: "radial-gradient(circle at 25% 20%, var(--brand) 0, transparent 34%), linear-gradient(115deg, var(--plum), var(--brand-strong))" }}>
          <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full border-[28px] border-white/10" />
        </div>

        <div className="relative px-5 pb-7 sm:px-8">
          <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-5">
              <div
                className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-[2rem] border-4 text-3xl font-extrabold shadow-xl"
                style={{ borderColor: "var(--surface)", background: "var(--brand-soft)", color: "var(--brand-strong)" }}
              >
                {customer.image_url ? (
                  <ZoomableImage src={customer.image_url} alt={customer.full_name} className="h-full w-full" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 pb-1">
                <span className="badge badge-brand mb-2"><Sparkles size={12} />ملف عميلة</span>
                <h1 className="page-title truncate">{customer.full_name}</h1>
                {customer.customer_code && (
                  <p className="mono mt-1 text-xs font-bold" dir="ltr" style={{ color: "var(--muted-2)" }}>
                    {customer.customer_code}
                  </p>
                )}
              </div>
            </div>
            <span className="badge badge-muted self-start sm:self-auto">
              <CalendarDays size={12} />انضمت {formatDate(customer.created_at)}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="panel-muted p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Phone size={18} /></span>
                <span className="badge badge-brand">{phones.length || 1} رقم</span>
              </div>
              <p className="text-[10px] font-extrabold tracking-widest muted-2">أرقام التواصل</p>
              <div className="mt-2 space-y-2">
                <p className="flex items-center gap-2 text-sm font-bold" dir="ltr" style={{ color: "var(--ink)" }}>
                  <Phone size={13} style={{ color: "var(--brand-strong)" }} />{customer.phone}
                </p>
                {extraPhones.map((phone) => (
                  <p key={phone} className="flex items-center gap-2 text-sm" dir="ltr" style={{ color: "var(--muted)" }}>
                    <Phone size={13} />{phone}
                  </p>
                ))}
              </div>
            </div>

            <div className="panel-muted p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><MapPin size={18} /></span>
                <span className="badge badge-lav">العنوان</span>
              </div>
              <p className="text-[10px] font-extrabold tracking-widest muted-2">مكان الإقامة</p>
              <p className="mt-2 text-sm leading-7" style={{ color: customer.address ? "var(--ink)" : "var(--muted-2)" }}>
                {customer.address || "لم يُضف عنوان بعد."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <span className="stat-icon" style={{ background: "var(--surface-3)", color: "var(--muted)" }}><UserRound size={17} /></span>
            <p className="text-xs leading-6 muted">
              يُستخدم كود العميلة <b className="mono" dir="ltr" style={{ color: "var(--ink-soft)" }}>{customer.customer_code || "—"}</b> لربط الطلبات والبكدجات بها تلقائيًا.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "الرصيد المستحق", value: formatMoney(balance.balance), hint: `${formatNumber(balance.overdue_invoices)} فاتورة متأخرة`, icon: Wallet, bg: "var(--danger-soft)", color: "var(--danger)" },
          { label: "إجمالي المحصّل", value: formatMoney(balance.collected), hint: `${formatNumber(balance.invoices)} فاتورة`, icon: ReceiptText, bg: "var(--success-soft)", color: "var(--success)" },
          { label: "المتأخر", value: formatMoney(balance.overdue), hint: "بعد تاريخ الاستحقاق", icon: FileText, bg: "var(--warning-soft)", color: "var(--warning)" },
        ].map(({ label, value, hint, icon: Icon, bg, color }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold muted">{label}</p>
                <p className="money mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon" style={{ background: bg, color }}><Icon size={18} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">المتابعات والجدولة</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>مواعيد العميلة</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomerAppointmentScheduler
              customerId={id}
              customerName={customer.full_name}
              existingAppointments={appointments.map((a) => ({
                appointment_date: a.appointment_date,
                appointment_time: a.appointment_time,
                title: a.title,
              }))}
            />
            <Link
              href={`/appointments?customer=${id}`}
              className="btn btn-soft px-3 py-1.5 text-xs font-bold"
            >
              <Plus size={13} />إضافة موعد يدوي
            </Link>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="app-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--muted)" }}>
              <CalendarClock size={16} />لا توجد مواعيد قادمة لهذه العميلة.
            </p>
            <Link href={`/appointments?customer=${id}`} className="btn btn-soft px-3 py-1.5 text-[11px]">
              <Plus size={13} />جدولة متابعة
            </Link>
          </div>
        ) : (
          <div className="app-card divide-y p-1" style={{ borderColor: "var(--line)" }}>
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-wrap items-center gap-2.5 px-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  <CalendarDays size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-extrabold" style={{ color: "var(--ink)" }}>{appointment.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px]" style={{ color: "var(--muted-2)" }}>
                    <span>{formatDate(appointment.appointment_date)}</span>
                    {appointment.appointment_time && <span dir="ltr">{appointment.appointment_time}</span>}
                    <span className="badge badge-muted text-[9px]">{appointmentKindLabels[appointment.kind]}</span>
                  </p>
                </div>
                {isPastPending(appointment) && <span className="badge badge-warning text-[9px]">متأخر</span>}
                <span className={`badge ${appointmentStatusClass[appointment.status]} text-[9px]`}>
                  {appointmentStatusLabels[appointment.status]}
                </span>
                {appointment.invoice_id && appointment.invoice_number && (
                  <Link href={`/invoices/${appointment.invoice_id}`} className="badge badge-lav text-[9px]">
                    {appointment.invoice_number}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">فواتير العميلة</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>فواتير العميلة</h2>
          </div>
          <Link href="/invoices" className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
            كل الفواتير <ChevronRight size={14} className="rotate-180" />
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="app-card empty-state" style={{ minHeight: "10rem" }}>
            <div>
              <ReceiptText size={26} className="mx-auto mb-2" style={{ color: "var(--muted-2)" }} />
              <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>لا توجد فواتير لهذه العميلة</p>
              <InvoiceCta href={`/invoices/new?customer=${id}`} label="إصدار أول فاتورة" variant="compact" className="mt-3" />
            </div>
          </div>
        ) : (
          <div className="app-card divide-y p-1" style={{ borderColor: "var(--line)" }}>
            {invoices.map((invoice) => {
              const status = invoice.status as InvoiceStatus;
              return (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex flex-wrap items-center gap-2.5 px-3 py-3 transition hover:bg-[var(--surface-2)]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                    <ReceiptText size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mono text-[11px] font-black" dir="ltr" style={{ color: "var(--ink)" }}>{invoice.invoice_number}</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-2)" }}>{formatDate(invoice.created_at)}</p>
                  </div>
                  <div className="text-left">
                    <span className="money text-[12px]" style={{ color: "var(--ink)" }}>{formatMoney(invoice.total)}</span>
                    {Number(invoice.remaining) > 0 && (
                      <p className="text-[9px]" style={{ color: "var(--danger)" }}>متبقي {formatMoney(invoice.remaining)}</p>
                    )}
                  </div>
                  <span className={`badge ${invoiceStatusStyle[status] ?? "badge-muted"} shrink-0`}>{invoiceStatusLabels[status] ?? status}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
