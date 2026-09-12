import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/shared/lib/prisma";
import { recordHit } from "@/shared/lib/dailyStats";
import crypto from "crypto";

function generateShareToken() {
  return "sh_" + crypto.randomBytes(16).toString("base64url");
}

export async function GET() {
  recordHit("api", "/api/user/share");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { shareToken: true, shareEnabled: true, maskUsernames: true },
  });

  return NextResponse.json({
    shareToken: user?.shareToken || null,
    shareEnabled: user?.shareEnabled ?? false,
    maskUsernames: user?.maskUsernames ?? false,
  });
}

export async function POST(req: NextRequest) {
  recordHit("api", "/api/user/share");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { checkSensitiveRateLimit } = await import("@/shared/lib/store");
  if (!checkSensitiveRateLimit(`share-cfg:${session.user.id}`, 20).allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const body = await req.json();
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });

    let shareToken = user?.shareToken;
    if (!shareToken || body.regenerateToken) {
      shareToken = generateShareToken();
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        shareToken,
        shareEnabled: typeof body.shareEnabled === "boolean" ? body.shareEnabled : user?.shareEnabled,
        maskUsernames: typeof body.maskUsernames === "boolean" ? body.maskUsernames : user?.maskUsernames,
      },
      select: { shareToken: true, shareEnabled: true, maskUsernames: true },
    });

    return NextResponse.json({
      ok: true,
      shareToken: updated.shareToken,
      shareEnabled: updated.shareEnabled,
      maskUsernames: updated.maskUsernames,
    });
  } catch (e) {
    console.error("[share-cfg] failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
