import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { clearOfflineForUser, deletePlayerForUser, checkSensitiveRateLimit } from "@/shared/lib/store";
import { recordHit } from "@/shared/lib/dailyStats";

// ident จาก client ใช้แค่ exact-match ลบแถวตัวเอง — ตรวจ type+ความยาวก่อน กัน object/array หลุดเข้า Prisma
function cleanIdent(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 64);
  return s ? s : null;
}

export async function POST(req: NextRequest) {
  recordHit("api", "/api/accounts/clear-offline");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkSensitiveRateLimit(`clear:${session.user.id}`, 10).allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const pcName = cleanIdent((body as Record<string, unknown>)?.pcName);
    const username = cleanIdent((body as Record<string, unknown>)?.username);
    if (pcName && username) {
      // Delete single account
      const ok = await deletePlayerForUser(session.user.id, pcName, username);
      return NextResponse.json({ ok, deletedOne: true });
    }
    if ((body as Record<string, unknown>)?.pcName || (body as Record<string, unknown>)?.username) {
      return NextResponse.json({ error: "Invalid pcName/username" }, { status: 400 });
    }

    // Otherwise clear all offline (>90s)
    const count = await clearOfflineForUser(session.user.id);
    return NextResponse.json({ ok: true, cleared: count });
  } catch (e) {
    console.error("[clear-offline] failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  recordHit("api", "/api/accounts/clear-offline");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkSensitiveRateLimit(`clear:${session.user.id}`, 10).allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const url = req.nextUrl;
    const pcName = cleanIdent(url.searchParams.get("pcName") || url.searchParams.get("pc"));
    const username = cleanIdent(url.searchParams.get("username") || url.searchParams.get("user"));
    if (!pcName || !username) {
      return NextResponse.json({ error: "Missing pcName/username" }, { status: 400 });
    }
    const ok = await deletePlayerForUser(session.user.id, pcName, username);
    return NextResponse.json({ ok, deletedOne: true });
  } catch (e) {
    console.error("[clear-offline] failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
