"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Heart,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog";
import { canonicalColorName, colorInk, colorSwatch } from "@/lib/colors";
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";
import { addToCart, useCart } from "@/lib/cart-store";
import { useToast } from "@/components/toast";
import { generateWhatsAppUrl } from "@/lib/whatsapp-shared";

interface ProductPurchaseBoxProps {
  product: CatalogProduct;
  whatsappPhone?: string;
}

export default function ProductPurchaseBox({
  product,
  whatsappPhone = "01004140026",
}: ProductPurchaseBoxProps) {
  const toast = useToast();
  const { totalCount } = useCart();

  const variants = product.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || "",
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Active variant
  const activeVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  // Color options
  const colorOptions = useMemo(() => {
    const map = new Map<string, CatalogVariant>();
    variants.forEach((v) => {
      const c = v.color?.trim() || "";
      if (c && !map.has(c)) {
        map.set(c, v);
      }
    });
    return Array.from(map.entries()).map(([color, sample]) => ({
      color,
      name: canonicalColorName(color),
      swatch: colorSwatch(color),
      sampleVariant: sample,
    }));
  }, [variants]);

  // Size options for active color
  const sizeOptions = useMemo(() => {
    if (!activeVariant?.color) {
      return variants.map((v) => ({ size: v.size || "قياسي", variant: v }));
    }
    return variants
      .filter((v) => (v.color?.trim() || "") === (activeVariant.color?.trim() || ""))
      .map((v) => ({ size: v.size || "قياسي", variant: v }));
  }, [variants, activeVariant]);

  const price = Number(activeVariant?.price) || 0;
  const beforePrice = Number(activeVariant?.priceBeforeDiscount) || 0;
  const discount = discountPercent(beforePrice, price);

  function handleSelectColor(color: string) {
    // Find variant with this color and currently selected size, or first variant of this color
    const matchSameSize = variants.find(
      (v) => (v.color?.trim() || "") === color && v.size === activeVariant?.size,
    );
    if (matchSameSize) {
      setSelectedVariantId(matchSameSize.id);
    } else {
      const firstWithColor = variants.find((v) => (v.color?.trim() || "") === color);
      if (firstWithColor) setSelectedVariantId(firstWithColor.id);
    }
  }

  function handleAddToCart() {
    if (!activeVariant) return;

    addToCart({
      itemId: product.id,
      itemType: "product",
      title: `${product.name} (${canonicalColorName(activeVariant.color || "") || "لون"} / ${activeVariant.size || "قياسي"})`,
      variantId: activeVariant.id,
      color: activeVariant.color,
      size: activeVariant.size,
      price,
      priceBeforeDiscount: beforePrice || undefined,
      imageUrl: activeVariant.imageUrl || product.image_url,
      quantity,
      sku: activeVariant.sku || product.primary_sku,
    });

    setJustAdded(true);
    toast.success(
      "أضيفت للسلة بنجاح",
      `تمت إضافة ${quantity} × ${product.name} إلى سلة الاستفسارات.`,
    );
    setTimeout(() => setJustAdded(false), 2200);
  }

  // Generate WhatsApp inquiry link
  const whatsappText = `مرحباً أود الاستفسار وطلب القطعة التالية من لونيفا:
• المنتج: ${product.name}
• اللون: ${canonicalColorName(activeVariant?.color || "") || "الافتراضي"}
• المقاس: ${activeVariant?.size || "قياسي"}
• الكمية: ${quantity}
• السعر التقريبي: ${formatMoney(price * quantity)}
• الكود: ${activeVariant?.sku || product.primary_sku || "بدون كود"}

أرجو تأكيد التوفر والتفاصيل. شكراً!`;

  const whatsappHref = generateWhatsAppUrl(whatsappPhone, whatsappText);

  return (
    <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-5 shadow-sm">
      {/* Price Block */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-2)]">
            السعر للقطعة المختارة
          </p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span className="money text-2xl font-black sm:text-3xl" style={{ color: "var(--brand-strong)" }}>
              {formatMoney(price)}
            </span>
            {discount > 0 && beforePrice > price && (
              <span className="money text-sm font-bold line-through text-[var(--muted-2)]">
                {formatMoney(beforePrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="badge badge-success text-[10px] font-black">
                وفر {formatNumber(discount)}%
              </span>
            )}
          </div>
        </div>

        {activeVariant?.stock !== undefined && (
          <div>
            {activeVariant.stock === 0 ? (
              <span className="badge badge-warning text-[11px] font-bold">
                نفد من المخزون
              </span>
            ) : activeVariant.stock <= 3 ? (
              <span className="badge badge-warning text-[11px] font-bold">
                متبقي {activeVariant.stock} فقط
              </span>
            ) : (
              <span className="badge badge-success text-[11px] font-bold">
                ✓ متوفر وجاهز للطلب
              </span>
            )}
          </div>
        )}
      </div>

      {/* Colors Selector */}
      {colorOptions.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--ink)]">اللون المختار:</span>
            <span className="font-black text-[var(--brand-strong)]">
              {canonicalColorName(activeVariant?.color || "") || "اختاري لوناً"}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {colorOptions.map(({ color, name, swatch }) => {
              const isSelected = (activeVariant?.color?.trim() || "") === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelectColor(color)}
                  className={`group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "ring-2 ring-[var(--brand-strong)] ring-offset-2 ring-offset-[var(--surface)] shadow-sm font-black"
                      : "border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--brand)]"
                  }`}
                  style={{
                    color: isSelected ? "var(--ink)" : "var(--muted)",
                  }}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15 shadow-inner"
                    style={{ background: swatch }}
                  />
                  <span>{name}</span>
                  {isSelected && <Check size={12} className="text-[var(--brand-strong)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sizes Selector */}
      {sizeOptions.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--ink)]">المقاس:</span>
            <span className="font-black text-[var(--brand-strong)]">
              {activeVariant?.size || "قياسي"}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {sizeOptions.map(({ size, variant }) => {
              const isSelected = activeVariant?.id === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`min-w-[48px] rounded-xl px-3 py-2 text-center text-xs font-black transition-all ${
                    isSelected
                      ? "bg-[var(--brand)] text-white shadow-sm ring-2 ring-[var(--brand-strong)] ring-offset-1"
                      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--brand)]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity & Order Actions */}
      <div className="mt-5 space-y-3 pt-3 border-t border-[var(--line)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[var(--ink)]">الكمية المطلوبة:</span>
          <div className="flex items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-30"
              aria-label="تقليل الكمية"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-sm font-black text-[var(--ink)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)]"
              aria-label="زيادة الكمية"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* Add to Inquiry Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={`btn relative w-full justify-center py-3 text-xs font-black shadow-md transition-all active:scale-[0.98] ${
              justAdded
                ? "bg-emerald-600 text-white"
                : "btn-primary"
            }`}
          >
            {justAdded ? (
              <>
                <Check size={16} />
                <span>تمت الإضافة للسلة ✓</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>أضيفي إلى سلة الاستفسار</span>
              </>
            )}
          </button>

          {/* Instant WhatsApp Order / Inquiry */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-full justify-center border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            <MessageCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>طلب فوري عبر واتساب</span>
          </a>
        </div>

        {/* View Cart Notification Shortcut */}
        {totalCount > 0 && (
          <Link
            href="/cart"
            className="flex items-center justify-between rounded-xl bg-[var(--brand-soft)] px-3.5 py-2 text-xs font-bold text-[var(--brand-strong)] transition hover:opacity-90"
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={13} />
              <span>سلة الاستفسارات تحتوي على ({totalCount}) عناصر</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-black">
              إتمام الطلب
              <ArrowLeft size={12} />
            </span>
          </Link>
        )}

        {/* Assurance Note */}
        <p className="flex items-center gap-1.5 text-[11px] leading-5 text-[var(--muted-2)]">
          <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
          <span>استفسار وطلب مخصص بدون دفع إلكتروني — سيتواصل معكِ الأتيليه لتأكيد التفاصيل وموعد الاستلام.</span>
        </p>
      </div>
    </div>
  );
}
