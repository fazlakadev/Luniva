import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureSuppliersTable } from "@/lib/db";
import { validateSupplier } from "@/lib/suppliers";

export const runtime = "nodejs";

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureSuppliersTable();
    const result = await db.query(`
      SELECT s.*,
        (SELECT COUNT(*)::int FROM product_variants pv WHERE pv.supplier_id = s.id) AS variant_count,
        (SELECT COUNT(DISTINCT pv.product_id)::int FROM product_variants pv WHERE pv.supplier_id = s.id) AS product_count,
        (SELECT COALESCE(SUM(pv.supply_price), 0) FROM product_variants pv WHERE pv.supplier_id = s.id) AS supply_value
      FROM suppliers s ORDER BY s.name
    `);
    return NextResponse.json({ suppliers: result.rows });
  } catch (error) {
    console.error("Unable to load suppliers", error);
    return NextResponse.json({ error: "تعذر تحميل الموردين." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const input = validateSupplier(await request.json().catch(() => ({})));
    await ensureSuppliersTable();
    const result = await db.query(
      `INSERT INTO suppliers (name, contact_name, phone, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, contact_name, phone, email, address, notes, created_at`,
      [input.name, input.contactName || null, input.phone || null, input.email || null, input.address || null, input.notes || null],
    );
    return NextResponse.json({ supplier: result.rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حفظ المورد.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
