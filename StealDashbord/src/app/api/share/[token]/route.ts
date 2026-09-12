import { NextRequest, NextResponse } from "next/server";
import { getSharedDataByToken, checkShareRateLimit, getClientIp } from "@/shared/lib/store";
import { recordHit } from "@/shared/lib/dailyStats";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  recordHit("api", "/api/share");
  try {
    const { token } = await context.params;
    if (!token || typeof token !== "string" || token.length > 128 || !token.startsWith("sh_")) {
      return NextResponse.json({ error: "Share link not found or disabled" }, { status: 404 });
    }

    // กัน brute-force ทาย token (per-IP + per-token)
    if (!checkShareRateLimit(getClientIp(req), token).allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const data = await getSharedDataByToken(token);
    if (!data) {
      return NextResponse.json({ error: "Share link not found or disabled" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[share] failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
