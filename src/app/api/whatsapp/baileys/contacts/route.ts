import { NextResponse } from "next/server";
import { db, ensureCustomersTable } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await getSession())) {
      return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    }

    await ensureCustomersTable();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase().trim() || "";

    let whereClause = "WHERE c.phone IS NOT NULL AND TRIM(c.phone) != ''";
    const params: unknown[] = [];

    if (q) {
      whereClause += " AND (LOWER(c.full_name) LIKE $1 OR c.phone LIKE $1 OR LOWER(COALESCE(c.customer_code, '')) LIKE $1)";
      params.push(`%${q}%`);
    }

    const res = await db.query(
      `SELECT
        c.id,
        c.full_name,
        c.phone,
        c.customer_code,
        c.image_url,
        COALESCE(SUM(i.total - i.paid_amount), 0)::float AS open_balance
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.status != 'cancelled'
       ${whereClause}
       GROUP BY c.id, c.full_name, c.phone, c.customer_code, c.image_url
       ORDER BY c.full_name ASC
       LIMIT 50`,
      params,
    );

    return NextResponse.json(res.rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
