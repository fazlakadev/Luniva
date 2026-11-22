import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureCustomersTable } from "@/lib/db";
import { uploadImage } from "@/lib/upload";

type Context = { params: Promise<{ id: string }> };

function readPhones(primary: string, extra: string) {
  const more = extra
    .split(/[\n,،]/)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([primary, ...more].filter(Boolean))];
}

export async function GET(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  await ensureCustomersTable();
  const { id } = await params;
  const result = await db.query(
    "SELECT id, full_name, phone, customer_code, address, image_url, created_at FROM customers WHERE id = $1",
    [id],
  );
  if (!result.rowCount) return NextResponse.json({ error: "العميلة غير موجودة." }, { status: 404 });

  const phones = await db.query(
    "SELECT phone FROM customer_phones WHERE customer_id = $1 ORDER BY created_at",
    [id],
  );
  return NextResponse.json({
    customer: { ...result.rows[0], phones: phones.rows.map((row) => row.phone) },
  });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  const client = await db.connect();
  try {
    const { id } = await params;
    const body = await request.formData();

    // 1. Photo-only quick upload support
    const hasPhoto = body.has("photo");
    const hasDetails = body.has("fullName") || body.has("phone");
    if (hasPhoto && !hasDetails) {
      const imageUrl = await uploadImage(body.get("photo"));
      if (!imageUrl) return NextResponse.json({ error: "لم يتم تحديد صورة صالحة." }, { status: 400 });
      await ensureCustomersTable();
      const res = await db.query(
        "UPDATE customers SET image_url = $1 WHERE id = $2 RETURNING id, full_name, phone, customer_code, address, image_url, created_at",
        [imageUrl, id],
      );
      if (!res.rowCount) return NextResponse.json({ error: "العميلة غير موجودة." }, { status: 404 });
      return NextResponse.json({ customer: res.rows[0], imageUrl });
    }

    const fullName = String(body.get("fullName") ?? "").trim();
    const phone = String(body.get("phone") ?? "").trim();
    const address = String(body.get("address") ?? "").trim();
    const phones = readPhones(phone, String(body.get("morePhones") ?? ""));

    if (!fullName || !phone || fullName.length > 160 || phones.some((value) => value.length > 32)) {
      return NextResponse.json({ error: "تحققي من الاسم وأرقام الهاتف." }, { status: 400 });
    }

    const imageUrl = await uploadImage(body.get("photo"));
    await ensureCustomersTable();

    const duplicate = await db.query(
      "SELECT phone FROM customer_phones WHERE phone = ANY($1::text[]) AND customer_id <> $2",
      [phones, id],
    );
    if (duplicate.rowCount) {
      return NextResponse.json(
        { error: `رقم الهاتف ${duplicate.rows[0].phone} مسجل بالفعل لعميلة أخرى.` },
        { status: 409 },
      );
    }

    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE customers SET full_name = $1, phone = $2, address = $3, image_url = COALESCE($4, image_url)
       WHERE id = $5
       RETURNING id, full_name, phone, customer_code, address, image_url, created_at`,
      [fullName, phone, address || null, imageUrl, id],
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "العميلة غير موجودة." }, { status: 404 });
    }

    await client.query("DELETE FROM customer_phones WHERE customer_id = $1", [id]);
    for (const value of phones) {
      await client.query("INSERT INTO customer_phones (customer_id, phone) VALUES ($1, $2)", [id, value]);
    }
    await client.query("COMMIT");

    return NextResponse.json({ customer: { ...result.rows[0], phones } });
  } catch (error) {
    await client.query("ROLLBACK");
    const raw = error instanceof Error ? error.message : "تعذر تحديث بيانات العميلة.";
    return NextResponse.json(
      { error: raw.includes("unique") ? "أحد أرقام الهاتف مسجل بالفعل." : raw },
      { status: raw.includes("unique") ? 409 : 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  await ensureCustomersTable();
  const { id } = await params;
  const deleted = await db.query("DELETE FROM customers WHERE id = $1 RETURNING id", [id]);
  if (!deleted.rowCount) return NextResponse.json({ error: "العميلة غير موجودة." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
