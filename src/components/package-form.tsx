"use client";

import {
  AlertCircle,
  BadgePercent,
  Boxes,
  Calculator,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Gift,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, formatNumber } from "@/lib/format";
import { canonicalColorName } from "@/lib/colors";
import {
  applyDiscount,
  discountPercent,
  DISCOUNT_TYPES,
  discountTypeLabels,
  PACKAGE_STATUSES,
  packageStatusLabels,
  roundMoney,
  type DiscountType,
  type PackageStatus,
} from "@/lib/packages";

type ProductVariant = {
  id: string;
  color: string;
  size: string;
  sku: string;
  price: string | number;
  price_before_discount?: string | number | null;
  image_url?: string | null;
};

type Product = {
  id: string;
  name: string;
  primary_sku: string;
  image_url?: string | null;
  variants: ProductVariant[];
};

type ItemState = { id: string; productId: string; quantity: number };

type SubState = {
  id: string;
  name: string;
  sku: string;
  stock: string;
  discountType: DiscountType;
  discountValue: string;
  imageUrl: string | null;
  file: File | null;
  preview: string | null;
  selections: Record<string, string>;
};

export type PackageFormInitial = {
  id: string;
  name: string;
  primary_sku: string;
  description: string | null;
  image_url: string | null;
  status?: PackageStatus;
  badge?: string | null;
  items: { productId: string; quantity: number }[];
  variants: {
    name: string;
    sku: string;
    stock: number;
    discountType?: DiscountType;
    discountValue?: number;
    imageUrl: string | null;
    selections: { productId: string; variantId: string }[];
  }[];
};

