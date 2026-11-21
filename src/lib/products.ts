import {
  applyDiscount,
  DISCOUNT_TYPES,
  discountPercent,
  roundMoney,
  type DiscountType,
} from "@/lib/packages";
import { canonicalColorName, normalizeColorName } from "@/lib/colors";
import { supplierRef, supplyPrice } from "@/lib/suppliers";

export type ProductVariantInput = {
  id?: string;
  color: string;
  size: string;
  sku: string;
  price: number;
  beforePrice: number;
  discountType: DiscountType;
  discountValue: number;
  supplierId: string | null;
  supplyPrice: number;
  imageUrl: string | null;
  stock: number;
  minStockAlert: number;
};

export function validateProduct(data: unknown) {
  const body = data as { name?: unknown; primarySku?: unknown; description?: unknown; variants?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const primarySku = typeof body.primarySku === "string" ? body.primarySku.trim().toUpperCase() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!name || name.length > 180 || !primarySku || primarySku.length > 80) {
    throw new Error("أدخلي اسم المنتج والكود الرئيسي بصورة صحيحة.");
  }
  if (description.length > 2000) throw new Error("الوصف طويل جدًا.");
  if (!Array.isArray(body.variants) || body.variants.length === 0 || body.variants.length > 100) {
    throw new Error("أضيفي متغيرًا واحدًا على الأقل للمنتج.");
  }

  const variants = body.variants.map((item): ProductVariantInput => {
    const variant = item as {
      id?: unknown;
      color?: unknown;
      size?: unknown;
      sku?: unknown;
      price?: unknown;
      beforePrice?: unknown;
      discountType?: unknown;
      discountValue?: unknown;
      supplierId?: unknown;
      supplyPrice?: unknown;
      imageUrl?: unknown;
      stock?: unknown;
      minStockAlert?: unknown;
    };
    const color = typeof variant.color === "string" ? canonicalColorName(variant.color) : "";
    const size = typeof variant.size === "string" ? variant.size.trim() : "";
    const sku = typeof variant.sku === "string" ? variant.sku.trim().toUpperCase() : "";

    const rawPrice = typeof variant.price === "number" ? variant.price : Number(variant.price);
    const rawBefore = typeof variant.beforePrice === "number" ? variant.beforePrice : Number(variant.beforePrice);
    const safePrice = Number.isFinite(rawPrice) ? Math.max(0, rawPrice) : 0;
    const beforePrice = Number.isFinite(rawBefore) && rawBefore >= safePrice ? Math.max(0, rawBefore) : safePrice;

    const discountType: DiscountType = DISCOUNT_TYPES.includes(variant.discountType as DiscountType)
      ? (variant.discountType as DiscountType)
      : "percent";

    const hasDiscountValue =
      variant.discountValue !== undefined && variant.discountValue !== null && variant.discountValue !== "";
    const suppliedValue = Number(variant.discountValue);
    const discountValue = hasDiscountValue && Number.isFinite(suppliedValue)
      ? roundMoney(Math.max(0, suppliedValue))
      : discountPercent(beforePrice, safePrice);

    if (discountType === "percent" && discountValue > 100) {
      throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%.");
    }

    const price = applyDiscount(beforePrice, discountType, discountValue);

    if (
      !color || color.length > 80 ||
      !size || size.length > 40 ||
      !sku || sku.length > 80 ||
      !Number.isFinite(price) || price < 0
    ) {
      throw new Error("تحققي من بيانات كل متغير وأسعاره.");
    }

    const rawStock = typeof variant.stock === "number" ? variant.stock : Number(variant.stock);
    const stock = Number.isFinite(rawStock) && rawStock >= 0 ? Math.trunc(rawStock) : 0;
    const rawMinAlert = typeof variant.minStockAlert === "number" ? variant.minStockAlert : Number(variant.minStockAlert);
    const minStockAlert = Number.isFinite(rawMinAlert) && rawMinAlert >= 0 ? Math.trunc(rawMinAlert) : 3;
    const variantId = typeof variant.id === "string" && variant.id.trim() ? variant.id.trim() : undefined;

    const imageUrl = typeof variant.imageUrl === "string" && variant.imageUrl.length ? variant.imageUrl : null;
    return {
      id: variantId,
      color,
      size,
      sku,
      price,
      beforePrice,
      discountType,
      discountValue,
      supplierId: supplierRef(variant.supplierId),
      supplyPrice: supplyPrice(variant.supplyPrice),
      imageUrl,
      stock,
      minStockAlert,
    };
  });

  const codes = new Set([primarySku]);
  const combinations = new Set<string>();
  for (const variant of variants) {
    if (codes.has(variant.sku)) throw new Error("الأكواد يجب أن تكون مختلفة.");
    codes.add(variant.sku);
    const combination = `${normalizeColorName(variant.color)}|${normalizeColorName(variant.size)}`;
    if (combinations.has(combination)) throw new Error("لا يمكن تكرار نفس اللون والمقاس.");
    combinations.add(combination);
  }

  return { name, primarySku, description: description || null, variants };
}
