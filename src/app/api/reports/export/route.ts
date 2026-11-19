import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exportRows } from "@/lib/invoice-queries";
import { exportProfitRows } from "@/lib/profit-queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const type = typeParam === "payments" || typeParam === "customers" || typeParam === "profits" ? typeParam : "invoices";
  const itemType = url.searchParams.get("itemType");
  try {
    const rows = type === "profits"
      ? await exportProfitRows({
          from: url.searchParams.get("from") ?? undefined,
          to: url.searchParams.get("to") ?? undefined,
          supplierId: url.searchParams.get("supplier") ?? undefined,
          type: itemType === "product" || itemType === "package" ? itemType : "all",
        })
      : await exportRows(type);
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [columns.map(escape).join(","), ...rows.map((row) => columns.map((key) => escape(row[key])).join(","))].join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luniva-${type}.csv"`,
      },
    });
  } catch (error) {
    console.error("Unable to export report", error);
    return NextResponse.json({ error: "تعذر تصدير التقرير." }, { status: 500 });
  }
}
