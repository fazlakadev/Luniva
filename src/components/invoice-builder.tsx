"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  Check,
  ChevronDown,
  Gift,
  Layers3,
  MapPin,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Search,
  StickyNote,
  Trash2,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { canonicalColorName, colorSwatch } from "@/lib/colors";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  applyDiscount,
  DISCOUNT_TYPES,
  discountTypeLabels,
  roundMoney,
  type DiscountType,
} from "@/lib/packages";
import { PAYMENT_METHODS, paymentMethodLabels, type PaymentMethod } from "@/lib/invoice-shared";

export type BuilderCustomer = {
  id: string;
  full_name: string;
  phone: string;
  address: string | null;
  customer_code: string | null;
};

export type BuilderProduct = {
  id: string;
  name: string;
  primary_sku: string;
  image_url: string | null;
  variants: Array<{
    id: string;
    color: string;
    size: string;
    sku: string;
    price: string | number;
    beforePrice: string | number;
    imageUrl: string | null;
  }>;
};

export type BuilderPackage = {
  id: string;
  name: string;
  primary_sku: string;
  image_url: string | null;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: string | number;
    beforePrice: string | number;
    stock: number;
    imageUrl: string | null;
    components: Array<{ productName: string; color: string; size: string; quantity: number }>;
  }>;
};

export type CartItem = {
  key: string;
  type: "product" | "package";
  variantId: string | null;
  packageVariantId: string | null;
  name: string;
  subtitle: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  unitBefore: number;
  quantity: number;
};

