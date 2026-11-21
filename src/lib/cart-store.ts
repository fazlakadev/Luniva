"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string; // composite key e.g. `${itemId}-${variantId || 'default'}`
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
  quantity: number;
  sku?: string;
};

const CART_STORAGE_KEY = "luniva_storefront_cart";
const CART_CHANGE_EVENT = "luniva_cart_updated";

function emitCartChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  }
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    emitCartChange();
  } catch (err) {
    console.error("Failed to save cart:", err);
  }
}

export function addToCart(item: Omit<CartItem, "id">) {
  const current = getCart();
  const id = `${item.itemId}_${item.variantId || "def"}_${item.color || ""}_${item.size || ""}`;

  const existingIndex = current.findIndex((i) => i.id === id);
  if (existingIndex >= 0) {
    current[existingIndex].quantity += item.quantity || 1;
  } else {
    current.push({ ...item, id });
  }

  saveCart(current);
}

export function updateCartQuantity(id: string, quantity: number) {
  const current = getCart();
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  const item = current.find((i) => i.id === id);
  if (item) {
    item.quantity = quantity;
    saveCart(current);
  }
}

export function removeFromCart(id: string) {
  const current = getCart().filter((i) => i.id !== id);
  saveCart(current);
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount(): number {
  return getCart().reduce((acc, item) => acc + item.quantity, 0);
}

export function getCartTotal(): number {
  return getCart().reduce((acc, item) => acc + item.price * item.quantity, 0);
}

// React subscription hook
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(getCart());

    const handler = () => {
      setItems(getCart());
    };

    window.addEventListener(CART_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const count = items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    items: mounted ? items : [],
    count: mounted ? count : 0,
    totalCount: mounted ? count : 0,
    total: mounted ? total : 0,
    mounted,
    addItem: addToCart,
    updateQuantity: updateCartQuantity,
    removeItem: removeFromCart,
    clear: clearCart,
  };
}
