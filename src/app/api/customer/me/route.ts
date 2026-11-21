import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function GET() {
  const customer = await getCustomerSession();
  return NextResponse.json({ customer });
}
