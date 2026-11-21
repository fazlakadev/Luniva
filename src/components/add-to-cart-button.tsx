"use client";

import { useState } from "react";
import { Check, ShoppingBag, Plus } from "lucide-react";
import { addToCart } from "@/lib/cart-store";
import { useToast } from "@/components/toast";

interface AddToCartButtonProps {
  itemId: string;
  itemType: "product" | "package";
  title: string;
  variantId?: string;
  variantName?: string;
  color?: string;
  size?: string;
  price: number;
  priceBeforeDiscount?: number;
  imageUrl?: string | null;
  sku?: string;
  className?: string;
  compact?: boolean;
}

export default function AddToCartButton({
  itemId,
  itemType,
  title,
  variantId,
  variantName,
  color,
  size,
  price,
  priceBeforeDiscount,
  imageUrl,
  sku,
  className = "",
  compact = false,
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const toast = useToast();

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    addToCart({
      itemId,
      itemType,
      title: variantName ? `${title} (${variantName})` : title,
      variantId,
      variantName,
      color,
      size,
      price: Number(price) || 0,
      priceBeforeDiscount: priceBeforeDiscount ? Number(priceBeforeDiscount) : undefined,
      imageUrl,
      quantity: 1,
      sku,
    });

    setAdded(true);
    toast.success("تمت الإضافة للسلة", `تمت إضافة "${title}" لسلة طلبات الاستفسار.`);
    setTimeout(() => setAdded(false), 2000);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
          added
            ? "bg-emerald-600 text-white"
            : "bg-[var(--brand-soft)] text-[var(--brand-strong)] hover:bg-[var(--brand)] hover:text-white"
        } ${className}`}
        title="إضافة لسلة الاستفسار"
      >
        {added ? <Check size={13} /> : <Plus size={13} />}
        <span>{added ? "تمت الإضافة" : "طلب واستفسار"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={`w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 ${
        added
          ? "bg-emerald-600 text-white"
          : "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]"
      } ${className}`}
    >
      {added ? <Check size={14} /> : <ShoppingBag size={14} />}
      <span>{added ? "تمت الإضافة لسلة الاستفسار ✓" : "أضيفي لسلة طلب الاستفسار"}</span>
    </button>
  );
}
