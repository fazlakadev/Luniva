import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Send,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import DeleteButton from "@/components/delete-button";
import InvoiceCta from "@/components/invoice-cta";
import ZoomableImage from "@/components/zoomable-image";
import CustomerAppointmentScheduler from "@/components/customer-appointment-scheduler";
import CustomerWhatsAppBox from "@/components/customer-whatsapp-box";
import CustomerLiveChat from "@/components/customer-live-chat";
import { getCustomerAppointments } from "@/lib/appointments";
import {
  appointmentKindLabels,
  appointmentStatusClass,
  appointmentStatusLabels,
  isPastPending,
} from "@/lib/appointment-shared";
import { db, ensureCustomersTable, ensureWhatsAppTables } from "@/lib/db";
import { getCustomerBalance, getCustomerInvoices } from "@/lib/invoice-queries";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { invoiceStatusLabels, type InvoiceStatus } from "@/lib/invoices";
import { formatWhatsAppPhone, generateWhatsAppUrl } from "@/lib/whatsapp-shared";

export const dynamic = "force-dynamic";

const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  unpaid: "badge-danger",
  partial: "badge-warning",
  paid: "badge-success",
  cancelled: "badge-muted",
};

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await Promise.all([ensureCustomersTable(), ensureWhatsAppTables()]);
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
  if (!phones.includes(customer.phone) && customer.phone) {
    phones.unshift(customer.phone);
  }
  const extraPhones = phones.filter((p) => p !== customer.phone);

  const [invoices, balance, appointments, logsResult] = await Promise.all([
    getCustomerInvoices(id),
    getCustomerBalance(id),
    getCustomerAppointments(id, 8),
    db.query(
      `SELECT id, message, template_category, created_at::text, sent_by
       FROM whatsapp_logs
       WHERE customer_id = $1 OR phone = $2
       ORDER BY created_at DESC LIMIT 10`,
      [id, formatWhatsAppPhone(customer.phone)],
    ),
  ]);

  const initials = customer.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase();

  const isVip = Number(balance.billed || 0) >= 4000;
  const nextApp = appointments[0]
    ? {
        date: formatDate(appointments[0].appointment_date),
        time: appointments[0].appointment_time,
        title: appointments[0].title,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-xs font-extrabold"
          style={{ color: "var(--brand-strong)" }}
        >
          <ChevronRight size={16} />
          كل العملاء
        </Link>
        <div className="flex flex-wrap gap-2">
          <InvoiceCta href={`/invoices/new?customer=${id}`} label="فاتورة جديدة" variant="compact" />
          <Link href={`/customers/${id}/statement`} className="btn btn-soft">
            <FileText size={16} />
            كشف الحساب
          </Link>
          <Link href={`/customers/${id}/edit`} className="btn btn-soft">
            <Pencil size={16} />
            تعديل البيانات
          </Link>
          <DeleteButton endpoint={`/api/customers/${id}`} returnTo="/customers" label="العميلة" />
        </div>
      </div>

      {/* Customer Profile Banner */}
      <section className="app-card overflow-hidden">
        <div
          className="relative h-44"
          style={{
            background:
              "radial-gradient(circle at 25% 20%, var(--brand) 0, transparent 34%), linear-gradient(115deg, var(--plum), var(--brand-strong))",
          }}
        >
          <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full border-[28px] border-white/10" />
        </div>

        <div className="relative px-5 pb-7 sm:px-8">
          <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-5">
              <div
                className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-[2rem] border-4 text-3xl font-extrabold shadow-xl"
                style={{
                  borderColor: "var(--surface)",
                  background: "var(--brand-soft)",
                  color: "var(--brand-strong)",
                }}
              >
                {customer.image_url ? (
                  <ZoomableImage src={customer.image_url} alt={customer.full_name} className="h-full w-full" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="badge badge-brand">
                    <Sparkles size={12} />
                    ملف عميلة
                  </span>
                  {isVip && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                      عميلة VIP متميزة ✨
                    </span>
                  )}
                </div>
                <h1 className="page-title truncate">{customer.full_name}</h1>
                {customer.customer_code && (
                  <p className="mono mt-1 text-xs font-bold" dir="ltr" style={{ color: "var(--muted-2)" }}>
                    {customer.customer_code}
                  </p>
                )}
              </div>
            </div>
            <span className="badge badge-muted self-start sm:self-auto">
              <CalendarDays size={12} />
              انضمت {formatDate(customer.created_at)}
            </span>
          </div>

          {/* Quick Info Grid */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {/* Phone & Direct WhatsApp Actions */}
            <div className="panel-muted p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  <Phone size={18} />
                </span>
                <span className="badge badge-brand">{phones.length || 1} أرقام مسجلة</span>
              </div>
              <p className="text-[10px] font-extrabold tracking-widest muted-2">أرقام التواصل والمحادثة</p>
              <div className="mt-2 space-y-2">
                {phones.map((phone, idx) => {
                  const clean = formatWhatsAppPhone(phone);
                  const waUrl = generateWhatsAppUrl(clean, `مرحباً أستاذة ${customer.full_name} 🌸`);
                  return (
                    <div key={phone} className="flex items-center justify-between gap-2 text-sm font-bold">
                      <div className="flex items-center gap-2" dir="ltr" style={{ color: "var(--ink)" }}>
                        <Phone size={13} style={{ color: "var(--brand-strong)" }} />
                        <span>{phone}</span>
                        {idx === 0 && <span className="text-[10px] text-muted font-normal">(رئيسي)</span>}
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366] hover:text-white transition"
                        title="محادثة واتساب مباشرة"
                      >
                        <MessageSquare size={12} />
                        واتساب
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Address */}
            <div className="panel-muted p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                  <MapPin size={18} />
                </span>
                <span className="badge badge-lav">العنوان وموقع التوصيل</span>
              </div>
              <p className="text-[10px] font-extrabold tracking-widest muted-2">مكان الإقامة</p>
              <p className="mt-2 text-sm leading-7" style={{ color: customer.address ? "var(--ink)" : "var(--muted-2)" }}>
                {customer.address || "لم يُضف عنوان بعد."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Financial KPIs */}
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          {
            label: "إجمالي المشتريات",
            value: formatMoney(balance.billed),
            hint: `${formatNumber(balance.invoices)} فواتير صادرة`,
            icon: TrendingUp,
            bg: "var(--brand-soft)",
            color: "var(--brand-strong)",
          },
          {
            label: "الرصيد المستحق",
            value: formatMoney(balance.balance),
            hint: balance.balance > 0 ? "يوجد رصيد مطلوب سداده" : "الحساب خالص تماماً ✓",
            icon: Wallet,
            bg: balance.balance > 0 ? "var(--danger-soft)" : "var(--success-soft)",
            color: balance.balance > 0 ? "var(--danger)" : "var(--success)",
          },
          {
            label: "إجمالي المحصّل",
            value: formatMoney(balance.collected),
            hint: "مدفوعات مؤكدة",
            icon: ReceiptText,
            bg: "var(--success-soft)",
            color: "var(--success)",
          },
          {
            label: "المتأخر بعد الاستحقاق",
            value: formatMoney(balance.overdue),
            hint: `${formatNumber(balance.overdue_invoices)} فاتورة متأخرة`,
            icon: FileText,
            bg: "var(--warning-soft)",
            color: "var(--warning)",
          },
        ].map(({ label, value, hint, icon: Icon, bg, color }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold muted">{label}</p>
                <p className="money mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>
                  {value}
                </p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon" style={{ background: bg, color }}>
                <Icon size={18} />
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* WHATSAPP AUTOMATION & MESSAGING SECTION */}
      {/* REAL-TIME WHATSAPP LIVE CONVERSATION (BAILEYS ENGINE) */}
      {customer.phone && (
        <CustomerLiveChat
          customerId={customer.id}
          customerName={customer.full_name}
          customerPhone={customer.phone}
          customerCode={customer.customer_code}
          customerBalance={Number(balance.balance || 0)}
          customerImageUrl={customer.image_url}
        />
      )}

      {/* APPOINTMENTS & SCHEDULING (UNIFIED & DEVELOPED) */}
      <section className="app-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--line)" }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <CalendarDays size={18} />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
                  مواعيد ومتابعات العميلة ({appointments.length})
                </h2>
                <p className="text-[11px] font-bold muted">
                  بروفات القياس، استشارات التفصيل، ومواعيد الاستلام والتسليم
                </p>
              </div>
            </div>
          </div>

          {/* Unified scheduler button combining visual slots and manual booking */}
          <CustomerAppointmentScheduler
            customerId={id}
            customerName={customer.full_name}
            customerPhone={customer.phone}
            existingAppointments={appointments.map((a) => ({
              appointment_date: a.appointment_date,
              appointment_time: a.appointment_time,
              title: a.title,
            }))}
            invoices={invoices.map((inv) => ({
              id: inv.id,
              invoice_number: inv.invoice_number,
            }))}
          />
        </div>

        {appointments.length === 0 ? (
          <div className="empty-state p-8 text-center" style={{ minHeight: "8rem" }}>
            <CalendarClock size={28} className="mx-auto mb-2 text-muted" />
            <p className="text-xs font-bold text-muted">لا توجد مواعيد قادمة مجدولة لهذه العميلة حالياً.</p>
            <p className="text-[11px] text-muted-2 mt-1">
              يمكنكِ الضغط على زر &quot;حجز موعد ومتابعة للعميلة&quot; أعلاه لجدولة بروفة أو استلام.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-2xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {appointments.map((appointment) => {
              const appDate = formatDate(appointment.appointment_date);
              const cleanPhone = formatWhatsAppPhone(customer.phone);
              const reminderMsg = `مرحباً أستاذة ${customer.full_name} 🌸\nنذكركِ بموعدكِ القادم في لونيفا فاشون:\n✨ "${appointment.title}"\n📅 التاريخ: ${appDate}${
                appointment.appointment_time ? ` الساعة ${appointment.appointment_time}` : ""
              }\n\nنتشرف بحضوركِ ويسعدنا دائماً خدمتكِ! 👗`;
              const reminderUrl = generateWhatsAppUrl(cleanPhone, reminderMsg);

              return (
                <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-2)] transition">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-xs"
                      style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                    >
                      <CalendarDays size={18} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-ink">{appointment.title}</p>
                        <span className={`badge ${appointmentStatusClass[appointment.status]} text-[9px]`}>
                          {appointmentStatusLabels[appointment.status]}
                        </span>
                        {isPastPending(appointment) && (
                          <span className="badge badge-warning text-[9px]">متأخر</span>
                        )}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] muted">
                        <span>{appDate}</span>
                        {appointment.appointment_time && (
                          <span dir="ltr" className="font-mono">
                            {appointment.appointment_time}
                          </span>
                        )}
                        <span>•</span>
                        <span className="badge badge-muted text-[9px]">
                          {appointmentKindLabels[appointment.kind] || appointment.kind}
                        </span>
                        {appointment.invoice_number && (
                          <Link
                            href={`/invoices/${appointment.invoice_id}`}
                            className="badge badge-lav text-[9px] hover:underline"
                          >
                            فاتورة {appointment.invoice_number}
                          </Link>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click WhatsApp Reminder for this specific appointment */}
                  <a
                    href={reminderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366] hover:text-white transition shadow-xs"
                    title="إرسال تذكير بالموعد عبر واتساب"
                  >
                    <Send size={12} />
                    تذكير بالموعد عبر واتساب
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CUSTOMER INVOICES & ORDERS */}
      <section className="app-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-2">
            <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
              <ReceiptText size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
                فواتير وطلبات العميلة ({invoices.length})
              </h2>
              <p className="text-[11px] font-bold muted">سجل الفواتير والمبالغ المسددة والمتبقية</p>
            </div>
          </div>
          <Link
            href={`/invoices/new?customer=${id}`}
            className="btn btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1"
          >
            <Plus size={13} />
            فاتورة جديدة
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="empty-state p-8 text-center" style={{ minHeight: "8rem" }}>
            <ReceiptText size={28} className="mx-auto mb-2 text-muted" />
            <p className="text-xs font-bold text-muted">لا توجد فواتير مسجلة لهذه العميلة بعد.</p>
            <InvoiceCta
              href={`/invoices/new?customer=${id}`}
              label="إصدار أول فاتورة"
              variant="compact"
              className="mt-3 inline-block"
            />
          </div>
        ) : (
          <div className="divide-y rounded-2xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {invoices.map((invoice) => {
              const status = invoice.status as InvoiceStatus;
              const cleanPhone = formatWhatsAppPhone(customer.phone);
              const invMsg = `مرحباً بكِ أستاذة ${customer.full_name} ✨\nنحيطكِ علماً ببيانات فاتورتكِ رقم ${invoice.invoice_number} من لونيفا فاشون:\nالإجمالي: ${formatMoney(invoice.total)}\nالمتبقي: ${formatMoney(invoice.remaining)}\nشكراً لاختياركِ لنا! 🌸`;
              const waInvUrl = generateWhatsAppUrl(cleanPhone, invMsg);

              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-2)] transition"
                >
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                      style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                    >
                      <ReceiptText size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="mono text-xs font-black group-hover:underline"
                          dir="ltr"
                          style={{ color: "var(--brand-strong)" }}
                        >
                          {invoice.invoice_number}
                        </p>
                        <span className={`badge ${invoiceStatusStyle[status] ?? "badge-muted"} text-[9px]`}>
                          {invoiceStatusLabels[status] ?? status}
                        </span>
                      </div>
                      <p className="text-[10px] muted mt-0.5">{formatDate(invoice.created_at)}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <span className="money text-xs font-black text-ink">{formatMoney(invoice.total)}</span>
                      {Number(invoice.remaining) > 0 ? (
                        <p className="text-[9px] font-bold text-rose-600">
                          متبقي {formatMoney(invoice.remaining)}
                        </p>
                      ) : (
                        <p className="text-[9px] font-bold text-emerald-600">خالصة بالكامل ✓</p>
                      )}
                    </div>

                    <a
                      href={waInvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366] hover:text-white transition"
                      title="إرسال بيانات الفاتورة عبر واتساب"
                    >
                      <MessageSquare size={12} />
                      مشاركة
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
