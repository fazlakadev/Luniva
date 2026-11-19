import Link from "next/link";
import { ArrowLeft, Package, Plus, Store, Wallet } from "lucide-react";
import DeleteButton from "@/components/delete-button";
import { db, ensureSuppliersTable } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  variant_count: number | string;
  product_count: number | string;
  supply_value: string | number;
};

export default async function SuppliersPage() {
  await ensureSuppliersTable();
  const result = await db.query(`
    SELECT s.*,
      (SELECT COUNT(*)::int FROM product_variants pv WHERE pv.supplier_id = s.id) AS variant_count,
      (SELECT COUNT(DISTINCT pv.product_id)::int FROM product_variants pv WHERE pv.supplier_id = s.id) AS product_count,
      (SELECT COALESCE(SUM(pv.supply_price), 0) FROM product_variants pv WHERE pv.supplier_id = s.id) AS supply_value
    FROM suppliers s ORDER BY s.name
  `);
  const suppliers = result.rows as SupplierRow[];
  const totalValue = suppliers.reduce((sum, row) => sum + Number(row.supply_value ?? 0), 0);
  const totalVariants = suppliers.reduce((sum, row) => sum + Number(row.variant_count ?? 0), 0);

  return (
    <div className="page-enter min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">سلسلة التوريد في لونيفا</p>
          <h1 className="page-title mt-1">الموردون وأسعار التوريد</h1>
          <p className="page-subtitle mt-2 max-w-xl text-[12px] leading-7 sm:text-sm">
            نظّمي الموردين واربطيهم بمتغيرات المنتجات، لتحسب لونيفا الربح تلقائيًا عند كل فاتورة.
          </p>
        </div>
        <Link href="/suppliers/new" className="btn btn-primary self-start"><Plus size={16} />مورد جديد</Link>
      </div>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "عدد الموردين", value: formatNumber(suppliers.length), icon: Store, tone: "var(--lav-soft)", color: "var(--lav-strong)" },
          { label: "متغيرات مرتبطة", value: formatNumber(totalVariants), icon: Package, tone: "var(--brand-soft)", color: "var(--brand-strong)" },
          { label: "قيمة التوريد", value: formatMoney(totalValue), icon: Wallet, tone: "var(--success-soft)", color: "var(--success)" },
        ].map(({ label, value, icon: Icon, tone, color }) => (
          <div key={label} className="app-card flex items-center gap-3 p-4">
            <span className="stat-icon shrink-0" style={{ background: tone, color }}><Icon size={18} /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold muted-2">{label}</p>
              <p className="money mt-1 truncate text-lg font-black" style={{ color: "var(--ink)" }}>{value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b p-4 sm:p-5" style={{ borderColor: "var(--line)" }}>
          <h2 className="section-title">دليل الموردين</h2>
          <span className="badge badge-lav">{formatNumber(suppliers.length)} مورد</span>
        </div>

        {suppliers.length === 0 ? (
          <div className="grid place-items-center px-5 py-14 text-center">
            <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Store size={22} /></span>
            <p className="mt-4 text-sm font-extrabold" style={{ color: "var(--ink)" }}>لا يوجد موردون بعد</p>
            <p className="mt-1 text-xs muted">أضيفي أول مورد لتبدأ ربط أسعار التوريد بالمنتجات.</p>
            <Link href="/suppliers/new" className="btn btn-lav mt-5"><Plus size={15} />إضافة مورد</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-xs">
              <thead>
                <tr className="border-b text-[10px] muted-2" style={{ borderColor: "var(--line)" }}>
                  <th className="px-4 py-3 font-bold sm:px-5">المورد</th>
                  <th className="px-3 py-3 font-bold">التواصل</th>
                  <th className="px-3 py-3 font-bold">المنتجات</th>
                  <th className="px-3 py-3 font-bold">قيمة التوريد</th>
                  <th className="px-4 py-3 text-left font-bold sm:px-5">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--line)" }}>
                    <td className="px-4 py-3 sm:px-5">
                      <Link href={`/suppliers/${supplier.id}`} className="font-extrabold hover:underline" style={{ color: "var(--ink)" }}>
                        {supplier.name}
                      </Link>
                      {supplier.contact_name && <p className="mt-0.5 text-[10px] muted-2">{supplier.contact_name}</p>}
                    </td>
                    <td className="px-3 py-3" dir="ltr">
                      <p className="mono" style={{ color: "var(--ink-soft)" }}>{supplier.phone || "—"}</p>
                      <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--muted-2)" }}>{supplier.email || ""}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="badge badge-muted">{formatNumber(supplier.product_count)} منتج</span>
                      <span className="mt-1 block text-[10px] muted-2">{formatNumber(supplier.variant_count)} متغير</span>
                    </td>
                    <td className="money px-3 py-3 font-bold" style={{ color: "var(--brand-strong)" }}>{formatMoney(supplier.supply_value)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/suppliers/${supplier.id}`} className="btn btn-outline px-3 py-2 text-[11px]">تفاصيل</Link>
                        <DeleteButton endpoint={`/api/suppliers/${supplier.id}`} returnTo="/suppliers" label="المورد" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link href="/profits" className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold hover:underline" style={{ color: "var(--lav-strong)" }}>
        عرض تقرير الأرباح والهوامش <ArrowLeft size={14} />
      </Link>
    </div>
  );
}
