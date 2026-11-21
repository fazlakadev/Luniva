"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Gift,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { CatalogPackageDetail, CatalogVariant } from "@/lib/catalog";
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";
import { addToCart, useCart } from "@/lib/cart-store";
import { useToast } from "@/components/toast";
import { generateWhatsAppUrl } from "@/lib/whatsapp-shared";

interface PackagePurchaseBoxProps {
  pkg: CatalogPackageDetail;
  whatsappPhone?: string;
}

export default function PackagePurchaseBox({
  pkg,
  whatsappPhone = "01004140026",
}: PackagePurchaseBoxProps) {
  const toast = useToast();
  const { totalCount } = useCart();

  const variants = pkg.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || "",
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const activeVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  const price = Number(activeVariant?.price) || Number(pkg.starting_price) || 0;
  const beforePrice =
    Number(activeVariant?.priceBeforeDiscount) ||
    Number(pkg.starting_before_price) ||
    0;
  const savings = Math.max(0, beforePrice - price);
  const discount = discountPercent(beforePrice, price);

  function handleAddToCart() {
    addToCart({
      itemId: pkg.id,
      itemType: "package",
      title: activeVariant?.name
        ? `${pkg.name} (${activeVariant.name})`
        : pkg.name,
      variantId: activeVariant?.id,
      variantName: activeVariant?.name,
      color: activeVariant?.color,
      size: activeVariant?.size,
      price,
      priceBeforeDiscount: beforePrice || undefined,
      imageUrl: activeVariant?.imageUrl || pkg.image_url,
      quantity,
    });

    setJustAdded(true);
    toast.success(
      "أضيف البكدج للسلة",
      `تمت إضافة ${quantity} × ${pkg.name} إلى سلة الاستفسارات والطلبات.`,
    );
    setTimeout(() => setJustAdded(false), 2200);
  }

  const whatsappText = `مرحباً لونيفا، أود الاستفسار وطلب البكدج التالي:
• اسم البكدج: ${pkg.name}
${activeVariant ? `• الخيار: ${activeVariant.name || "الأساسي"}\n` : ""}• الكمية: ${quantity}
• السعر الإجمالي: ${formatMoney(price * quantity)}
• عدد القطع بالبكدج: ${pkg.items.length} قطع

أرجو التواصل لتأكيد التفاصيل وموعد الاستلام. شكراً!`;

  const whatsappHref = generateWhatsAppUrl(whatsappPhone, whatsappText);

  return (
    <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-5 shadow-sm">
      {/* Price Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-2)]">
            سعر البكدج بعد الخصم
          </p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span className="money text-2xl font-black sm:text-3xl" style={{ color: "var(--brand-strong)" }}>
              {formatMoney(price)}
            </span>
            {beforePrice > price && (
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

        {savings > 0 && (
          <span className="badge badge-lav text-xs font-bold">
            <Sparkles size={12} />
            توفير {formatMoney(savings)}
          </span>
        )}
      </div>

      {/* Variants if any */}
      {variants.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-[var(--ink)]">خيارات البكدج:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSelected = activeVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    isSelected
                      ? "bg-[var(--brand)] text-white shadow-sm ring-2 ring-[var(--brand-strong)] ring-offset-1"
                      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--brand)]"
                  }`}
                >
                  {v.name || v.size || "خيار"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity & Actions */}
      <div className="mt-5 space-y-3 pt-3 border-t border-[var(--line)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[var(--ink)]">عدد البكدجات:</span>
          <div className="flex items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-30"
              aria-label="تقليل العدد"
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
              aria-label="زيادة العدد"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* Add to Inquiry Cart */}
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
                <span>أضيفي البكدج إلى السلة</span>
              </>
            )}
          </button>

          {/* Instant WhatsApp Inquiry */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-full justify-center border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            <MessageCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>طلب البكدج عبر واتساب</span>
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