function Thumb({ src, color, size = "h-11 w-11" }: { src: string | null; color?: string; size?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl ${size}`}
      style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))", border: "1px solid var(--line)" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : color ? (
        <span className="h-4 w-4 rounded-full" style={{ background: colorSwatch(color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }} />
      ) : (
        <Package size={16} style={{ color: "var(--lav-strong)" }} />
      )}
    </span>
  );
}

function packageVariantLabel(name: string) {
  return name
    .split("/")
    .map((part) => canonicalColorName(part.trim()))
    .join(" / ");
}

function buildInitialCart({
  products,
  packages,
  initialProductVariantId,
  initialPackageVariantId,
  initialPackageId,
}: {
  products: BuilderProduct[];
  packages: BuilderPackage[];
  initialProductVariantId?: string;
  initialPackageVariantId?: string;
  initialPackageId?: string;
}): CartItem[] {
  if (initialProductVariantId) {
    for (const product of products) {
      const variant = product.variants.find((entry) => entry.id === initialProductVariantId);
      if (variant) {
        return [{
          key: `p:${variant.id}`,
          type: "product",
          variantId: variant.id,
          packageVariantId: null,
          name: product.name,
          subtitle: `${canonicalColorName(variant.color)} · ${variant.size}`,
          sku: variant.sku,
          imageUrl: variant.imageUrl ?? product.image_url,
          unitPrice: Number(variant.price),
          unitBefore: Math.max(Number(variant.price), Number(variant.beforePrice)),
          quantity: 1,
        }];
      }
    }
  }
  if (initialPackageVariantId || initialPackageId) {
    for (const pkg of packages) {
      const variant = initialPackageVariantId
        ? pkg.variants.find((entry) => entry.id === initialPackageVariantId)
        : pkg.id === initialPackageId
          ? pkg.variants[0]
          : undefined;
      if (variant) {
        return [{
          key: `pk:${variant.id}`,
          type: "package",
          variantId: null,
          packageVariantId: variant.id,
          name: `${pkg.name} — ${packageVariantLabel(variant.name)}`,
          subtitle: variant.components.map((component) => `${component.productName} (${canonicalColorName(component.color)}/${component.size})`).join("، "),
          sku: variant.sku,
          imageUrl: variant.imageUrl ?? pkg.image_url,
          unitPrice: Number(variant.price),
          unitBefore: Math.max(Number(variant.price), Number(variant.beforePrice)),
          quantity: 1,
        }];
      }
    }
  }
  return [];
}

export default function InvoiceBuilder({
  customers,
  products,
  packages,
  initialProductVariantId,
  initialPackageVariantId,
  initialPackageId,
  initialCustomerId,
  invoiceId,
  initialCart,
  initialValues,
  currentPaid,
}: {
  customers: BuilderCustomer[];
  products: BuilderProduct[];
  packages: BuilderPackage[];
  initialProductVariantId?: string;
  initialPackageVariantId?: string;
  initialPackageId?: string;
  initialCustomerId?: string;
  invoiceId?: string;
  initialCart?: CartItem[];
  initialValues?: {
    customerId?: string | null;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    deliveryArea?: string;
    deliveryFee?: string | number;
    discountType?: DiscountType;
    discountValue?: string | number;
    dueDate?: string | null;
    notes?: string | null;
    paymentMethod?: PaymentMethod;
  };
  currentPaid?: string | number;
}) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(invoiceId);
  const values = initialValues ?? {};

  const preselectedCustomer = customers.find((customer) => customer.id === (values.customerId ?? initialCustomerId)) ?? null;

  const catalogCart = buildInitialCart({ products, packages, initialProductVariantId, initialPackageVariantId, initialPackageId });

  const [cart, setCart] = useState<CartItem[]>(initialCart?.length ? initialCart : catalogCart);
  const [tab, setTab] = useState<"products" | "packages">(initialPackageVariantId || initialPackageId || initialCart?.some((item) => item.type === "package") ? "packages" : "products");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(initialProductVariantId ? products.find((product) => product.variants.some((variant) => variant.id === initialProductVariantId))?.id ?? null : null);

  const [customerId, setCustomerId] = useState<string>(values.customerId ?? preselectedCustomer?.id ?? "");
  const [customerName, setCustomerName] = useState(values.customerName ?? preselectedCustomer?.full_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(values.customerPhone ?? preselectedCustomer?.phone ?? "");
  const [customerAddress, setCustomerAddress] = useState(values.customerAddress ?? preselectedCustomer?.address ?? "");
  const [deliveryArea, setDeliveryArea] = useState(values.deliveryArea ?? "");
  const [deliveryFee, setDeliveryFee] = useState(String(values.deliveryFee ?? "0"));
  const [discountType, setDiscountType] = useState<DiscountType>(values.discountType ?? "amount");
  const [discountValue, setDiscountValue] = useState(String(values.discountValue ?? "0"));
  const [paidAmount, setPaidAmount] = useState(String(currentPaid ?? "0"));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(values.paymentMethod ?? "cash");
  const [dueDate, setDueDate] = useState(values.dueDate ?? "");
  const [notes, setNotes] = useState(values.notes ?? "");
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(
    () => roundMoney(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)),
    [cart],
  );
  const discountAmount = roundMoney(Math.max(0, subtotal - applyDiscount(subtotal, discountType, Number(discountValue) || 0)));
  const total = useMemo(() => {
    const after = applyDiscount(subtotal, discountType, Number(discountValue) || 0);
    return roundMoney(after + Math.max(0, Number(deliveryFee) || 0));
  }, [subtotal, discountType, discountValue, deliveryFee]);
  const remaining = roundMoney(Math.max(0, total - (Number(paidAmount) || 0)));
  const units = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return products;
    return products.filter((product) =>
      `${product.name} ${product.primary_sku} ${product.variants.map((variant) => `${variant.color} ${variant.size} ${variant.sku}`).join(" ")}`
        .toLowerCase()
        .includes(search),
    );
  }, [products, query]);

  const filteredPackages = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return packages;
    return packages.filter((pkg) =>
      `${pkg.name} ${pkg.primary_sku} ${pkg.variants.map((variant) => `${variant.name} ${variant.sku} ${variant.components.map((component) => `${component.productName} ${component.color} ${component.size}`).join(" ")}`).join(" ")}`
        .toLowerCase()
        .includes(search),
    );
  }, [packages, query]);

  function addProductVariant(product: BuilderProduct, variant: BuilderProduct["variants"][number]) {
    const key = `p:${variant.id}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => item.key === key ? { ...item, quantity: Math.min(999, item.quantity + 1) } : item);
      }
      return [...current, {
        key,
        type: "product",
        variantId: variant.id,
        packageVariantId: null,
        name: product.name,
        subtitle: `${canonicalColorName(variant.color)} · ${variant.size}`,
        sku: variant.sku,
        imageUrl: variant.imageUrl ?? product.image_url,
        unitPrice: Number(variant.price),
        unitBefore: Math.max(Number(variant.price), Number(variant.beforePrice)),
        quantity: 1,
      }];
    });
  }

  function addPackageVariant(pkg: BuilderPackage, variant: BuilderPackage["variants"][number]) {
    const key = `pk:${variant.id}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => item.key === key ? { ...item, quantity: Math.min(999, item.quantity + 1) } : item);
      }
      return [...current, {
        key,
        type: "package",
        variantId: null,
        packageVariantId: variant.id,
        name: `${pkg.name} — ${packageVariantLabel(variant.name)}`,
        subtitle: variant.components.map((component) => `${component.productName} (${canonicalColorName(component.color)}/${component.size})`).join("، "),
        sku: variant.sku,
        imageUrl: variant.imageUrl ?? pkg.image_url,
        unitPrice: Number(variant.price),
        unitBefore: Math.max(Number(variant.price), Number(variant.beforePrice)),
        quantity: 1,
      }];
    });
  }

  function changeQuantity(key: string, delta: number) {
    setCart((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity: Math.min(999, Math.max(1, item.quantity + delta)) } : item,
      ),
    );
  }

  function removeItem(key: string) {
    setCart((current) => current.filter((item) => item.key !== key));
  }

  function pickCustomer(value: string) {
    setCustomerId(value);
    const customer = customers.find((entry) => entry.id === value);
    if (customer) {
      setCustomerName(customer.full_name);
      setCustomerPhone(customer.phone);
      setCustomerAddress(customer.address ?? "");
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (cart.length === 0) {
      toast.error("الفاتورة فارغة", "أضيفي منتجًا أو بكدجًا واحدًا على الأقل.");
      return;
    }
    if (!editing && Number(paidAmount) > total + 0.001) {
      toast.error("المبلغ المدفوع أكبر من الإجمالي", "قلّلي المبلغ المدفوع أو راجعي الخصم والتوصيل.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(editing ? "جارِ حفظ التعديلات" : "جارِ حفظ الفاتورة", "بنجهّز الأرقام ونثبّت الأسعار من قاعدة البيانات…");
    try {
      const payload: Record<string, unknown> = {
        customerId: customerId || null,
        customerName,
        customerPhone,
        customerAddress,
        deliveryArea,
        deliveryFee: Number(deliveryFee) || 0,
        discountType,
        discountValue: Number(discountValue) || 0,
        paymentMethod,
        dueDate: dueDate || null,
        notes,
        items: cart.map((item) => ({
          type: item.type,
          variantId: item.variantId,
          packageVariantId: item.packageVariantId,
          quantity: item.quantity,
        })),
      };
      // On edit, recorded payments stay in the ledger and are never re-sent.
      if (!editing) payload.paidAmount = Number(paidAmount) || 0;

      const response = await fetch(editing ? `/api/invoices/${invoiceId}` : "/api/invoices", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (editing ? "تعذر تعديل الفاتورة." : "تعذر إنشاء الفاتورة."));
      toast.update(toastId, {
        tone: "success",
        title: editing ? "تم حفظ تعديلات الفاتورة" : "تم إنشاء الفاتورة",
        description: editing ? "تم تحديث العناصر والأسعار مع الحفاظ على الدفعات المسجّلة." : "بفتح لكِ الفاتورة للطباعة والتحصيل.",
      });
      router.push(editing ? `/invoices/${invoiceId}` : `/invoices/${data.invoice.id}?created=1`);
    } catch (error) {
      const message = error instanceof Error ? error.message : (editing ? "تعذر تعديل الفاتورة." : "تعذر إنشاء الفاتورة.");
      toast.update(toastId, { tone: "error", title: "لم يتم حفظ الفاتورة", description: message });
      setSaving(false);
    }
  }

  const totalBeforeDiscount = roundMoney(cart.reduce((sum, item) => sum + item.unitBefore * item.quantity, 0));

  return (
    <form onSubmit={submit} aria-busy={saving} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {editing && (
        <div className="rounded-2xl px-4 py-3 text-[11px] font-bold leading-6 xl:col-span-2" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)", border: "1px solid color-mix(in srgb, var(--lav) 24%, transparent)" }}>
          وضع التعديل: يمكنك تغيير العميلة والعناصر والكميات والخصم والتوصيل. يتم إعادة تسعير العناصر من قاعدة البيانات، وتبقى الدفعات والإيصالات المسجّلة كما هي.
        </div>
      )}
      <div className="space-y-5">
        {/* Customer */}
        <section className="app-card p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><UserRound size={19} /></span>
            <div>
              <h2 className="section-title">بيانات العميلة</h2>
              <p className="mt-0.5 text-[11px] muted-2">اربطي الفاتورة بعميلة مسجلة أو اكتبي البيانات يدويًا.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="field-label">ربط بعميلة مسجلة</span>
              <select value={customerId} onChange={(event) => pickCustomer(event.target.value)} className="field">
                <option value="">بدون ربط — عميلة نقدية</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} — {customer.phone}{customer.customer_code ? ` (${customer.customer_code})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">اسم العميلة</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={160} placeholder="عميلة نقدية" className="field" />
            </label>
            <label>
              <span className="field-label">رقم الهاتف</span>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} maxLength={32} inputMode="tel" placeholder="01xxxxxxxxx" className="field mono" dir="ltr" />
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">عنوان التوصيل</span>
              <input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} maxLength={500} placeholder="العنوان بالتفصيل" className="field" />
            </label>
            <label>
              <span className="field-label">منطقة التوصيل</span>
              <span className="relative block">
                <MapPin size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-2)" }} />
                <input value={deliveryArea} onChange={(event) => setDeliveryArea(event.target.value)} maxLength={120} placeholder="المدينة / المنطقة" className="field pr-8" />
              </span>
            </label>
            <label>
              <span className="field-label">رسوم التوصيل</span>
              <span className="relative block">
                <Truck size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-2)" }} />
                <input value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} type="number" min={0} step="0.01" inputMode="decimal" className="field pr-8 money" />
              </span>
            </label>
          </div>
        </section>

        {/* Catalog */}
        <section className="app-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Layers3 size={19} /></span>
              <div>
                <h2 className="section-title">عناصر الفاتورة</h2>
                <p className="mt-0.5 text-[11px] muted-2">اختاري منتجًا بمتغيره أو بكدجًا فرعيًا جاهزًا.</p>
              </div>
            </div>
            <span className="badge badge-brand"><ReceiptText size={11} />{formatNumber(cart.length)} عنصر</span>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex rounded-xl p-1" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <button type="button" onClick={() => setTab("products")} className="flex-1 rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition sm:flex-none" style={tab === "products" ? { background: "var(--surface)", color: "var(--lav-strong)", boxShadow: "var(--shadow-sm)" } : { color: "var(--muted)" }}>
                <Package size={12} className="inline-block me-1" />المنتجات ({formatNumber(products.length)})
              </button>
              <button type="button" onClick={() => setTab("packages")} className="flex-1 rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition sm:flex-none" style={tab === "packages" ? { background: "var(--surface)", color: "var(--brand-strong)", boxShadow: "var(--shadow-sm)" } : { color: "var(--muted)" }}>
                <Gift size={12} className="inline-block me-1" />البكدجات ({formatNumber(packages.length)})
              </button>
            </div>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <Search size={14} style={{ color: "var(--muted-2)" }} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي بالاسم أو اللون أو الكود" className="w-full min-w-0 bg-transparent text-xs outline-none" style={{ color: "var(--ink)" }} />
            </label>
          </div>

          <div className="max-h-[460px] space-y-2 overflow-y-auto pe-1">
            {tab === "products" && filteredProducts.map((product) => {
              const isOpen = expanded === product.id;
              return (
                <div key={product.id} className="rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <button type="button" onClick={() => setExpanded(isOpen ? null : product.id)} className="flex w-full items-center gap-3 p-2.5 text-right">
                    <Thumb src={product.image_url} size="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold" style={{ color: "var(--ink)" }}>{product.name}</span>
                      <span className="mono mt-0.5 block text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{product.primary_sku} · {formatNumber(product.variants.length)} متغير</span>
                    </span>
                    <ChevronDown size={15} className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--muted-2)" }} />
                  </button>
                  {isOpen && (
                    <div className="grid gap-1.5 border-t p-2.5 sm:grid-cols-2" style={{ borderColor: "var(--line)" }}>
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => addProductVariant(product, variant)}
                          className="flex items-center gap-2 rounded-lg p-2 text-right transition hover:-translate-y-0.5"
                          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                        >
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: colorSwatch(variant.color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-extrabold" style={{ color: "var(--ink-soft)" }}>{canonicalColorName(variant.color)} · {variant.size}</span>
                            <span className="mono block text-[9px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{variant.sku}</span>
                          </span>
                          <span className="money shrink-0 text-[11px]" style={{ color: "var(--brand-strong)" }}>{formatMoney(variant.price)}</span>
                          <Plus size={13} className="shrink-0" style={{ color: "var(--success)" }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {tab === "packages" && filteredPackages.map((pkg) => (
              <div key={pkg.id} className="rounded-xl p-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <div className="mb-2 flex items-center gap-2.5">
                  <Thumb src={pkg.image_url} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold" style={{ color: "var(--ink)" }}>{pkg.name}</p>
                    <p className="mono text-[9px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{pkg.primary_sku} · {formatNumber(pkg.variants.length)} توليفة</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {pkg.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => addPackageVariant(pkg, variant)}
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-right transition hover:-translate-y-0.5"
                      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                    >
                      <Thumb src={variant.imageUrl} size="h-8 w-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-extrabold" style={{ color: "var(--ink-soft)" }}>{packageVariantLabel(variant.name)}</span>
                        <span className="block truncate text-[9px]" style={{ color: "var(--muted-2)" }}>
                          {formatNumber(variant.components.length)} قطع · مخزون {formatNumber(variant.stock)}
                        </span>
                      </span>
                      <span className="money shrink-0 text-[11px]" style={{ color: "var(--brand-strong)" }}>{formatMoney(variant.price)}</span>
                      <Plus size={13} className="shrink-0" style={{ color: "var(--success)" }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {((tab === "products" && filteredProducts.length === 0) || (tab === "packages" && filteredPackages.length === 0)) && (
              <p className="rounded-xl p-6 text-center text-xs muted" style={{ background: "var(--surface-2)" }}>
                لا توجد نتائج مطابقة لبحثك.
              </p>
            )}
          </div>

          {/* Cart */}
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-extrabold" style={{ color: "var(--ink)" }}>السلّة</p>
              <span className="badge badge-muted">{formatNumber(units)} قطعة</span>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: "var(--line-strong)" }}>
                <ReceiptText size={26} className="mx-auto mb-2" style={{ color: "var(--muted-2)" }} />
                <p className="text-xs font-extrabold" style={{ color: "var(--muted)" }}>لم تضيفي أي عنصر بعد</p>
                <p className="mt-1 text-[11px] muted-2">اختاري متغير منتج أو بكدجًا فرعيًا من الأعلى.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.key} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                    <Thumb src={item.imageUrl} size="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--ink)" }}>{item.name}</p>
                      <p className="truncate text-[9px]" style={{ color: "var(--muted-2)" }}>{item.subtitle}</p>
                      <p className="mono max-w-full truncate text-[9px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{item.sku}</p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <button type="button" onClick={() => changeQuantity(item.key, -1)} className="grid h-7 w-7 place-items-center" style={{ color: "var(--muted)" }} aria-label="تقليل الكمية"><Minus size={12} /></button>
                      <span className="w-6 text-center text-[11px] font-black mono" style={{ color: "var(--ink)" }}>{formatNumber(item.quantity)}</span>
                      <button type="button" onClick={() => changeQuantity(item.key, 1)} className="grid h-7 w-7 place-items-center" style={{ color: "var(--muted)" }} aria-label="زيادة الكمية"><Plus size={12} /></button>
                    </div>
                    <div className="w-14 shrink-0 text-left sm:w-16">
                      <p className="money text-[10px] sm:text-[11px]" style={{ color: "var(--brand-strong)" }}>{formatMoney(item.unitPrice * item.quantity)}</p>
                      <p className="hidden text-[9px] sm:block" style={{ color: "var(--muted-2)" }}>{formatMoney(item.unitPrice)} / قطعة</p>
                    </div>
                    <button type="button" onClick={() => removeItem(item.key)} className="btn-icon shrink-0" style={{ color: "var(--danger)" }} aria-label="حذف العنصر"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="app-card p-4 sm:p-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><StickyNote size={19} /></span>
            <div>
              <h2 className="section-title">ملاحظات الفاتورة</h2>
              <p className="mt-0.5 text-[11px] muted-2">تظهر في مستند الفاتورة المطبوع.</p>
            </div>
          </div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} placeholder="ملاحظات إضافية عن الطلب أو التوصيل…" className="field resize-none" />
        </section>
      </div>

      {/* Summary */}
      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="app-card p-5">
          <div className="flex items-center gap-2">
            <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><BadgePercent size={19} /></span>
            <div>
              <h2 className="section-title">الملخص</h2>
              <p className="text-[10px] muted-2">{formatNumber(units)} قطعة في {formatNumber(cart.length)} عنصر</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--muted)" }}>الإجمالي قبل الخصم</span>
              <span className="money" style={{ color: "var(--ink-soft)" }}>{formatMoney(totalBeforeDiscount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--muted)" }}>إجمالي البيع</span>
              <span className="money" style={{ color: "var(--ink-soft)" }}>{formatMoney(subtotal)}</span>
            </div>
            {totalBeforeDiscount > subtotal && (
              <div className="flex items-center justify-between" style={{ color: "var(--success)" }}>
                <span className="font-bold">خصم المتغيرات</span>
                <span className="money">− {formatMoney(totalBeforeDiscount - subtotal)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <div>
              <span className="field-label">خصم إضافي على الفاتورة</span>
              <div className="grid grid-cols-[1fr_1.1fr] gap-2">
                <select value={discountType} onChange={(event) => setDiscountType(event.target.value as DiscountType)} className="field py-2 text-[11px]">
                  {DISCOUNT_TYPES.map((type) => <option key={type} value={type}>{discountTypeLabels[type]}</option>)}
                </select>
                <input value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} type="number" min={0} max={discountType === "percent" ? 100 : undefined} step="0.01" inputMode="decimal" className="field py-2 text-[11px] money" />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--muted)" }}>الإجمالي الفرعي</span>
              <span className="money" style={{ color: "var(--ink-soft)" }}>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--muted)" }}>الخصم</span>
              <span className="money" style={{ color: "var(--danger)" }}>− {formatMoney(discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--muted)" }}>التوصيل</span>
              <span className="money" style={{ color: "var(--ink-soft)" }}>{formatMoney(Number(deliveryFee) || 0)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--line)" }}>
              <span className="text-xs font-extrabold" style={{ color: "var(--ink)" }}>الإجمالي النهائي</span>
              <span className="money text-lg" style={{ color: "var(--brand-strong)" }}>{formatMoney(total)}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {editing ? (
              <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                <p className="text-[10px] font-bold">المدفوع المسجّل (غير قابل للتعديل هنا)</p>
                <p className="money mt-1 text-sm">{formatMoney(paidAmount)}</p>
                <p className="mt-1 text-[9px] leading-4">إضافة الدفعات أو تعديلها تتم من صفحة الفاتورة بعد الحفظ.</p>
              </div>
            ) : (
              <>
                <label>
                  <span className="field-label">المبلغ المدفوع</span>
                  <span className="relative block">
                    <Wallet size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-2)" }} />
                    <input value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} type="number" min={0} step="0.01" inputMode="decimal" className="field pr-8 money" />
                  </span>
                </label>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setPaidAmount(String(total))} className="btn btn-outline flex-1 px-2 py-1.5 text-[10px]"><Check size={12} />دفع كامل</button>
                  <button type="button" onClick={() => setPaidAmount("0")} className="btn btn-outline flex-1 px-2 py-1.5 text-[10px]">بدون دفع</button>
                </div>
              </>
            )}
            <label>
              <span className="field-label">طريقة الدفع</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="field py-2 text-[11px]">
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">تاريخ الاستحقاق (اختياري)</span>
              <input value={dueDate ?? ""} onChange={(event) => setDueDate(event.target.value)} type="date" className="field py-2 text-[11px]" />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: remaining > 0 ? "var(--danger-soft)" : "var(--success-soft)" }}>
            <span className="text-[11px] font-extrabold" style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>المتبقي بعد الدفع</span>
            <span className="money text-sm" style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>{formatMoney(remaining)}</span>
          </div>

          <button type="submit" disabled={saving || cart.length === 0} className="btn btn-primary mt-4 w-full" aria-busy={saving}>
            {saving ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />جارِ الحفظ…</>
            ) : (
              <><ReceiptText size={16} />{editing ? "حفظ تعديلات الفاتورة" : "حفظ وإصدار الفاتورة"}</>
            )}
          </button>
          <Link href={editing ? `/invoices/${invoiceId}` : "/invoices"} className="btn btn-outline mt-2 w-full">إلغاء</Link>
        </section>
      </aside>
    </form>
  );
}
