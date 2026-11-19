import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensurePackagesTables } from "@/lib/db";
import { preparePackage, savePackage } from "@/lib/package-service";
import { getPackageDetail } from "@/lib/package-queries";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id } = await params;
    const pkg = await getPackageDetail(id);
    if (!pkg) return NextResponse.json({ error: "البكدج غير موجود." }, { status: 404 });
    return NextResponse.json({ package: pkg });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل البكدج." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  await ensurePackagesTables();
  const { id } = await params;
  const deleted = await db.query("DELETE FROM packages WHERE id = $1 RETURNING id", [id]);
  if (!deleted.rowCount) return NextResponse.json({ error: "البكدج غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  const client = await db.connect();
  try {
    const { id } = await params;
    const existing = await db.query("SELECT id, image_url FROM packages WHERE id = $1", [id]);
    if (!existing.rowCount) return NextResponse.json({ error: "البكدج غير موجود." }, { status: 404 });

    const form = await request.formData();
    await ensurePackagesTables();
    const prepared = await preparePackage(form, existing.rows[0].image_url);
    await client.query("BEGIN");
    const savedId = await savePackage(client, prepared, id);
    if (!savedId) throw new Error("البكدج غير موجود.");
    await client.query("COMMIT");
    return NextResponse.json({ package: { id: savedId } });
  } catch (error) {
    await client.query("ROLLBACK");
    const message = error instanceof Error ? error.message : "تعذر تعديل البكدج.";
    return NextResponse.json(
      { error: message.includes("unique") ? "هذا الكود مستخدم بالفعل." : message },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}
