"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  DollarSign,
  Download,
  Filter,
  History,
  Layers,
  Minus,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { formatMoney } from "@/lib/format";
import { canonicalColorName } from "@/lib/colors";
import {
  type ComprehensiveInventoryData,
  inventoryTransactionLabels,
} from "@/lib/inventory-types";

interface InventoryDashboardProps {
  initialData: ComprehensiveInventoryData;
}

export default function InventoryDashboard({ initialData }: InventoryDashboardProps) {
  const toast = useToast();
  const [data, setData] = useState<ComprehensiveInventoryData>(initialData);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "healthy">("all");
  const [activeTab, setActiveTab] = useState<"variants" | "packages" | "alerts" | "history">("variants");

  // Inline restock modal / state
  const [adjustModal, setAdjustModal] = useState<{
    variantId: string;
    productName: string;
    sku: string;
    color: string;
    size: string;
    currentStock: number;
    targetStock: number;
    notes: string;
    type: "restock" | "manual_adjustment" | "damage_or_loss";
  } | null>(null);

  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Refresh entire data
  const refreshData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory/adjust");
      if (!res.ok) throw new Error("تعذر جلب البيانات");
      window.location.reload();
    } catch {
      toast.error("تعذر تحديث البيانات، يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  // Perform Stock Adjustment
  const submitAdjustment = async () => {
    if (!adjustModal) return;
    try {
      setAdjustSubmitting(true);
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: adjustModal.variantId,
          newStock: adjustModal.targetStock,
          type: adjustModal.type,
          notes: adjustModal.notes.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "فشل تعديل الرصيد");

      toast.success(`تم تحديث رصيد ${adjustModal.productName} بنجاح إلى ${adjustModal.targetStock} قطعة.`);

      // Optimistically update local data
      setData((prev) => {
        const nextVariants = prev.variants.map((v) =>
          v.variant_id === adjustModal.variantId ? { ...v, stock: adjustModal.targetStock } : v,
        );

        const delta = adjustModal.targetStock - adjustModal.currentStock;
        const nextPieces = Math.max(0, prev.analytics.total_stock_pieces + delta);
        const outCount = nextVariants.filter((v) => v.stock === 0).length;
        const lowCount = nextVariants.filter((v) => v.stock > 0 && v.stock <= v.min_stock_alert).length;
        const healthyCount = nextVariants.filter((v) => v.stock > v.min_stock_alert).length;

        return {
          ...prev,
          analytics: {
            ...prev.analytics,
            total_stock_pieces: nextPieces,
            out_of_stock_count: outCount,
            low_stock_count: lowCount,
            healthy_stock_count: healthyCount,
          },
          variants: nextVariants,
          alerts: nextVariants
            .filter((v) => v.stock <= v.min_stock_alert)
            .map((v) => ({
              variant_id: v.variant_id,
              product_id: v.product_id,
              product_name: v.product_name,
              primary_sku: v.primary_sku,
              color: v.color,
              size: v.size,
              sku: v.sku,
              stock: v.stock,
              min_stock_alert: v.min_stock_alert,
              price: v.price,
              image_url: v.image_url,
              product_image_url: v.image_url,
            })),
        };
      });

      setAdjustModal(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذر إتمام التعديل");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Quick delta increment/decrement
  const handleQuickAdjust = async (
    variantId: string,
    currentStock: number,
    delta: number,
    productName: string,
  ) => {
    const newStock = Math.max(0, currentStock + delta);
    if (newStock === currentStock) return;

    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          newStock,
          type: delta > 0 ? "restock" : "manual_adjustment",
          notes: delta > 0 ? `إضافة سريعة (+${delta})` : `خصم سريع (${delta})`,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "تعذر تعديل الرصيد");

      toast.success(`تم تحديث رصيد ${productName}: ${newStock} قطعة`);

      setData((prev) => ({
        ...prev,
        variants: prev.variants.map((v) =>
          v.variant_id === variantId ? { ...v, stock: newStock } : v,
        ),
      }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل التعديل السريع");
    }
  };

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return data.variants.filter((item) => {
      // Stock level filter
      if (stockFilter === "out" && item.stock > 0) return false;
      if (stockFilter === "low" && (item.stock === 0 || item.stock > item.min_stock_alert)) return false;
      if (stockFilter === "healthy" && item.stock <= item.min_stock_alert) return false;

      // Search query
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        item.product_name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.primary_sku.toLowerCase().includes(q) ||
        canonicalColorName(item.color).toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(q))
      );
    });
  }, [data.variants, stockFilter, query]);

  const { analytics, packages, alerts, transactions } = data;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md"
              style={{ background: "linear-gradient(135deg, var(--brand), #8b5cf6)" }}
            >
              <Boxes size={22} />
            </span>
            <div>
              <h1 className="text-xl font-black text-ink">المخزون والتحليلات المجمعة</h1>
              <p className="text-xs font-bold text-muted">
                إدارة الأرصدة الحية، مراقبة الاختناقات في البكدجات، والتنبيهات الاستباقية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-[var(--surface-3)] active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>تحديث البيانات</span>
          </button>

          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--brand), #a855f7)" }}
          >
            <Plus size={15} />
            <span>منتج جديد</span>
          </Link>
        </div>
      </div>

      {/* KPI Financial & Volume Metrics Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pieces */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">إجمالي قطع المخزون</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Boxes size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{analytics.total_stock_pieces.toLocaleString()} <span className="text-xs font-bold text-muted">قطعة</span></p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
            <span>{analytics.total_products} منتج</span>
            <span>·</span>
            <span>{analytics.total_variants} متغير</span>
          </div>
        </div>

        {/* Total Cost Value */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">قيمة المخزون (سعر التوريد)</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Coins size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{formatMoney(analytics.total_cost_value)}</p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
            <span>رأس المال المستثمر في البضاعة</span>
          </div>
        </div>

        {/* Retail Potential Profit */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">القيمة البيعية والأرباح المتوقعة</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatMoney(analytics.total_retail_value)}</p>
          <div className="mt-2.5 flex items-center justify-between text-[10.5px] font-bold">
            <span className="text-muted">صافي الربح المتوقع:</span>
            <span className="text-emerald-600 dark:text-emerald-400">+{formatMoney(analytics.potential_profit)}</span>
          </div>
        </div>

        {/* Stock Health & Alerts Summary */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">حالة الأرصدة والتنبيهات</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-xl font-black text-rose-600">{analytics.out_of_stock_count} <span className="text-[10px] font-bold text-muted">نافد</span></span>
            <span className="text-xl font-black text-amber-600">{analytics.low_stock_count} <span className="text-[10px] font-bold text-muted">منخفض</span></span>
            <span className="text-xl font-black text-emerald-600">{analytics.healthy_stock_count} <span className="text-[10px] font-bold text-muted">سليم</span></span>
          </div>
          {/* Visual health bar */}
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              style={{
                width: `${analytics.total_variants > 0 ? (analytics.healthy_stock_count / analytics.total_variants) * 100 : 0}%`,
              }}
              className="bg-emerald-500 transition-all"
              title="رصيد متوفر وسليم"
            />
            <div
              style={{
                width: `${analytics.total_variants > 0 ? (analytics.low_stock_count / analytics.total_variants) * 100 : 0}%`,
              }}
              className="bg-amber-500 transition-all"
              title="رصيد منخفض"
            />
            <div
              style={{
                width: `${analytics.total_variants > 0 ? (analytics.out_of_stock_count / analytics.total_variants) * 100 : 0}%`,
              }}
              className="bg-rose-500 transition-all"
              title="رصيد نافد"
            />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("variants")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "variants"
              ? "bg-purple-600 text-white shadow-sm"
              : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
          }`}
        >
          <Boxes size={15} />
          <span>جدول أرصدة القطع ({data.variants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "packages"
              ? "bg-purple-600 text-white shadow-sm"
              : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
          }`}
        >
          <Layers size={15} />
          <span>جاهزية البكدجات والاختناق ({packages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("alerts")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "alerts"
              ? "bg-rose-600 text-white shadow-sm"
              : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
          }`}
        >
          <AlertTriangle size={15} />
          <span>تنبيهات النواقص ({alerts.length})</span>
          {alerts.length > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-rose-700 px-1 text-[10px] font-black">
              {alerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "history"
              ? "bg-purple-600 text-white shadow-sm"
              : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
          }`}
        >
          <History size={15} />
          <span>سجل حركات المخزون ({transactions.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL VARIANTS TABLE */}
      {activeTab === "variants" && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحثي باسم الموديل، كود SKU، المقاس، اللون، أو المورد..."
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] pr-10 pl-4 py-2 text-xs font-bold text-ink outline-none focus:border-purple-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted ml-1">تصفية:</span>
              <button
                type="button"
                onClick={() => setStockFilter("all")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  stockFilter === "all"
                    ? "bg-purple-600 text-white"
                    : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("out")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  stockFilter === "out"
                    ? "bg-rose-600 text-white"
                    : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                }`}
              >
                نافد ({analytics.out_of_stock_count})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("low")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  stockFilter === "low"
                    ? "bg-amber-600 text-white"
                    : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                }`}
              >
                منخفض ({analytics.low_stock_count})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("healthy")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  stockFilter === "healthy"
                    ? "bg-emerald-600 text-white"
                    : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                }`}
              >
                متوفر ({analytics.healthy_stock_count})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--surface-2)] text-muted">
                <tr>
                  <th className="p-3.5 font-black">المنتج / الموديل</th>
                  <th className="p-3.5 font-black">المتغير (اللون والمقاس)</th>
                  <th className="p-3.5 font-black">كود SKU</th>
                  <th className="p-3.5 font-black">المورد</th>
                  <th className="p-3.5 font-black">التكلفة / البيع</th>
                  <th className="p-3.5 font-black text-center">الرصيد الحالي</th>
                  <th className="p-3.5 font-black text-center">حد الأمان</th>
                  <th className="p-3.5 font-black text-center">تعديل سريع</th>
                  <th className="p-3.5 font-black text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredVariants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted">
                      لا توجد منتجات مطابقة لخيارات البحث
                    </td>
                  </tr>
                ) : (
                  filteredVariants.map((item) => {
                    const isOut = item.stock === 0;
                    const isLow = !isOut && item.stock <= item.min_stock_alert;

                    return (
                      <tr
                        key={item.variant_id}
                        className={`transition hover:bg-[var(--surface-2)]/60 ${
                          isOut ? "bg-rose-500/5" : isLow ? "bg-amber-500/5" : ""
                        }`}
                      >
                        {/* Product Info */}
                        <td className="p-3.5 font-bold">
                          <div className="flex items-center gap-2.5">
                            {item.image_url ? (
                              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[var(--line)] flex-shrink-0">
                                <Image
                                  src={item.image_url}
                                  alt={item.product_name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-2)] text-muted flex-shrink-0">
                                <Package size={16} />
                              </div>
                            )}
                            <div>
                              <p className="font-black text-ink">{item.product_name}</p>
                              {item.category && (
                                <span className="text-[10px] text-muted">{item.category}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Variant Info */}
                        <td className="p-3.5 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-lg bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-ink">
                              {canonicalColorName(item.color)}
                            </span>
                            <span className="rounded-lg bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-black text-ink">
                              {item.size}
                            </span>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="p-3.5 font-mono text-[11px] font-bold text-muted">
                          {item.sku}
                        </td>

                        {/* Supplier */}
                        <td className="p-3.5 text-muted font-bold">
                          {item.supplier_name || "—"}
                        </td>

                        {/* Pricing */}
                        <td className="p-3.5">
                          <p className="font-black text-ink">{formatMoney(item.price)}</p>
                          <p className="text-[10px] text-muted">توريد: {formatMoney(item.supply_price)}</p>
                        </td>

                        {/* Stock Balance */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-xl px-2.5 py-1 text-xs font-black shadow-sm ${
                              isOut
                                ? "bg-rose-500 text-white animate-pulse"
                                : isLow
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {item.stock} قطعة
                          </span>
                        </td>

                        {/* Min Stock Alert */}
                        <td className="p-3.5 text-center font-bold text-muted">
                          {item.min_stock_alert}
                        </td>

                        {/* Quick Adjust Buttons */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjust(item.variant_id, item.stock, -1, item.product_name)}
                              disabled={item.stock <= 0}
                              title="خصم قطعة (-1)"
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink hover:bg-[var(--surface-3)] active:scale-95 disabled:opacity-30"
                            >
                              <Minus size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjust(item.variant_id, item.stock, 1, item.product_name)}
                              title="إضافة قطعة (+1)"
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink hover:bg-[var(--surface-3)] active:scale-95"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjust(item.variant_id, item.stock, 5, item.product_name)}
                              title="إضافة 5 قطع (+5)"
                              className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-1 text-[10px] font-black text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 active:scale-95"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        {/* Detailed Adjustment Modal Trigger */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustModal({
                                variantId: item.variant_id,
                                productName: item.product_name,
                                sku: item.sku,
                                color: item.color,
                                size: item.size,
                                currentStock: item.stock,
                                targetStock: item.stock,
                                notes: "",
                                type: "restock",
                              })
                            }
                            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-[var(--surface-3)] hover:border-purple-400 transition"
                          >
                            تسوية / توريد
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PACKAGES READINESS & BOTTLENECK ANALYZER */}
      {activeTab === "packages" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-black text-ink">تحليل الجاهزية وعناصر الاختناق للبكدجات</h3>
            <p className="text-xs text-muted mt-0.5">
              مخزون البكدجات يتحدد تلقائياً بناءً على أقل مكون متوفر من المنتجات المكونة له (عنصر الاختناق).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-ink">{pkg.name}</h4>
                      <p className="font-mono text-[11px] text-muted">{pkg.primary_sku}</p>
                    </div>
                    <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-black text-purple-600 dark:text-purple-400">
                      {pkg.variants.length} بكدج فرعي
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pkg.variants.map((v) => {
                      const isZero = v.calculated_stock === 0;
                      return (
                        <div
                          key={v.id}
                          className={`rounded-xl border p-3 ${
                            isZero
                              ? "border-rose-500/30 bg-rose-500/5"
                              : v.calculated_stock <= 2
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-[var(--line)] bg-[var(--surface-2)]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-ink">{v.name}</span>
                            <span
                              className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                                isZero
                                  ? "bg-rose-500 text-white"
                                  : v.calculated_stock <= 2
                                  ? "bg-amber-500 text-white"
                                  : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              جاهز للتجميع: {v.calculated_stock}
                            </span>
                          </div>

                          {/* Bottleneck Notice */}
                          {v.bottleneck && (
                            <div className="mt-2 flex items-start gap-1.5 text-[11px]">
                              <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-muted">
                                <span className="font-black text-ink">عنصر الاختناق المحدود: </span>
                                {v.bottleneck.product_name} ({canonicalColorName(v.bottleneck.color)} / {v.bottleneck.size}) — المتاح {v.bottleneck.current_stock} قطعة
                              </p>
                            </div>
                          )}

                          {/* Components list */}
                          <div className="mt-2 border-t border-[var(--line)] pt-2 flex flex-wrap gap-1">
                            {v.components.map((comp, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] text-muted"
                              >
                                {comp.product_name} ×{comp.required_qty} (متاح: {comp.current_stock})
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between">
                  <Link
                    href={`/packages/${pkg.id}`}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    تعديل البكدج في الإدارة ←
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LOW STOCK ALERTS */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-500" />
              <h3 className="text-sm font-black text-rose-700 dark:text-rose-300">
                لوحة التنبيهات الحرجة لنواقص المخزون
              </h3>
            </div>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">
              يتم إدراج أي متغير يصل رصيده إلى حد الأمان المحدد أو ينفد تماماً. يمكنك طلب التوريد أو تسوية الرصيد مباشرة.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.length === 0 ? (
              <div className="col-span-full p-12 text-center rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-black text-ink">مخزونك في حالة ممتازة!</p>
                <p className="text-xs text-muted mt-1">لا توجد قطع منخفضة عن حد الأمان حالياً.</p>
              </div>
            ) : (
              alerts.map((al) => {
                const isOut = al.stock === 0;
                return (
                  <div
                    key={al.variant_id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            isOut
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {isOut ? "نافد تماماً (0 قطع)" : "رصيد منخفض ومقترب من النفاد"}
                        </span>
                        <span className="font-mono text-[11px] text-muted">{al.sku}</span>
                      </div>

                      <h4 className="mt-2 text-sm font-black text-ink">{al.product_name}</h4>
                      <p className="text-xs font-bold text-muted">
                        اللون: {canonicalColorName(al.color)} · المقاس: {al.size}
                      </p>

                      <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-2.5 text-xs font-bold">
                        <div>
                          <span className="text-muted block text-[10px]">الرصيد المتبقي:</span>
                          <span className={`text-base font-black ${isOut ? "text-rose-600" : "text-amber-600"}`}>
                            {al.stock} قطعة
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-muted block text-[10px]">حد الأمان المطلوب:</span>
                          <span className="text-ink font-black">{al.min_stock_alert} قطعة</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAdjustModal({
                            variantId: al.variant_id,
                            productName: al.product_name,
                            sku: al.sku,
                            color: al.color,
                            size: al.size,
                            currentStock: al.stock,
                            targetStock: al.stock + 10,
                            notes: "توريد عاجل لتغطية النواقص",
                            type: "restock",
                          })
                        }
                        className="flex-1 rounded-xl py-2 text-center text-xs font-black text-white shadow-sm transition active:scale-95"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
                      >
                        توريد سريع (+10 قطع)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAdjustModal({
                            variantId: al.variant_id,
                            productName: al.product_name,
                            sku: al.sku,
                            color: al.color,
                            size: al.size,
                            currentStock: al.stock,
                            targetStock: al.stock,
                            notes: "",
                            type: "manual_adjustment",
                          })
                        }
                        className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold text-ink hover:bg-[var(--surface-3)] transition"
                      >
                        تسوية
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LEDGER TRANSACTIONS */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-black text-ink">سجل حركات المخزون والتدقيق المحاسبي</h3>
            <p className="text-xs text-muted mt-0.5">
              كل صرف فاتورة، استرجاع، توريد جديد، أو تسوية يدوية يتم توثيقها تلقائياً مع الرصيد السابق والجديد والمستخدم.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--surface-2)] text-muted">
                <tr>
                  <th className="p-3.5 font-black">الوقت والتاريخ</th>
                  <th className="p-3.5 font-black">نوع الحركة</th>
                  <th className="p-3.5 font-black">المنتج والمتغير</th>
                  <th className="p-3.5 font-black text-center">الكمية المصروفة / المضافة</th>
                  <th className="p-3.5 font-black text-center">الرصيد السابق ← الجديد</th>
                  <th className="p-3.5 font-black">الملاحظات والمرجع</th>
                  <th className="p-3.5 font-black">المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      لا توجد حركات مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPositive = tx.change_qty > 0;
                    return (
                      <tr key={tx.id} className="transition hover:bg-[var(--surface-2)]/50">
                        <td className="p-3.5 text-muted whitespace-nowrap font-medium">
                          {new Intl.DateTimeFormat("ar-EG", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(tx.created_at))}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-black ${
                              tx.type === "invoice_deduction"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : tx.type === "invoice_restore"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : tx.type === "restock"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {inventoryTransactionLabels[tx.type] || tx.type}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold">
                          <p className="text-ink font-black">{tx.product_name}</p>
                          <p className="text-[10px] text-muted">
                            {canonicalColorName(tx.color)} / {tx.size} ({tx.sku})
                          </p>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`font-black text-sm ${
                              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? `+${tx.change_qty}` : tx.change_qty}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-muted">
                          {tx.previous_stock} ← <span className="text-ink font-black">{tx.new_stock}</span>
                        </td>
                        <td className="p-3.5 text-muted max-w-[240px] truncate" title={tx.notes || ""}>
                          {tx.notes || tx.reference_id || "—"}
                        </td>
                        <td className="p-3.5 text-muted font-medium">
                          {tx.created_by || "النظام"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-sm font-black text-ink">تسوية وتوريد رصيد المخزون</h3>
                <p className="text-[11px] font-bold text-muted">{adjustModal.productName} ({adjustModal.sku})</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink hover:bg-[var(--surface-2)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-[var(--surface-2)] p-3 flex items-center justify-between">
                <span className="font-bold text-muted">الرصيد المسجل حالياً:</span>
                <span className="text-base font-black text-ink">{adjustModal.currentStock} قطعة</span>
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">نوع العملية:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModal({ ...adjustModal, type: "restock" })}
                    className={`rounded-xl py-2 px-1 text-center font-bold transition ${
                      adjustModal.type === "restock"
                        ? "bg-purple-600 text-white"
                        : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                    }`}
                  >
                    توريد بضاعة
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustModal({ ...adjustModal, type: "manual_adjustment" })}
                    className={`rounded-xl py-2 px-1 text-center font-bold transition ${
                      adjustModal.type === "manual_adjustment"
                        ? "bg-purple-600 text-white"
                        : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                    }`}
                  >
                    تعديل يدوي
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustModal({ ...adjustModal, type: "damage_or_loss" })}
                    className={`rounded-xl py-2 px-1 text-center font-bold transition ${
                      adjustModal.type === "damage_or_loss"
                        ? "bg-rose-600 text-white"
                        : "border border-[var(--line)] bg-[var(--surface-2)] text-muted hover:text-ink"
                    }`}
                  >
                    هالك / فقدان
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">الرصيد الجديد المستهدف:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustModal({
                        ...adjustModal,
                        targetStock: Math.max(0, adjustModal.targetStock - 1),
                      })
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)] font-black text-base"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={adjustModal.targetStock}
                    onChange={(e) =>
                      setAdjustModal({
                        ...adjustModal,
                        targetStock: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-center text-lg font-black text-ink outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustModal({
                        ...adjustModal,
                        targetStock: adjustModal.targetStock + 1,
                      })
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)] font-black text-base"
                  >
                    +
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setAdjustModal({
                          ...adjustModal,
                          targetStock: adjustModal.currentStock + num,
                        })
                      }
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-black text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">السبب / الملاحظات:</label>
                <input
                  type="text"
                  value={adjustModal.notes}
                  onChange={(e) => setAdjustModal({ ...adjustModal, notes: e.target.value })}
                  placeholder="مثال: فاتورة توريد رقم 402، جرد شهري، قطعة معيبة..."
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs font-bold text-ink outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={submitAdjustment}
                disabled={adjustSubmitting}
                className="flex-1 rounded-xl py-2.5 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
              >
                {adjustSubmitting ? "جارٍ الحفظ والتسوية..." : "تأكيد وتحديث الرصيد"}
              </button>
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-bold text-muted hover:text-ink hover:bg-[var(--surface-2)]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
