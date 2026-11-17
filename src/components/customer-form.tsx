"use client";

import {
  AlertCircle,
  Camera,
  Check,
  ChevronRight,
  Hash,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import type { Customer } from "@/components/customers-list";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/format";

type CustomerWithPhones = Customer & { phones?: string[] | null };

export default function CustomerForm({ customer }: { customer?: CustomerWithPhones }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(customer);
  const input = useRef<HTMLInputElement>(null);

  const initialExtras = useMemo(
    () => (customer?.phones ?? []).filter((phone) => phone !== customer?.phone),
    [customer],
  );

  const [preview, setPreview] = useState<string | null>(customer?.image_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [extras, setExtras] = useState<string[]>(initialExtras.length ? initialExtras : [""]);
  const [address, setAddress] = useState(customer?.address ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const extraCount = extras.filter((value) => value.trim()).length;
  const totalPhones = phone.trim() ? 1 + extraCount : 0;

  function photo(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected || !selected.type.startsWith("image/") || selected.size > 5 * 1024 * 1024) {
      const message = "اختاري صورة صالحة بحجم لا يتجاوز 5 MB.";
      setError(message);
      toast.error("صورة غير صالحة", message);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  }

  function updateExtra(index: number, value: string) {
    setExtras((items) => items.map((item, i) => (i === index ? value : item)));
  }

  function addExtra() {
    setExtras((items) => [...items, ""]);
  }

  function removeExtra(index: number) {
    setExtras((items) => (items.length === 1 ? [""] : items.filter((_, i) => i !== index)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const toastId = toast.loading(
      "جارِ الحفظ...",
      editing ? "بنحدّث بيانات العميلة." : "بنضيف ملف العميلة الجديد.",
    );
    try {
      const form = new FormData(event.currentTarget);
      const fullName = String(form.get("fullName") ?? "").trim();
      const primaryPhone = String(form.get("phone") ?? "").trim();
      const morePhones = extras.map((value) => value.trim()).filter(Boolean);

      if (!fullName) throw new Error("أدخلي اسم العميلة.");
      if (!primaryPhone) throw new Error("أدخلي رقم الهاتف الأساسي.");
      if ([primaryPhone, ...morePhones].some((value) => value.length > 32)) {
        throw new Error("رقم الهاتف طويل جدًا.");
      }
      if (new Set([primaryPhone, ...morePhones]).size !== 1 + morePhones.length) {
        throw new Error("لا يمكن تكرار نفس رقم الهاتف.");
      }

      const data = new FormData();
      data.set("fullName", fullName);
      data.set("phone", primaryPhone);
      data.set("morePhones", morePhones.join("\n"));
      data.set("address", address.trim());
      if (file) data.set("photo", file);

      const response = await fetch(editing ? `/api/customers/${customer?.id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        body: data,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر حفظ البيانات.");

      toast.update(toastId, {
        tone: "success",
        title: editing ? "تم حفظ بيانات العميلة" : "تمت إضافة العميلة بنجاح",
        description: "جارِ فتح ملف العميلة...",
      });
      router.push(`/customers/${body.customer.id}`);
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "تعذر حفظ البيانات.";
      setError(message);
      setSaving(false);
      toast.update(toastId, { tone: "error", title: "تعذر حفظ البيانات", description: message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const initials = (customer?.full_name ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Sticky action bar */}
      <div
        className="sticky top-2 z-30 mb-5 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-xl sm:top-3"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:gap-3 sm:px-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:bg-[var(--surface-3)]"
              style={{ color: "var(--brand-strong)", border: "1px solid var(--line)" }}
              aria-label="العودة للعملاء"
              title="العودة"
            >
              <ChevronRight size={17} />
            </button>
            <span className="hidden h-8 w-px sm:block" style={{ background: "var(--line)" }} />
            <div className="min-w-0">
              <p className="text-[9px] font-black tracking-[0.18em]" style={{ color: "var(--brand-strong)" }}>
                LUNIVA CLIENTS
              </p>
              <h1 className="truncate text-sm font-extrabold leading-5 sm:text-base" style={{ color: "var(--ink)" }}>
                {editing ? "تعديل بيانات العميلة" : "إضافة عميلة جديدة"}
              </h1>
            </div>
            <span
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:inline-flex"
              style={{
                background: saving ? "var(--lav-soft)" : "var(--success-soft)",
                color: saving ? "var(--lav-strong)" : "var(--success)",
              }}
            >
              {saving ? <LoaderCircle size={11} className="animate-spin" /> : <Check size={11} />}
              {saving ? "جارِ الحفظ" : "جاهز للحفظ"}
            </span>
          </div>

          <div className="flex shrink-0 justify-end gap-2 sm:flex-none">
            <Link href="/customers" className="btn btn-outline px-3 py-2 text-xs">إلغاء</Link>
            <button form="customer-form" disabled={saving} className="btn btn-primary px-3 py-2 text-xs sm:px-4">
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة العميلة"}
            </button>
          </div>
        </div>
        {saving && (
          <span className="saving-progress block h-0.5 w-full" style={{ background: "linear-gradient(90deg, var(--brand), var(--lav), var(--brand))" }} />
        )}
      </div>

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Luniva client book</p>
          <h2 className="page-title mt-1">{editing ? customer?.full_name || "تعديل العميلة" : "عميلة جديدة"}</h2>
          <p className="page-subtitle mt-1.5 max-w-2xl">
            أضيفي الاسم وأرقام التواصل والعنوان لبناء ملف عميلة متكامل.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-brand"><Phone size={12} />{totalPhones} رقم</span>
          {customer?.customer_code && (
            <span className="mono badge badge-muted" dir="ltr">{customer.customer_code}</span>
          )}
        </div>
      </div>

      {error && (
        <div
          className="mb-5 flex items-start gap-3 rounded-2xl p-4 text-sm font-bold"
          style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)" }}
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="customer-form" onSubmit={submit} aria-busy={saving} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className="app-card p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><UserRound size={20} /></span>
              <div>
                <h3 className="section-title">البيانات الأساسية</h3>
                <p className="mt-0.5 text-xs muted">الاسم والصورة الشخصية.</p>
              </div>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl font-extrabold transition hover:brightness-95"
                style={{ background: "var(--brand-soft)", border: "1px dashed var(--brand)", color: "var(--brand-strong)" }}
              >
                {preview ? <img src={preview} alt="معاينة العميلة" className="h-full w-full object-cover" /> : initials || <Camera size={26} />}
                <span className="absolute bottom-1 left-1 grid h-7 w-7 place-items-center rounded-full shadow-sm" style={{ background: "var(--brand-strong)", color: "#fff" }}>
                  <Camera size={13} />
                </span>
              </button>
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} className="hidden" />
              <label className="flex-1">
                <span className="field-label">الاسم الكامل</span>
                <input required name="fullName" defaultValue={customer?.full_name} placeholder="مثال: نور أحمد" maxLength={160} className="field" />
                <span className="field-hint">صورة العميلة اختيارية ويمكن تكبيرها من ملفها لاحقًا.</span>
              </label>
            </div>

            {editing && customer?.customer_code && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <span className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--ink-soft)" }}><Hash size={14} />كود العميلة</span>
                <span className="mono text-sm font-extrabold" dir="ltr" style={{ color: "var(--brand-strong)" }}>{customer.customer_code}</span>
              </div>
            )}
          </section>

          <section className="app-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-3">
                <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Phone size={20} /></span>
                <div>
                  <h3 className="section-title">أرقام التواصل</h3>
                  <p className="mt-0.5 text-xs muted">رقم أساسي وأرقام إضافية اختيارية.</p>
                </div>
              </div>
              <button type="button" onClick={addExtra} className="btn btn-lav"><Plus size={16} />إضافة رقم</button>
            </div>

            <div className="space-y-3 p-3 sm:p-5">
              <label>
                <span className="field-label">رقم الهاتف الأساسي</span>
                <input
                  required
                  name="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={32}
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  className="field text-left placeholder:text-right"
                />
              </label>

              {extras.map((value, index) => (
                <div key={index} className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className="field-label">رقم إضافي {index + 1}</span>
                    <input
                      value={value}
                      onChange={(event) => updateExtra(index, event.target.value)}
                      maxLength={32}
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                      className="field text-left placeholder:text-right"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeExtra(index)}
                    className="btn btn-outline h-[42px] px-3 text-xs"
                    title="حذف الرقم"
                    aria-label="حذف الرقم"
                  >
                    <Trash2 size={15} />حذف
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="app-card p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><MapPin size={20} /></span>
              <div>
                <h3 className="section-title">العنوان</h3>
                <p className="mt-0.5 text-xs muted">اختياري، يساعد في تنظيم التوصيل.</p>
              </div>
            </div>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={500}
              placeholder="المدينة، الشارع، رقم المبنى..."
              className="field min-h-24 resize-y"
            />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="app-card overflow-hidden">
            <div className="p-5" style={{ background: "linear-gradient(135deg, var(--brand-strong), var(--plum))", color: "#fff" }}>
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-widest text-white/70"><Sparkles size={13} />CLIENT PROFILE</div>
              <p className="mt-2 truncate text-lg font-extrabold">{customer?.full_name || "عميلة جديدة"}</p>
              <p className="mono mt-1 text-[11px] text-white/65" dir="ltr">{customer?.customer_code || "LNV-C-…"}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="badge badge-dark"><Phone size={11} />{totalPhones} رقم</span>
                {address.trim() && <span className="badge badge-dark"><MapPin size={11} />عنوان مسجل</span>}
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="muted">عدد الأرقام</span>
                <b style={{ color: "var(--ink)" }}>{totalPhones}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">تاريخ الانضمام</span>
                <b style={{ color: "var(--ink)" }}>{customer?.created_at ? formatDate(customer.created_at) : "اليوم"}</b>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="muted">حالة العنوان</span>
                <b style={{ color: address.trim() ? "var(--success)" : "var(--muted-2)" }}>{address.trim() ? "مسجل" : "غير مسجل"}</b>
              </div>

              <div className="divider" />

              <div className="rounded-xl p-3 text-[11px] leading-6" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                <p className="flex items-center gap-1.5 font-extrabold" style={{ color: "var(--ink-soft)" }}><Hash size={13} />كود تلقائي</p>
                <p className="mt-1">يُنشئ النظام كود عميلة فريدًا تلقائيًا عند الحفظ لتسهيل الربط مع البكدجات والطلبات.</p>
              </div>

              <button disabled={saving} className="btn btn-primary w-full">
                {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
                {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة العميلة"}
              </button>
              <Link href="/customers" className="btn btn-outline w-full">إلغاء</Link>
            </div>
          </section>
        </aside>
      </form>
    </>
  );
}
