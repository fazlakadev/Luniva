import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers3 } from "lucide-react";
import DeleteButton from "@/components/delete-button";
import SupplierForm from "@/components/supplier-form";
import type { SupplierDetail } from "@/components/supplier-form";
import { db, ensureSuppliersTable } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export default async function SupplierDetailPage({ params }: Context) {
  await ensureSuppliersTable();
  const { id } = await params;
  const result = await db.query("SELECT * FROM suppliers WHERE id = $1", [id]);
  if (!result.rowCount) notFound();
  const supplier = result.rows[0] as SupplierDetail;
  const variants = await db.query(`
    SELECT pv.sku, pv.color, pv.size, pv.supply_price, p.id AS product_id, p.name AS product_name
    FROM product_variants pv JOIN products p ON p.id = pv.product_id
    WHERE pv.supplier_id = $1 ORDER BY p.name, pv.color, pv.size
  `, [id]);

  return (
    <div className="page-enter min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/suppliers" className="inline-flex items-center gap-1.5 text-xs font-extrabold hover:underline" style={{ color: "var(--brand-strong)" }}>
          <ArrowLeft size={15} />العودة للموردين
        </Link>
        <DeleteButton endpoint={`/api/suppliers/${id}`} returnTo="/suppliers" label="المورد" />
      </div>

      <SupplierForm supplier={supplier} />

      <section className="app-card mt-6 overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4 sm:p-5" style={{ borderColor: "var(--line)" }}>
          <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Layers3 size={18} /></span>
          <div>
            <h2 className="section-title">متغيرات مسندة للمورد</h2>
            <p className="mt-0.5 text-xs muted">أسعار التوريد الحالية لكل لون ومقاس.</p>
          </div>
        </div>
        {variants.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs muted">لا توجد متغيرات مرتبطة بهذا المورد بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-right text-xs">
              <thead>
                <tr className="border-b text-[10px] muted-2" style={{ borderColor: "var(--line)" }}>
                  <th className="px-5 py-3 font-bold">المنتج</th>
                  <th className="px-3 py-3 font-bold">اللون / المقاس</th>
                  <th className="px-3 py-3 font-bold" dir="ltr">SKU</th>
                  <th className="px-5 py-3 text-left font-bold">سعر التوريد</th>
                </tr>
              </thead>
              <tbody>
                {variants.rows.map((variant) => (
                  <tr key={variant.sku} className="border-b last:border-0" style={{ borderColor: "var(--line)" }}>
                    <td className="px-5 py-3">
                      <Link href={`/products/${variant.product_id}`} className="font-extrabold hover:underline" style={{ color: "var(--ink)" }}>
                        {variant.product_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 muted">{variant.color} / {variant.size}</td>
                    <td className="mono px-3 py-3 text-[10px]" dir="ltr" style={{ color: "var(--muted)" }}>{variant.sku}</td>
                    <td className="money px-5 py-3 text-left font-bold" style={{ color: "var(--brand-strong)" }}>{formatMoney(variant.supply_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
