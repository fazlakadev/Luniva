export const PACKAGE_STATUSES = ["active", "draft", "archived"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const packageStatusLabels: Record<PackageStatus, string> = {
  active: "نشط",
  draft: "مسودة",
  archived: "مؤرشف",
};

export const DISCOUNT_TYPES = ["percent", "amount"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const discountTypeLabels: Record<DiscountType, string> = {
  percent: "نسبة مئوية",
  amount: "مبلغ ثابت",
};

export type PackageItemInput = {
  productId: string;
  quantity: number;
};

export type PackageSelectionInput = {
  productId: string;
  variantId: string;
};

export type PackageVariantInput = {
  name: string;
  sku: string;
  stock: number;
  discountType: DiscountType;
  discountValue: number;
  imageUrl: string | null;
  selections: PackageSelectionInput[];
};

export type PackagePayload = {
  name: string;
  primarySku: string;
  description: string | null;
  imageUrl: string | null;
  status: PackageStatus;
  badge: string | null;
  items: PackageItemInput[];
  variants: PackageVariantInput[];
};

export type VariantPriceSource = {
  id: string;
  product_id: string;
  color: string;
  size: string;
  sku: string;
  price: string | number;
  price_before_discount: string | number | null;
  image_url: string | null;
};

export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function applyDiscount(before: number, type: DiscountType, value: number) {
  const base = Math.max(0, roundMoney(before));
  const safeValue = Math.max(0, Number(value) || 0);
  if (type === "percent") return roundMoney(base * (1 - clamp(safeValue, 0, 100) / 100));
  return roundMoney(Math.max(0, base - safeValue));
}

export function discountPercent(before: number, after: number) {
  const base = Number(before) || 0;
  if (base <= 0) return 0;
  return roundMoney(clamp(((base - Number(after || 0)) / base) * 100, 0, 100));
}

export function discountValueForTarget(before: number, target: number, type: DiscountType) {
  const base = Math.max(0, Number(before) || 0);
  if (type === "percent") {
    if (base <= 0) return 0;
    return roundMoney(clamp(((base - clamp(target, 0, base)) / base) * 100, 0, 100));
  }
  return roundMoney(clamp(base - clamp(target, 0, base), 0, base));
}

export function priceSelectionTotal(
  items: PackageItemInput[],
  selections: PackageSelectionInput[],
  variants: Map<string, VariantPriceSource>,
) {
  return roundMoney(
    items.reduce((total, item) => {
      const selection = selections.find((entry) => entry.productId === item.productId);
      const variant = selection ? variants.get(selection.variantId) : undefined;
      if (!variant) return total;
      return total + Number(variant.price ?? 0) * item.quantity;
    }, 0),
  );
}

function cleanOptionalUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizePackagePayload(raw: unknown): PackagePayload {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = readString(body.name);
  const primarySku = readString(body.primarySku).toUpperCase();
  const description = readString(body.description);
  const badge = readString(body.badge);
  const status = PACKAGE_STATUSES.includes(body.status as PackageStatus)
    ? (body.status as PackageStatus)
    : "active";

  if (!name || name.length > 180) throw new Error("أدخلي اسم البكدج بصورة صحيحة.");
  if (!primarySku || primarySku.length > 80) throw new Error("أدخلي الكود الرئيسي للبكدج.");
  if (description.length > 2000) throw new Error("وصف البكدج طويل جدًا.");
  if (badge.length > 60) throw new Error("شارة البكدج طويلة جدًا.");

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    throw new Error("أضيفي منتجًا واحدًا على الأقل إلى البكدج.");
  }

  const productIds = new Set<string>();
  const items = body.items.map((entry): PackageItemInput => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const productId = readString(item.productId);
    const quantity = Math.trunc(asNumber(item.quantity, 1));
    if (!isUuid(productId)) throw new Error("اختاري منتجًا صحيحًا لكل عنصر.");
    if (productIds.has(productId)) throw new Error("لا يمكن تكرار نفس المنتج داخل البكدج.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new Error("كمية كل منتج يجب أن تكون بين 1 و999.");
    }
    productIds.add(productId);
    return { productId, quantity };
  });

  if (!Array.isArray(body.variants) || body.variants.length === 0 || body.variants.length > 150) {
    throw new Error("أضيفي بكدجًا فرعيًا واحدًا على الأقل.");
  }

  const variantSkus = new Set<string>();
  const variantNames = new Set<string>();
  const variants = body.variants.map((entry, index): PackageVariantInput => {
    const variant = (entry ?? {}) as Record<string, unknown>;
    const variantName = readString(variant.name);
    const sku = readString(variant.sku).toUpperCase();
    const stock = Math.trunc(asNumber(variant.stock, 0));
    const discountType = DISCOUNT_TYPES.includes(variant.discountType as DiscountType)
      ? (variant.discountType as DiscountType)
      : "percent";
    const discountValue = roundMoney(Math.max(0, asNumber(variant.discountValue, 0)));

    if (!variantName || variantName.length > 120) throw new Error(`اسم البكدج الفرعي رقم ${index + 1} غير صحيح.`);
    if (!sku || sku.length > 80) throw new Error(`كود البكدج الفرعي رقم ${index + 1} غير صحيح.`);
    if (variantSkus.has(sku)) throw new Error("أكواد البكدجات الفرعية يجب أن تكون مختلفة.");
    if (variantNames.has(variantName)) throw new Error("أسماء البكدجات الفرعية يجب أن تكون مختلفة.");
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) throw new Error("تحققي من مخزون البكدجات الفرعية.");
    if (discountType === "percent" && discountValue > 100) throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%.");

    variantSkus.add(sku);
    variantNames.add(variantName);

    if (!Array.isArray(variant.selections)) throw new Error("اختاري متغيرات المنتجات لكل بكدج فرعي.");
    const selectionProducts = new Set<string>();
    const selections = variant.selections.map((selectionEntry): PackageSelectionInput => {
      const selection = (selectionEntry ?? {}) as Record<string, unknown>;
      const productId = readString(selection.productId);
      const variantId = readString(selection.variantId);
      if (!isUuid(productId) || !isUuid(variantId)) throw new Error("كل بكدج فرعي يحتاج اختيار لون ومقاس لكل منتج.");
      if (!productIds.has(productId)) throw new Error("أحد اختيارات البكدج الفرعي لا يخص منتجات البكدج.");
      if (selectionProducts.has(productId)) throw new Error("لا يمكن اختيار أكثر من متغير لنفس المنتج في البكدج الفرعي.");
      selectionProducts.add(productId);
      return { productId, variantId };
    });

    if (selections.length !== items.length || items.some((item) => !selectionProducts.has(item.productId))) {
      throw new Error("اختاري متغيرًا واحدًا لكل منتج داخل كل بكدج فرعي.");
    }

    return {
      name: variantName,
      sku,
      stock,
      discountType,
      discountValue,
      imageUrl: cleanOptionalUrl(variant.imageUrl),
      selections,
    };
  });

  return {
    name,
    primarySku,
    description: description || null,
    imageUrl: cleanOptionalUrl(body.imageUrl),
    status,
    badge: badge || null,
    items,
    variants,
  };
}
