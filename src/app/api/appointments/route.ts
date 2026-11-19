import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureAppointmentsTable } from "@/lib/db";
import { getAppointment, listAppointments } from "@/lib/appointments";
import { logActivity } from "@/lib/activity";
import {
  isUuid,
  normalizeDateOnly,
  normalizeKind,
  normalizeStatus,
  normalizeTimeOnly,
  normalizeTone,
} from "@/lib/appointment-shared";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireSession() {
  return getSession();
}

async function resolveLinks(body: Record<string, unknown>) {
  let customerId: string | null = null;
  let invoiceId: string | null = null;

  if (body.customerId !== undefined && body.customerId !== null && body.customerId !== "") {
    if (!isUuid(body.customerId)) return { error: "العميلة المحددة غير صالحة." } as const;
    customerId = body.customerId.trim();
  }
  if (body.invoiceId !== undefined && body.invoiceId !== null && body.invoiceId !== "") {
    if (!isUuid(body.invoiceId)) return { error: "الفاتورة المحددة غير صالحة." } as const;
    invoiceId = body.invoiceId.trim();
  }

  if (invoiceId) {
    const invoice = await db.query("SELECT id, customer_id FROM invoices WHERE id = $1", [invoiceId]);
    if (!invoice.rowCount) return { error: "الفاتورة غير موجودة." } as const;
    if (!customerId) customerId = invoice.rows[0].customer_id ?? null;
  }

  if (customerId) {
    const customer = await db.query("SELECT id FROM customers WHERE id = $1", [customerId]);
    if (!customer.rowCount) return { error: "العميلة غير موجودة." } as const;
  }

  return { customerId, invoiceId } as const;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return bad("غير مصرح.", 401);

    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    const invoiceId = url.searchParams.get("invoiceId");
    if (customerId && !isUuid(customerId)) return bad("معرّف العميلة غير صالح.");
    if (invoiceId && !isUuid(invoiceId)) return bad("معرّف الفاتورة غير صالح.");

    const appointments = await listAppointments({
      customerId: customerId || null,
      invoiceId: invoiceId || null,
    });
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Unable to load appointments", error);
    return bad("تعذّر تحميل المواعيد.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return bad("غير مصرح.", 401);

    await ensureAppointmentsTable();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const title = String(body.title ?? "").trim();
    if (!title) return bad("عنوان الموعد مطلوب.");
    if (title.length > 180) return bad("عنوان الموعد طويل جدًا.");

    const appointmentDate = normalizeDateOnly(body.appointmentDate);
    if (!appointmentDate) return bad("تاريخ الموعد غير صالح.");

    const rawTime = body.time === undefined || body.time === null ? "" : String(body.time);
    const appointmentTime = normalizeTimeOnly(rawTime);
    if (rawTime && !appointmentTime) return bad("وقت الموعد غير صالح.");

    const notes = String(body.notes ?? "").trim().slice(0, 2000) || null;
    const tone = normalizeTone(body.tone);
    const kind = normalizeKind(body.kind);
    const status = normalizeStatus(body.status);

    const links = await resolveLinks(body);
    if ("error" in links) return bad(links.error ?? "تعذّر ربط الموعد بالعميلة أو الفاتورة.");

    const result = await db.query(
      `INSERT INTO appointments
         (title, notes, appointment_date, appointment_time, tone, kind, status, customer_id, invoice_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [title, notes, appointmentDate, appointmentTime, tone, kind, status, links.customerId, links.invoiceId],
    );

    const appointment = await getAppointment(String(result.rows[0].id));
    await logActivity({
      entityType: "appointment",
      entityId: appointment?.id ?? null,
      action: "created",
      summary: `موعد جديد: ${title} (${appointmentDate})`,
      actor: session.name,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Unable to create appointment", error);
    return bad("تعذّر حفظ الموعد.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return bad("غير مصرح.", 401);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isUuid(body.id)) return bad("معرّف الموعد غير صالح.");

    const existing = await getAppointment(body.id);
    if (!existing) return bad("الموعد غير موجود.", 404);

    const title = body.title === undefined ? existing.title : String(body.title ?? "").trim();
    if (!title) return bad("عنوان الموعد مطلوب.");
    if (title.length > 180) return bad("عنوان الموعد طويل جدًا.");

    const appointmentDate =
      body.appointmentDate === undefined ? existing.appointment_date : normalizeDateOnly(body.appointmentDate);
    if (!appointmentDate) return bad("تاريخ الموعد غير صالح.");

    const rawTime =
      body.time === undefined ? (existing.appointment_time ?? "") : body.time === null ? "" : String(body.time);
    const appointmentTime = normalizeTimeOnly(rawTime);
    if (rawTime && !appointmentTime) return bad("وقت الموعد غير صالح.");

    const notes =
      body.notes === undefined
        ? existing.notes
        : String(body.notes ?? "").trim().slice(0, 2000) || null;
    const tone = body.tone === undefined ? existing.tone : normalizeTone(body.tone);
    const kind = body.kind === undefined ? existing.kind : normalizeKind(body.kind);
    const status = body.status === undefined ? existing.status : normalizeStatus(body.status);

    let customerId = existing.customer_id;
    let invoiceId = existing.invoice_id;

    if (body.invoiceId !== undefined) {
      if (body.invoiceId !== null && body.invoiceId !== "" && !isUuid(body.invoiceId)) {
        return bad("الفاتورة المحددة غير صالحة.");
      }
      invoiceId = body.invoiceId ? String(body.invoiceId).trim() : null;
    }
    if (body.customerId !== undefined) {
      if (body.customerId !== null && body.customerId !== "" && !isUuid(body.customerId)) {
        return bad("العميلة المحددة غير صالحة.");
      }
      customerId = body.customerId ? String(body.customerId).trim() : null;
    }

    if (invoiceId) {
      const invoice = await db.query("SELECT id, customer_id FROM invoices WHERE id = $1", [invoiceId]);
      if (!invoice.rowCount) return bad("الفاتورة غير موجودة.");
      if (!customerId) customerId = invoice.rows[0].customer_id ?? null;
    }
    if (customerId) {
      const customer = await db.query("SELECT id FROM customers WHERE id = $1", [customerId]);
      if (!customer.rowCount) return bad("العميلة غير موجودة.");
    }

    await db.query(
      `UPDATE appointments
          SET title = $2, notes = $3, appointment_date = $4, appointment_time = $5,
              tone = $6, kind = $7, status = $8, customer_id = $9, invoice_id = $10,
              updated_at = NOW()
        WHERE id = $1`,
      [body.id, title, notes, appointmentDate, appointmentTime, tone, kind, status, customerId, invoiceId],
    );

    const appointment = await getAppointment(body.id);
    await logActivity({
      entityType: "appointment",
      entityId: body.id,
      action: "updated",
      summary: `تحديث موعد: ${title} (${appointmentDate})`,
      actor: session.name,
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Unable to update appointment", error);
    return bad("تعذّر تحديث الموعد.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return bad("غير مصرح.", 401);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isUuid(body.id)) return bad("معرّف الموعد غير صالح.");

    await ensureAppointmentsTable();
    const result = await db.query("DELETE FROM appointments WHERE id = $1 RETURNING title", [body.id]);
    if (!result.rowCount) return bad("الموعد غير موجود.", 404);

    await logActivity({
      entityType: "appointment",
      entityId: body.id,
      action: "deleted",
      summary: `حذف موعد: ${String(result.rows[0].title ?? "")}`,
      actor: session.name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete appointment", error);
    return bad("تعذّر حذف الموعد.", 500);
  }
}
