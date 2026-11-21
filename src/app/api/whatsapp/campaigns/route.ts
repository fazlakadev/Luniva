import { NextResponse } from "next/server";
import { getBroadcastAudience } from "@/lib/whatsapp";

type SegmentType = "all" | "vip" | "with_balance" | "inactive_30d";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSegment = searchParams.get("segment") || "all";
    const validSegments: SegmentType[] = ["all", "vip", "with_balance", "inactive_30d"];
    const segment: SegmentType = validSegments.includes(rawSegment as SegmentType)
      ? (rawSegment as SegmentType)
      : "all";

    const audience = await getBroadcastAudience(segment);
    return NextResponse.json({ success: true, audience });
  } catch (error) {
    console.error("Error fetching broadcast audience:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audience" },
      { status: 500 }
    );
  }
}
