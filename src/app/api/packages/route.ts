import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensurePackagesTables } from "@/lib/db";
import { preparePackage, savePackage } from "@/lib/package-service";
import { getPackagesList } from "@/lib/package-queries";

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const packages = await getPackagesList();
    return NextResponse.json({ packages });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل البكدجات." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  const client = await db.connect();
  try {
    const form = await request.formData();
    await ensurePackagesTables();
    const prepared = await preparePackage(form);
    await client.query("BEGIN");
    const id = await savePackage(client, prepared);
    await client.query("COMMIT");
    return NextResponse.json({ package: { id } }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const message = error instanceof Error ? error.message : "تعذر حفظ البكدج.";
    return NextResponse.json(
      { error: message.includes("unique") ? "هذا الكود مستخدم بالفعل." : message },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}
