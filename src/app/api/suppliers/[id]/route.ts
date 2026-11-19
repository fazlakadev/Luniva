import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureSuppliersTable } from "@/lib/db";
import { validateSupplier } from "@/lib/suppliers";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureSuppliersTable();
    const { id } = await params;
    const supplier = await db.query("SELECT * FROM suppliers WHERE id = $1", [id]);
    if (!supplier.rowCount) return NextResponse.json({ error: "المورد غير موجود." }, { status: 404 });
    const variants = await db.query(`
      SELECT pv.id, pv.sku, pv.color, pv.size, pv.supply_price, p.id AS product_id, p.name AS product_name
      FROM product_variants pv JOIN products p ON p.id = pv.product_id
      WHERE pv.supplier_id = $1 ORDER BY p.name, pv.color, pv.size
    `, [id]);
    return NextResponse.json({ supplier: supplier.rows[0], variants: variants.rows });
  } catch (error) {
    console.error("Unable to load supplier", error);
    return NextResponse.json({ error: "تعذر تحميل المورد." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id } = await params;
    const input = validateSupplier(await request.json().catch(() => ({})));
    await ensureSuppliersTable();
    const result = await db.query(
      `UPDATE suppliers SET name = $1, contact_name = $2, phone = $3, email = $4,
         address = $5, notes = $6, updated_at = NOW()
       WHERE id = $7 RETURNING id, name, contact_name, phone, email, address, notes, created_at`,
      [input.name, input.contactName || null, input.phone || null, input.email || null, input.address || null, input.notes || null, id],
    );
    if (!result.rowCount) return NextResponse.json({ error: "المورد غير موجود." }, { status: 404 });
    return NextResponse.json({ supplier: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حفظ المورد.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureSuppliersTable();
    const { id } = await params;
    const result = await db.query("DELETE FROM suppliers WHERE id = $1 RETURNING id", [id]);
    if (!result.rowCount) return NextResponse.json({ error: "المورد غير موجود." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete supplier", error);
    return NextResponse.json({ error: "تعذر حذف المورد." }, { status: 500 });
  }
}