const newKey = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export default function PackageForm({ initial }: { initial?: PackageFormInitial }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const nextItem = useRef(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.primary_sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [badge, setBadge] = useState(initial?.badge ?? "");
  const [status, setStatus] = useState<PackageStatus>(initial?.status ?? "active");
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(initial?.image_url ?? null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initialItems = initial?.items?.length ? initial.items : [{ productId: "", quantity: 1 }];
  const [items, setItems] = useState<ItemState[]>(() =>
    initialItems.map((item, index) => ({ id: `item-${index}`, productId: item.productId, quantity: item.quantity })),
  );

  const [subs, setSubs] = useState<SubState[]>(() => {
    const itemIdByProduct = new Map<string, string>();
    initialItems.forEach((item, index) => itemIdByProduct.set(item.productId, `item-${index}`));
    const rows = initial?.variants?.length
      ? initial.variants.map((variant, index) => ({
          id: `sub-${index}`,
          name: variant.name,
          sku: variant.sku,
          stock: String(variant.stock ?? 0),
          discountType: variant.discountType ?? "percent",
          discountValue: String(variant.discountValue ?? 0),
          imageUrl: variant.imageUrl,
          file: null,
          preview: variant.imageUrl,
          selections: Object.fromEntries(
            variant.selections
              .map((selection) => [itemIdByProduct.get(selection.productId), selection.variantId] as const)
              .filter((entry): entry is [string, string] => Boolean(entry[0])),
          ),
        }))
      : [
          {
            id: "sub-0",
            name: "",
            sku: initial?.primary_sku ? `${initial.primary_sku}-001` : "",
            stock: "0",
            discountType: "percent" as DiscountType,
            discountValue: "0",
            imageUrl: null,
            file: null,
            preview: null,
            selections: {},
          },
        ];
    return rows;
  });

  const [closedSubs, setClosedSubs] = useState<Set<string>>(() => new Set());
  const [defaultDiscountType, setDefaultDiscountType] = useState<DiscountType>("percent");
  const [defaultDiscountValue, setDefaultDiscountValue] = useState("10");

  useEffect(() => {
    let active = true;
    fetch("/api/products")
      .then((response) => response.json())
      .then((data) => {
        if (active) setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => {
        if (active) setError("تعذر تحميل المنتجات. حدّثي الصفحة وحاولي مرة أخرى.");
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const variantMap = useMemo(() => {
    const map = new Map<string, { variant: ProductVariant; product: Product }>();
    products.forEach((product) => {
      product.variants.forEach((variant) => map.set(variant.id, { variant, product }));
    });
    return map;
  }, [products]);

  function beforeFor(sub: SubState) {
    return roundMoney(
      items.reduce((total, item) => {
        const variantId = sub.selections[item.id];
        const entry = variantId ? variantMap.get(variantId) : undefined;
        if (!entry || entry.product.id !== item.productId) return total;
        return total + Number(entry.variant.price || 0) * item.quantity;
      }, 0),
    );
  }

  function afterFor(sub: SubState) {
    return applyDiscount(beforeFor(sub), sub.discountType, Number(sub.discountValue) || 0);
  }

  function selectionCount(sub: SubState) {
    return items.filter((item) => {
      const variantId = sub.selections[item.id];
      return Boolean(variantId && variantMap.get(variantId)?.product.id === item.productId);
    }).length;
  }

  function updateItem(id: string, patch: Partial<ItemState>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    if (patch.productId !== undefined) {
      setSubs((current) =>
        current.map((sub) => {
          const selections = { ...sub.selections };
          delete selections[id];
          return { ...sub, selections };
        }),
      );
    }
  }

  function addItem() {
    setItems((current) => [...current, { id: `new-item-${nextItem.current++}`, productId: "", quantity: 1 }]);
  }

  function removeItem(id: string) {
    if (items.length === 1) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setSubs((current) =>
      current.map((sub) => {
        const selections = { ...sub.selections };
        delete selections[id];
        return { ...sub, selections };
      }),
    );
  }

  function updateSub(id: string, patch: Partial<SubState>) {
    setSubs((current) => current.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)));
  }

  function updateSelection(subId: string, itemId: string, variantId: string) {
    setSubs((current) =>
      current.map((sub) =>
        sub.id === subId ? { ...sub, selections: { ...sub.selections, [itemId]: variantId } } : sub,
      ),
    );
  }

  function addSub() {
    const index = subs.length + 1;
    const row: SubState = {
      id: newKey("sub"),
      name: `بكدج فرعي ${index}`,
      sku: `${sku || "LNV-PKG"}-${String(index).padStart(3, "0")}`,
      stock: "0",
      discountType: defaultDiscountType,
      discountValue: defaultDiscountValue,
      imageUrl: null,
      file: null,
      preview: null,
      selections: {},
    };
    setSubs((current) => [...current, row]);
  }

  function removeSub(id: string) {
    if (subs.length === 1) return;
    setSubs((current) => current.filter((sub) => sub.id !== id));
  }

  function toggleSub(id: string) {
    setClosedSubs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyDefaultDiscount() {
    setSubs((current) =>
      current.map((sub) => ({ ...sub, discountType: defaultDiscountType, discountValue: defaultDiscountValue })),
    );
  }

  function generateCombinations() {
    setError("");
    try {
      if (items.some((item) => !item.productId)) throw new Error("اختاري كل المنتجات أولًا قبل توليد التوليفات.");
      const groups = items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error("أحد المنتجات المختارة غير متاح.");
        if (!product.variants.length) throw new Error(`المنتج «${product.name}» لا يحتوي على متغيرات. أضيفي له ألوانًا ومقاسات أولًا.`);
        return { item, product, variants: product.variants };
      });

      const total = groups.reduce((count, group) => count * group.variants.length, 1);
      if (total > 80) throw new Error(`هذه المنتجات تولّد ${total} توليفة. قلّلي المتغيرات أو أضيفي البكدجات الفرعية يدويًا.`);
      if (subs.length > 1 && !window.confirm("سيتم استبدال البكدجات الفرعية الحالية بالتوليفات الجديدة. هل تريدين المتابعة؟")) return;

      let combinations: ProductVariant[][] = [[]];
      for (const group of groups) {
        const next: ProductVariant[][] = [];
        for (const prefix of combinations) {
          for (const variant of group.variants) next.push([...prefix, variant]);
        }
        combinations = next;
      }

      const usedNames = new Set<string>();
      const generated = combinations.map((combo, index) => {
        const selections: Record<string, string> = {};
        combo.forEach((variant, comboIndex) => {
          selections[groups[comboIndex].item.id] = variant.id;
        });
        let label = combo.map((variant) => `${canonicalColorName(variant.color)} / ${variant.size}`).join(" + ");
        if (label.length > 120) label = label.slice(0, 120);
        if (usedNames.has(label)) label = `${label.slice(0, 110)} #${index + 1}`;
        usedNames.add(label);
        return {
          id: newKey("sub"),
          name: label,
          sku: `${sku || "LNV-PKG"}-${String(index + 1).padStart(3, "0")}`,
          stock: "0",
          discountType: defaultDiscountType,
          discountValue: defaultDiscountValue,
          imageUrl: null,
          file: null,
          preview: null,
          selections,
        } satisfies SubState;
      });

      setSubs(generated);
      setClosedSubs(new Set(generated.slice(1).map((sub) => sub.id)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر توليد التوليفات.");
    }
  }

  function chooseMainImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("اختاري صورة صالحة بحجم لا يتجاوز 5 MB.");
      return;
    }
    setMainImage(file);
    setMainPreview(URL.createObjectURL(file));
    setError("");
  }

  function chooseSubImage(subId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("اختاري صورة صالحة بحجم لا يتجاوز 5 MB.");
      return;
    }
    updateSub(subId, { file, preview: URL.createObjectURL(file), imageUrl: null });
    setError("");
  }

  const configuredSubs = subs.map((sub) => ({ before: beforeFor(sub), after: afterFor(sub), stock: Number(sub.stock) || 0 }));
  const pricedSubs = configuredSubs.filter((entry) => entry.before > 0);
  const stats = {
    minAfter: pricedSubs.length ? Math.min(...pricedSubs.map((entry) => entry.after)) : 0,
    maxAfter: pricedSubs.length ? Math.max(...pricedSubs.map((entry) => entry.after)) : 0,
    maxBefore: pricedSubs.length ? Math.max(...pricedSubs.map((entry) => entry.before)) : 0,
    stock: configuredSubs.reduce((sum, entry) => sum + entry.stock, 0),
    readySubs: pricedSubs.length,
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!name.trim()) throw new Error("أدخلي اسم البكدج.");
      if (!sku.trim()) throw new Error("أدخلي الكود الرئيسي للبكدج.");
      if (!items.length) throw new Error("أضيفي منتجًا واحدًا على الأقل.");
      if (items.some((item) => !item.productId)) throw new Error("اختاري منتجًا لكل صف في مكونات البكدج.");
      if (subs.length === 0) throw new Error("أضيفي بكدجًا فرعيًا واحدًا على الأقل.");
      for (const [index, sub] of subs.entries()) {
        if (!sub.name.trim() || !sub.sku.trim()) throw new Error(`أكملي اسم وكود البكدج الفرعي رقم ${index + 1}.`);
        const count = selectionCount(sub);
        if (count !== items.length) throw new Error(`اختاري لون ومقاس كل منتج في البكدج الفرعي «${sub.name || index + 1}».`);
        if (afterFor(sub) > beforeFor(sub)) throw new Error("سعر البكدج الفرعي بعد الخصم لا يمكن أن يتجاوز السعر قبل الخصم.");
      }

      const body = new FormData();
      body.append(
        "payload",
        JSON.stringify({
          name,
          primarySku: sku,
          description,
          badge,
          status,
          imageUrl: initial?.image_url ?? null,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          variants: subs.map((sub) => ({
            name: sub.name,
            sku: sub.sku,
            stock: Number(sub.stock) || 0,
            discountType: sub.discountType,
            discountValue: Number(sub.discountValue) || 0,
            imageUrl: sub.imageUrl,
            selections: items
              .map((item) => ({ productId: item.productId, variantId: sub.selections[item.id] }))
              .filter((selection) => Boolean(selection.variantId)),
          })),
        }),
      );
      if (mainImage) body.append("image", mainImage);
      subs.forEach((sub, index) => {
        if (sub.file) body.append(`variantImage-${index}`, sub.file);
      });

      const response = await fetch(editing ? `/api/packages/${initial?.id}` : "/api/packages", {
        method: editing ? "PATCH" : "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ البكدج.");
      router.push(`/packages/${data.package.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ البكدج.");
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const availableProducts = products.length;

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button type="button" onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
            <ChevronRight size={15} />العودة للبكدجات
          </button>
          <p className="eyebrow">Luniva offers studio</p>
          <h1 className="page-title mt-1">{editing ? "تعديل البكدج" : "إنشاء بكدج جديد"}</h1>
          <p className="page-subtitle mt-2 max-w-2xl">اختاري المنتجات، ولّدي البكدجات الفرعية بكل الألوان والمقاسات، وسيُحسب السعر قبل الخصم وبعده تلقائيًا.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push("/packages")} className="btn btn-outline">إلغاء</button>
          <button form="package-form" disabled={saving} className="btn btn-primary">
            {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
            {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء البكدج"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl p-4 text-sm font-bold" style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="package-form" onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <section className="app-card p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Gift size={20} /></span>
              <div>
                <h2 className="section-title">هوية البكدج الرئيسي</h2>
                <p className="mt-0.5 text-xs muted">الاسم والكود والصورة التي تميز العرض.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">اسم البكدج</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={180} placeholder="مثال: إطلالة كلاسيك" className="field" />
              </label>
              <label>
                <span className="field-label">الكود الرئيسي</span>
                <input value={sku} onChange={(event) => setSku(event.target.value.toUpperCase())} maxLength={80} dir="ltr" placeholder="LNV-PKG-001" className="field mono text-left font-bold" />
              </label>
              <label>
                <span className="field-label">حالة البكدج</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as PackageStatus)} className="field">
                  {PACKAGE_STATUSES.map((value) => <option key={value} value={value}>{packageStatusLabels[value]}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">شارة اختيارية</span>
                <input value={badge} onChange={(event) => setBadge(event.target.value)} maxLength={60} placeholder="مثال: الأكثر مبيعًا" className="field" />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="field-label">وصف البكدج <span className="font-normal muted-2">(اختياري)</span></span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="اكتبي وصفًا مختصرًا يوضح مكونات العرض ومزاياه..." className="field min-h-24 resize-y" />
            </label>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <label className="relative grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl" style={{ background: "var(--brand-soft)", border: "1px dashed var(--brand)", color: "var(--brand-strong)" }}>
                {mainPreview ? <img src={mainPreview} alt="صورة البكدج" className="h-full w-full object-cover" /> : <ImagePlus size={24} />}
                <span className="absolute bottom-1 left-1 grid h-6 w-6 place-items-center rounded-full" style={{ background: "var(--brand)", color: "#fff" }}><Camera size={12} /></span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseMainImage} className="hidden" />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>الصورة الرئيسية للبكدج</p>
                <p className="mt-1 text-xs leading-5 muted">تظهر في صفحة العروض وتفاصيل البكدج. JPG أو PNG أو WEBP حتى 5 MB.</p>
                {mainPreview && (
                  <button type="button" onClick={() => { setMainPreview(initial?.image_url ?? null); setMainImage(null); }} className="mt-2 text-xs font-extrabold" style={{ color: "var(--danger)" }}>
                    إزالة الصورة الجديدة
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="app-card p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Boxes size={20} /></span>
                <div>
                  <h2 className="section-title">منتجات البكدج</h2>
                  <p className="mt-0.5 text-xs muted">المنتجات التي تتكرر في كل بكدج فرعي.</p>
                </div>
              </div>
              <button type="button" onClick={addItem} className="btn btn-lav"><Plus size={16} />إضافة منتج</button>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl p-8 text-sm muted" style={{ background: "var(--surface-2)" }}>
                <LoaderCircle size={17} className="animate-spin" />جارِ تحميل المنتجات...
              </div>
            ) : availableProducts === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface-2)", border: "1px dashed var(--line-strong)" }}>
                <Boxes size={26} className="mx-auto mb-2" style={{ color: "var(--muted-2)" }} />
                <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>لا توجد منتجات بعد</p>
                <p className="mt-1 text-xs muted">أضيفي منتجاتها ومتغيراتها أولًا لتتمكني من بناء البكدج.</p>
                <Link href="/products/new" className="btn btn-lav mt-4">إضافة منتج</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const selected = productMap.get(item.productId);
                  return (
                    <div key={item.id} className="rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                      <div className="grid gap-3 sm:grid-cols-[1fr_100px_42px] sm:items-end">
                        <label>
                          <span className="field-label">المنتج {index + 1}</span>
                          <select
                            value={item.productId}
                            onChange={(event) => {
                              const productId = event.target.value;
                              if (productId && items.some((entry) => entry.id !== item.id && entry.productId === productId)) {
                                setError("هذا المنتج مضاف بالفعل. غيّري الكمية من الصف الموجود بدلًا من تكراره.");
                                return;
                              }
                              updateItem(item.id, { productId });
                            }}
                            className="field"
                          >
                            <option value="">اختاري المنتج</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>{product.name} — {product.primary_sku}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="field-label">الكمية</span>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={item.quantity}
                            onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                            className="field text-center"
                          />
                        </label>
                        <button type="button" disabled={items.length === 1} onClick={() => removeItem(item.id)} className="btn-icon mb-0.5 disabled:opacity-30" title="حذف المنتج" aria-label="حذف المنتج">
                          <Trash2 size={17} />
                        </button>
                      </div>
                      {selected && (
                        <div className="mt-3 flex items-center gap-2 text-xs muted">
                          <span className="badge badge-lav">{formatNumber(selected.variants.length)} متغير</span>
                          <span className="mono" dir="ltr">{selected.primary_sku}</span>
                          {selected.variants.length === 0 && <span style={{ color: "var(--danger)" }}>أضيفي متغيرات لهذا المنتج أولًا.</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="app-card overflow-hidden">
            <div className="border-b p-5 sm:p-6" style={{ borderColor: "var(--line)" }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Layers3 size={20} /></span>
                  <div>
                    <h2 className="section-title">البكدجات الفرعية</h2>
                    <p className="mt-0.5 text-xs muted">كل توليفة لون ومقاس لها سعرها ومخزونها وصورتها.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={generateCombinations} className="btn btn-soft"><Wand2 size={16} />توليد التوليفات</button>
                  <button type="button" onClick={addSub} className="btn btn-outline"><Plus size={16} />بكدج فرعي</button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--ink)" }}><BadgePercent size={16} style={{ color: "var(--brand-strong)" }} />خصم موحّد للتوليد</p>
                    <p className="mt-1 text-xs muted">يُطبق على كل البكدجات الفرعية عند التوليد أو عند الضغط على «تطبيق على الكل».</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-32">
                      <span className="field-label">نوع الخصم</span>
                      <select value={defaultDiscountType} onChange={(event) => setDefaultDiscountType(event.target.value as DiscountType)} className="field py-2.5">
                        {DISCOUNT_TYPES.map((value) => <option key={value} value={value}>{discountTypeLabels[value]}</option>)}
                      </select>
                    </label>
                    <label className="w-28">
                      <span className="field-label">{defaultDiscountType === "percent" ? "النسبة %" : "المبلغ"}</span>
                      <input type="number" min={0} max={defaultDiscountType === "percent" ? 100 : undefined} step="0.01" value={defaultDiscountValue} onChange={(event) => setDefaultDiscountValue(event.target.value)} className="field py-2.5 text-center" />
                    </label>
                    <button type="button" onClick={applyDefaultDiscount} className="btn btn-outline">تطبيق على الكل</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {subs.length === 0 && <div className="p-6 text-center text-sm muted">أضيفي بكدجًا فرعيًا واحدًا على الأقل.</div>}
              {subs.map((sub, index) => {
                const open = !closedSubs.has(sub.id);
                const before = beforeFor(sub);
                const after = afterFor(sub);
                const savings = Math.max(0, before - after);
                const percent = discountPercent(before, after);
                const configured = selectionCount(sub);
                return (
                  <article key={sub.id} className="overflow-hidden rounded-[1.3rem]" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
                    <div className="flex items-center gap-3 p-3 sm:p-4" style={{ background: open ? "var(--surface-2)" : "var(--surface)" }}>
                      <button type="button" onClick={() => toggleSub(sub.id)} className="btn-icon shrink-0" aria-label={open ? "طي البكدج الفرعي" : "فتح البكدج الفرعي"}>
                        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{sub.name || `بكدج فرعي ${index + 1}`}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] muted">
                          <span className="mono" dir="ltr">{sub.sku || "بدون كود"}</span>
                          <span>·</span>
                          <span>{configured}/{items.length} مكونات</span>
                          <span>·</span>
                          <span>مخزون {formatNumber(sub.stock || 0)}</span>
                        </p>
                      </div>
                      <div className="hidden text-left sm:block">
                        <p className="text-[10px] muted-2">السعر النهائي</p>
                        <p className="money text-sm" style={{ color: "var(--brand-strong)" }}>{formatMoney(after)}</p>
                      </div>
                      <button type="button" disabled={subs.length === 1} onClick={() => removeSub(sub.id)} className="btn-icon shrink-0 disabled:opacity-30" title="حذف البكدج الفرعي" aria-label="حذف البكدج الفرعي">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {open && (
                      <div className="grid gap-5 border-t p-4 sm:p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]" style={{ borderColor: "var(--line)" }}>
                        <div>
                          <p className="mb-3 flex items-center gap-2 text-xs font-extrabold" style={{ color: "var(--ink-soft)" }}><Layers3 size={14} />مكونات هذا البكدج الفرعي</p>
                          <div className="space-y-2.5">
                            {items.map((item) => {
                              const product = productMap.get(item.productId);
                              const selectedVariantId = sub.selections[item.id] ?? "";
                              const selectedVariant = selectedVariantId ? variantMap.get(selectedVariantId)?.variant : undefined;
                              return (
                                <div key={item.id} className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="min-w-0 truncate text-xs font-extrabold" style={{ color: "var(--ink)" }}>{product?.name ?? `المنتج ${items.indexOf(item) + 1}`}</p>
                                    <span className="badge badge-muted">× {formatNumber(item.quantity)}</span>
                                  </div>
                                  <select
                                    value={selectedVariantId}
                                    onChange={(event) => updateSelection(sub.id, item.id, event.target.value)}
                                    className="field mt-2 py-2.5 text-xs"
                                    disabled={!product}
                                  >
                                    <option value="">اختاري اللون والمقاس</option>
                                    {product?.variants.map((variant) => (
                                      <option key={variant.id} value={variant.id}>
                                        {canonicalColorName(variant.color)} · {variant.size} — {formatMoney(variant.price)}
                                      </option>
                                    ))}
                                  </select>
                                  {selectedVariant && (
                                    <p className="mt-2 flex items-center justify-between gap-2 text-[11px] muted">
                                      <span className="mono" dir="ltr">{selectedVariant.sku}</span>
                                      <span>سعر المفرد: <b style={{ color: "var(--ink-soft)" }}>{formatMoney(selectedVariant.price)}</b></span>
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="flex items-center gap-2 text-xs font-extrabold" style={{ color: "var(--ink-soft)" }}><Calculator size={14} />حساب السعر</p>
                              <span className="badge badge-brand">تلقائي</span>
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                              <div>
                                <p className="text-[10px] font-bold muted-2">السعر قبل الخصم</p>
                                <p className="money mt-0.5 text-lg" style={{ color: "var(--ink)" }}>{formatMoney(before)}</p>
                              </div>
                              <span className="text-[10px] muted-2">مجموع أسعار المتغيرات</span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label>
                                <span className="field-label">نوع الخصم</span>
                                <select value={sub.discountType} onChange={(event) => updateSub(sub.id, { discountType: event.target.value as DiscountType })} className="field py-2.5 text-xs">
                                  {DISCOUNT_TYPES.map((value) => <option key={value} value={value}>{discountTypeLabels[value]}</option>)}
                                </select>
                              </label>
                              <label>
                                <span className="field-label">{sub.discountType === "percent" ? "الخصم %" : "الخصم ج.م"}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={sub.discountType === "percent" ? 100 : before}
                                  step="0.01"
                                  value={sub.discountValue}
                                  onChange={(event) => updateSub(sub.id, { discountValue: event.target.value })}
                                  className="field py-2.5 text-center"
                                />
                              </label>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--brand-soft)", border: "1px solid var(--brand)" }}>
                              <div>
                                <p className="text-[10px] font-bold" style={{ color: "var(--brand-strong)" }}>السعر بعد الخصم</p>
                                <p className="money mt-0.5 text-xl" style={{ color: "var(--brand-strong)" }}>{formatMoney(after)}</p>
                              </div>
                              <div className="text-left">
                                {savings > 0 ? (
                                  <>
                                    <p className="text-[10px] font-bold" style={{ color: "var(--success)" }}>توفير {formatMoney(savings)}</p>
                                    <span className="badge badge-success mt-1"><BadgePercent size={11} />{formatNumber(percent)}%</span>
                                  </>
                                ) : <span className="badge badge-muted">لا يوجد خصم</span>}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="field-label">المخزون</span>
                              <input type="number" min={0} max={1000000} value={sub.stock} onChange={(event) => updateSub(sub.id, { stock: event.target.value })} className="field py-2.5 text-center" />
                            </label>
                            <div>
                              <span className="field-label">صورة البكدج الفرعي</span>
                              <label className="flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-extrabold" style={{ background: "var(--surface-2)", border: "1px dashed var(--line-strong)", color: "var(--muted)" }}>
                                {sub.preview ? <img src={sub.preview} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <Camera size={15} />}
                                {sub.preview ? "تغيير" : "إضافة صورة"}
                                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseSubImage(sub.id, event)} className="hidden" />
                              </label>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <label>
                              <span className="field-label">اسم البكدج الفرعي</span>
                              <input value={sub.name} onChange={(event) => updateSub(sub.id, { name: event.target.value })} maxLength={120} placeholder="أحمر / M + جينز / 32" className="field py-2.5 text-xs" />
                            </label>
                            <label>
                              <span className="field-label">الكود الفرعي</span>
                              <input value={sub.sku} onChange={(event) => updateSub(sub.id, { sku: event.target.value.toUpperCase() })} maxLength={80} dir="ltr" placeholder="LNV-PKG-001-M" className="field mono py-2.5 text-left text-xs" />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="app-card overflow-hidden">
            <div className="p-5" style={{ background: "linear-gradient(135deg, var(--plum), var(--brand-strong))", color: "#fff" }}>
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-widest text-white/70"><Sparkles size={13} />LIVE SUMMARY</div>
              <p className="mt-2 text-lg font-extrabold">{name || "بكدج بدون اسم"}</p>
              <p className="mono mt-1 text-[11px] text-white/65" dir="ltr">{sku || "LNV-PKG-000"}</p>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] text-white/60">يبدأ من</p>
                  <p className="money text-2xl">{formatMoney(stats.minAfter)}</p>
                </div>
                {stats.readySubs > 0 && <span className="badge badge-dark">{stats.readySubs} بكدج فرعي</span>}
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="muted">منتجات البكدج</span>
                <b style={{ color: "var(--ink)" }}>{formatNumber(items.length)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">البكدجات الفرعية</span>
                <b style={{ color: "var(--ink)" }}>{formatNumber(subs.length)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">نطاق السعر</span>
                <b style={{ color: "var(--ink)" }}>{formatMoney(stats.minAfter)} — {formatMoney(stats.maxAfter)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">إجمالي المخزون</span>
                <b style={{ color: "var(--ink)" }}>{formatNumber(stats.stock)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">أعلى توفير</span>
                <b style={{ color: "var(--success)" }}>{formatMoney(Math.max(0, stats.maxBefore - stats.minAfter))}</b>
              </div>

              <div className="divider" />

              <div className="rounded-xl p-3 text-[11px] leading-6" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                <p className="flex items-center gap-1.5 font-extrabold" style={{ color: "var(--ink-soft)" }}><CircleDollarSign size={13} />الأسعار محسوبة تلقائيًا</p>
                <p className="mt-1">السعر قبل الخصم = مجموع أسعار المتغيرات المختارة. وسيُعاد التحقق من كل الحسابات على السيرفر قبل الحفظ.</p>
              </div>

              <button disabled={saving} className="btn btn-primary w-full">
                {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
                {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء البكدج"}
              </button>
              <button type="button" onClick={() => router.push("/packages")} className="btn btn-outline w-full">إلغاء</button>
            </div>
          </section>

          <section className="app-card p-5">
            <p className="flex items-center gap-2 text-xs font-extrabold" style={{ color: "var(--ink-soft)" }}><Tag size={14} />نصيحة سريعة</p>
            <p className="mt-2 text-xs leading-6 muted">بعد إضافة التيشيرت والجينز، اضغطي «توليد التوليفات» لإنشاء بكدج فرعي لكل لون ومقاس تلقائيًا، ثم عدّلي صورة ومخزون كل بكدج.</p>
          </section>
        </aside>
      </form>
    </>
  );
}
