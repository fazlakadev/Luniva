"use client";

import {
  AlertCircle,
  BadgePercent,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/client-response";
import { optimizeImage } from "@/lib/image-client";
import { formatMoney, formatNumber } from "@/lib/format";
import { COLOR_SUGGESTIONS, canonicalColorName } from "@/lib/colors";
import ColorField from "@/components/color-field";
import FolderUpload from "@/components/folder-upload";
import { useToast } from "@/components/toast";
import {
  applyDiscount,
  DISCOUNT_TYPES,
  discountPercent,
  discountTypeLabels,
  roundMoney,
  type DiscountType,
} from "@/lib/packages";

export type ProductDetail = {
  id: string;
  name: string;
  primary_sku: string;
  description: string | null;
  image_url?: string | null;
  variants: {
    id?: string;
    color: string;
    size: string;
    sku: string;
    price: string | number;
    price_before_discount?: string | number | null;
    discount_type?: string | null;
    discount_value?: string | number | null;
    image_url?: string | null;
    supplier_id?: string | null;
    supply_price?: string | number | null;
    stock?: number;
    min_stock_alert?: number;
  }[];
};

type SupplierOption = { id: string; name: string };

type VariantState = {
  id?: string;
  color: string;
  size: string;
  sku: string;
  beforePrice: string;
  discountType: DiscountType;
  discountValue: string;
  supplierId: string;
  supplyPrice: string;
  stock: string;
  minStockAlert: string;
  imageUrl: string | null;
  file: File | null;
  preview: string | null;
};

function blankVariant(): VariantState {
  return {
    color: "",
    size: "",
    sku: "",
    beforePrice: "",
    discountType: "percent",
    discountValue: "0",
    supplierId: "",
    supplyPrice: "0",
    stock: "10",
    minStockAlert: "3",
    imageUrl: null,
    file: null,
    preview: null,
  };
}

function initialVariant(item: NonNullable<ProductDetail["variants"]>[number]): VariantState {
  const before = Number(item.price_before_discount ?? item.price ?? 0);
  const after = Number(item.price ?? 0);
  const discountType: DiscountType = item.discount_type === "amount" ? "amount" : "percent";
  let discountValue = Number(item.discount_value ?? 0);
  if (!item.discount_value && before > after) {
    discountValue = discountType === "percent" ? discountPercent(before, after) : roundMoney(before - after);
  }
  return {
    id: item.id,
    color: item.color,
    size: item.size,
    sku: item.sku,
    beforePrice: String(before),
    discountType,
    discountValue: String(discountValue),
    supplierId: item.supplier_id ?? "",
    supplyPrice: String(Number(item.supply_price ?? 0)),
    stock: String(Number(item.stock ?? 0)),
    minStockAlert: String(Number(item.min_stock_alert ?? 3)),
    imageUrl: item.image_url ?? null,
    file: null,
    preview: item.image_url ?? null,
  };
}

export default function ProductForm({ product }: { product?: ProductDetail }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(product);
  const input = useRef<HTMLInputElement>(null);

  const [mainPreview, setMainPreview] = useState<string | null>(product?.image_url ?? null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<VariantState[]>(() =>
    product?.variants?.length ? product.variants.map(initialVariant) : [blankVariant()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/suppliers")
      .then((response) => readJson<{ suppliers: SupplierOption[] }>(response))
      .then((data) => {
        if (active) setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
      })
      .catch(() => {
        if (active) setSuppliers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function validImage(file?: File) {
    return Boolean(file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);
  }

  async function chooseMain(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!validImage(file)) {
      const message = "اختاري صورة صالحة بحجم لا يتجاوز 5 MB.";
      setError(message);
      toast.error("صورة غير صالحة", message);
      return;
    }
    const optimized = await optimizeImage(file!);
    setMainFile(optimized);
    setMainPreview(URL.createObjectURL(optimized));
    setError("");
  }

  async function chooseVariant(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!validImage(file)) {
      const message = "اختاري صورة صالحة بحجم لا يتجاوز 5 MB.";
      setError(message);
      toast.error("صورة غير صالحة", message);
      return;
    }
    const optimized = await optimizeImage(file!);
    const preview = URL.createObjectURL(optimized);
    setVariants((items) =>
      items.map((item, i) => (i === index ? { ...item, file: optimized, preview } : item)),
    );
    setError("");
  }

  function update(index: number, patch: Partial<VariantState>) {
    setVariants((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addVariant() {
    setVariants((items) => [...items, blankVariant()]);
  }

  function removeVariant(index: number) {
    if (variants.length === 1) return;
    setVariants((items) => items.filter((_, i) => i !== index));
  }

  function afterPrice(variant: VariantState) {
    const before = Math.max(0, Number(variant.beforePrice) || 0);
    return applyDiscount(before, variant.discountType, Number(variant.discountValue) || 0);
  }

  const summary = useMemo(() => {
    const priced = variants
      .map((variant) => {
        const before = Math.max(0, Number(variant.beforePrice) || 0);
        return { before, after: afterPrice(variant) };
      })
      .filter((entry) => entry.before > 0);
    return {
      count: variants.length,
      minPrice: priced.length ? Math.min(...priced.map((entry) => entry.after)) : 0,
      maxPrice: priced.length ? Math.max(...priced.map((entry) => entry.after)) : 0,
      maxDiscount: priced.reduce((best, entry) => Math.max(best, discountPercent(entry.before, entry.after)), 0),
      totalSaving: priced.reduce((sum, entry) => sum + Math.max(0, entry.before - entry.after), 0),
      totalCost: roundMoney(variants.reduce((sum, item) => sum + Math.max(0, Number(item.supplyPrice) || 0), 0)),
      totalStock: variants.reduce((sum, item) => sum + Math.max(0, Math.trunc(Number(item.stock) || 0)), 0),
      potentialProfit: roundMoney(
        variants.reduce((sum, item) => sum + afterPrice(item) - Math.max(0, Number(item.supplyPrice) || 0), 0),
      ),
    };
  }, [variants]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const toastId = toast.loading(
      "جارِ الحفظ...",
      editing ? "بنحدّث بيانات المنتج والمتغيرات." : "بنضيف المنتج للكتالوج.",
    );
    try {
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      const primarySku = String(form.get("primarySku") ?? "").trim().toUpperCase();
      const description = String(form.get("description") ?? "").trim();

      if (!name) throw new Error("أدخلي اسم المنتج.");
      if (!primarySku) throw new Error("أدخلي الكود الرئيسي للمنتج.");
      if (variants.some((variant) => !variant.color.trim() || !variant.size.trim() || !variant.sku.trim())) {
        throw new Error("أكملي اللون والمقاس والكود لكل متغير.");
      }

      const codes = new Set<string>([primarySku]);
      const combinations = new Set<string>();
      for (const [index, variant] of variants.entries()) {
        const sku = variant.sku.trim().toUpperCase();
        if (codes.has(sku)) throw new Error(`الكود «${sku}» مستخدم أكثر من مرة.`);
        codes.add(sku);
        const combination = `${variant.color.trim().toLowerCase()}|${variant.size.trim().toLowerCase()}`;
        if (combinations.has(combination)) throw new Error(`اللون والمقاس مكرران في المتغير رقم ${index + 1}.`);
        combinations.add(combination);
        if (variant.discountType === "percent" && Number(variant.discountValue) > 100) {
          throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%.");
        }
      }

      const payload = {
        name,
        primarySku,
        description,
        variants: variants.map((variant) => ({
          id: variant.id,
          color: canonicalColorName(variant.color) || variant.color.trim(),
          size: variant.size.trim(),
          sku: variant.sku.trim().toUpperCase(),
          beforePrice: Math.max(0, Number(variant.beforePrice) || 0),
          price: afterPrice(variant),
          discountType: variant.discountType,
          discountValue: Math.max(0, Number(variant.discountValue) || 0),
          supplierId: variant.supplierId || null,
          supplyPrice: Math.max(0, Number(variant.supplyPrice) || 0),
          stock: Math.max(0, Math.trunc(Number(variant.stock) || 0)),
          minStockAlert: Math.max(0, Math.trunc(Number(variant.minStockAlert) || 3)),
          imageUrl: variant.imageUrl,
        })),
      };

      const data = new FormData();
      data.append("payload", JSON.stringify(payload));
      if (mainFile) data.append("productImage", mainFile);
      variants.forEach((variant, index) => {
        if (variant.file) data.append(`variantImage-${index}`, variant.file);
      });

      const response = await fetch(editing ? `/api/products/${product?.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        body: data,
      });
      const body = await readJson<{ error?: string; product?: { id: string } }>(response);
      if (!response.ok) throw new Error(body.error || "تعذر حفظ المنتج.");

      toast.update(toastId, {
        tone: "success",
        title: editing ? "تم حفظ التعديلات بنجاح" : "تمت إضافة المنتج بنجاح",
        description: "جارِ فتح صفحة المنتج...",
      });
      router.push(`/products/${body.product?.id ?? ""}`);
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "تعذر حفظ المنتج.";
      setError(message);
      setSaving(false);
      toast.update(toastId, { tone: "error", title: "تعذر حفظ المنتج", description: message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

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
              style={{ color: "var(--lav-strong)", border: "1px solid var(--line)" }}
              aria-label="العودة للمنتجات"
              title="العودة"
            >
              <ChevronRight size={17} />
            </button>
            <span className="hidden h-8 w-px sm:block" style={{ background: "var(--line)" }} />
            <div className="min-w-0">
              <p className="text-[9px] font-black tracking-[0.18em]" style={{ color: "var(--lav-strong)" }}>
                منتجات لونيفا
              </p>
              <h1 className="truncate text-sm font-extrabold leading-5 sm:text-base" style={{ color: "var(--ink)" }}>
                {editing ? "تعديل المنتج" : "إضافة منتج جديد"}
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
            <Link href="/products" className="btn btn-outline px-3 py-2 text-xs">إلغاء</Link>
            <button form="product-form" disabled={saving} className="btn btn-product px-3 py-2 text-xs sm:px-4">
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المنتج"}
            </button>
          </div>
        </div>
        {saving && (
          <span className="saving-progress block h-0.5 w-full" style={{ background: "linear-gradient(90deg, var(--lav), var(--brand), var(--lav))" }} />
        )}
      </div>

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">كتالوج لونيفا</p>
          <h2 className="page-title mt-1">{editing ? product?.name || "تعديل المنتج" : "منتج جديد"}</h2>
          <p className="page-subtitle mt-1.5 max-w-2xl">
            عرّفي المنتج، وأضيفي متغيرات الألوان والمقاسات مع خصم مستقل لكل متغير.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-lav"><Layers3 size={12} />{formatNumber(summary.count)} متغير</span>
          <span className="badge badge-success"><CircleDollarSign size={12} />يبدأ من {formatMoney(summary.minPrice)}</span>
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

      <form id="product-form" onSubmit={submit} aria-busy={saving} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <datalist id="luniva-colors">
          {COLOR_SUGGESTIONS.map((color) => <option key={color} value={color} />)}
        </datalist>
        <div className="space-y-5">
          <section className="app-card p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Tag size={20} /></span>
              <div>
                <h3 className="section-title">هوية المنتج</h3>
                <p className="mt-0.5 text-xs muted">الاسم والكود والصورة الأساسية.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <FolderUpload
                inputRef={input}
                onChange={chooseMain}
                preview={mainPreview}
                previewAlt="صورة المنتج"
                label={mainPreview ? "تغيير الصورة" : "ارفع صورة المنتج"}
                hint="JPG · PNG · WEBP حتى 5 MB"
                className="shrink-0"
              />
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className="field-label">اسم المنتج</span>
                  <input required name="name" defaultValue={product?.name} maxLength={180} placeholder="مثال: فستان سيرا" className="field" />
                </label>
                <label>
                  <span className="field-label">الكود الرئيسي</span>
                  <input required name="primarySku" defaultValue={product?.primary_sku} maxLength={80} dir="ltr" placeholder="LNV-PRD-001" className="field mono text-left font-bold" />
                </label>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="field-label">وصف المنتج <span className="font-normal muted-2">(اختياري)</span></span>
              <textarea name="description" defaultValue={product?.description ?? ""} maxLength={2000} placeholder="اكتبي وصفًا مختصرًا للمنتج..." className="field min-h-24 resize-y" />
            </label>
          </section>

          <section className="app-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-3">
                <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Layers3 size={20} /></span>
                <div>
                  <h3 className="section-title">المتغيرات والأسعار</h3>
                  <p className="mt-0.5 text-xs muted">لكل لون ومقاس سعر أصلي وخصم مستقل.</p>
                </div>
              </div>
              <button type="button" onClick={addVariant} className="btn btn-lav"><Plus size={16} />إضافة متغير</button>
            </div>

            <div className="space-y-4 p-3 sm:p-5">
              {variants.map((variant, index) => {
                const before = Math.max(0, Number(variant.beforePrice) || 0);
                const after = afterPrice(variant);
                const percent = discountPercent(before, after);
                const saving = Math.max(0, before - after);
                const cost = Math.max(0, Number(variant.supplyPrice) || 0);
                return (
                  <article
                    key={index}
                    className="rounded-2xl p-3.5 sm:p-4"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                  >
                    <div className="mb-3.5 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                        <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px]" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>{index + 1}</span>
                        المتغير {index + 1}
                      </p>
                      <div className="flex items-center gap-2">
                        {saving > 0 && <span className="badge badge-success"><BadgePercent size={11} />{formatNumber(percent)}%</span>}
                        <button
                          type="button"
                          disabled={variants.length === 1}
                          onClick={() => removeVariant(index)}
                          className="btn-icon disabled:opacity-30"
                          title="حذف المتغير"
                          aria-label="حذف المتغير"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <ColorField
                        label="اللون"
                        value={variant.color}
                        onChange={(color) => update(index, { color })}
                        onBlur={(color) => {
                          const next = canonicalColorName(color);
                          if (next !== color) update(index, { color: next });
                        }}
                        maxLength={80}
                        placeholder="أحمر"
                        listId="luniva-colors"
                        inputClassName="py-2.5 pr-10"
                      />
                      <label>
                        <span className="field-label">المقاس</span>
                        <input value={variant.size} onChange={(event) => update(index, { size: event.target.value })} maxLength={40} placeholder="M" className="field py-2.5 text-center" />
                      </label>
                      <label>
                        <span className="field-label">كود المتغير</span>
                        <input value={variant.sku} onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })} maxLength={80} dir="ltr" placeholder="LNV-PRD-001-M" className="field mono py-2.5 text-left text-xs" />
                      </label>
                      <div>
                        <span className="field-label">صورة المتغير</span>
                        <FolderUpload
                          compact
                          onChange={(event) => chooseVariant(index, event)}
                          preview={variant.preview}
                          label={variant.preview ? "تغيير الصورة" : "إضافة صورة"}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 rounded-xl p-3 sm:grid-cols-2" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <label>
                        <span className="field-label">المورد</span>
                        <select
                          value={variant.supplierId}
                          onChange={(event) => update(index, { supplierId: event.target.value })}
                          className="field py-2.5 text-xs"
                        >
                          <option value="">بدون مورد</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="field-label">سعر التوريد (ج.م)</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={variant.supplyPrice}
                          onChange={(event) => update(index, { supplyPrice: event.target.value })}
                          placeholder="0"
                          className="field py-2.5 text-center"
                        />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 rounded-xl p-3 lg:grid-cols-[1fr_1fr_1fr_1.1fr]" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <label>
                        <span className="field-label">السعر قبل الخصم</span>
                        <input type="number" min={0} step="0.01" value={variant.beforePrice} onChange={(event) => update(index, { beforePrice: event.target.value })} placeholder="0" className="field py-2.5 text-center" />
                      </label>
                      <label>
                        <span className="field-label">نوع الخصم</span>
                        <select value={variant.discountType} onChange={(event) => update(index, { discountType: event.target.value as DiscountType })} className="field py-2.5 text-xs">
                          {DISCOUNT_TYPES.map((type) => <option key={type} value={type}>{discountTypeLabels[type]}</option>)}
                        </select>
                      </label>
                      <label>
                        <span className="field-label">{variant.discountType === "percent" ? "الخصم %" : "الخصم ج.م"}</span>
                        <input type="number" min={0} max={variant.discountType === "percent" ? 100 : before} step="0.01" value={variant.discountValue} onChange={(event) => update(index, { discountValue: event.target.value })} className="field py-2.5 text-center" />
                      </label>
                      <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "var(--lav-soft)" }}>
                        <div>
                          <p className="text-[10px] font-bold" style={{ color: "var(--lav-strong)" }}>السعر النهائي</p>
                          <p className="money text-lg" style={{ color: "var(--lav-strong)" }}>{formatMoney(after)}</p>
                          {cost > 0 && (
                            <p className="mt-0.5 text-[10px] font-extrabold" style={{ color: after - cost >= 0 ? "var(--success)" : "var(--danger)" }}>
                              الربح {formatMoney(after - cost)}
                            </p>
                          )}
                        </div>
                        {saving > 0 ? (
                          <div className="text-left">
                            <p className="text-[10px] font-bold" style={{ color: "var(--success)" }}>توفير {formatMoney(saving)}</p>
                            <span className="badge badge-success mt-1"><BadgePercent size={11} />{formatNumber(percent)}%</span>
                          </div>
                        ) : (
                          <span className="badge badge-muted">لا خصم</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 rounded-xl p-3 sm:grid-cols-2" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <label>
                        <span className="field-label flex items-center justify-between">
                          <span>رصيد المخزون (قطع)</span>
                          {Number(variant.stock) === 0 ? (
                            <span className="text-[10px] text-[var(--warning)] font-bold">نفد المخزون</span>
                          ) : Number(variant.stock) <= Number(variant.minStockAlert || 3) ? (
                            <span className="text-[10px] text-[var(--warning)] font-bold">مخزون منخفض ({variant.stock})</span>
                          ) : (
                            <span className="text-[10px] text-[var(--success)] font-bold">متوفر بالمخزن ({variant.stock})</span>
                          )}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={variant.stock}
                          onChange={(event) => update(index, { stock: event.target.value })}
                          placeholder="0"
                          className="field py-2.5 text-center font-bold"
                        />
                      </label>
                      <label>
                        <span className="field-label">حد تنبيه نقص المخزون</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={variant.minStockAlert}
                          onChange={(event) => update(index, { minStockAlert: event.target.value })}
                          placeholder="3"
                          className="field py-2.5 text-center"
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="app-card overflow-hidden">
            <div className="p-5" style={{ background: "linear-gradient(135deg, var(--lav-strong), var(--plum))", color: "#fff" }}>
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-widest text-white/70"><Sparkles size={13} />ملخص مباشر</div>
              <p className="mt-2 truncate text-lg font-extrabold">{product?.name || "منتج جديد"}</p>
              <p className="mono mt-1 text-[11px] text-white/65" dir="ltr">{product?.primary_sku || "LNV-PRD-000"}</p>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] text-white/60">يبدأ من</p>
                  <p className="money text-2xl">{formatMoney(summary.minPrice)}</p>
                </div>
                <span className="badge badge-dark">{formatNumber(summary.count)} متغير</span>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="muted">عدد المتغيرات</span>
                <b style={{ color: "var(--ink)" }}>{formatNumber(summary.count)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">إجمالي المخزون</span>
                <b className="badge badge-lav">{formatNumber(summary.totalStock)} قطعة</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">نطاق السعر</span>
                <b style={{ color: "var(--ink)" }}>{formatMoney(summary.minPrice)} — {formatMoney(summary.maxPrice)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">أعلى خصم</span>
                <b style={{ color: "var(--success)" }}>{formatNumber(summary.maxDiscount)}%</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">إجمالي التوفير</span>
                <b style={{ color: "var(--success)" }}>{formatMoney(summary.totalSaving)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">إجمالي سعر التوريد</span>
                <b style={{ color: "var(--ink)" }}>{formatMoney(summary.totalCost)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">الربح المتوقع</span>
                <b style={{ color: summary.potentialProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {formatMoney(summary.potentialProfit)}
                </b>
              </div>

              <div className="divider" />

              <div className="rounded-xl p-3 text-[11px] leading-6" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                <p className="flex items-center gap-1.5 font-extrabold" style={{ color: "var(--ink-soft)" }}><CircleDollarSign size={13} />الخصم يُحسب تلقائيًا</p>
                <p className="mt-1">أدخلي السعر قبل الخصم ثم نوع الخصم وقيمته، وسيُحسب السعر النهائي فورًا ويُتحقق منه على السيرفر.</p>
              </div>

              <button disabled={saving} className="btn btn-product w-full">
                {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
                {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المنتج"}
              </button>
              <Link href="/products" className="btn btn-outline w-full">إلغاء</Link>
            </div>
          </section>

          <section className="app-card p-5">
            <p className="flex items-center gap-2 text-xs font-extrabold" style={{ color: "var(--ink-soft)" }}><Calculator size={14} />نصيحة سريعة</p>
            <p className="mt-2 text-xs leading-6 muted">يمكنك ترك الخصم صفرًا لأي متغير. السعر النهائي هنا هو ما سيُستخدم لاحقًا عند حساب أسعار البكدجات تلقائيًا.</p>
          </section>
        </aside>
      </form>
    </>
  );
}
