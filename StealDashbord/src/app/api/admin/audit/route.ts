import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireAdminApi } from "@/shared/lib/admin";
import { clientIp, pruneAudit, writeAudit } from "@/shared/lib/audit";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  const sp = new URL(req.url).searchParams;
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);
  try {
    const [total, rows] = await Promise.all([
      prisma.adminAuditLog.count(),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: offset,
      }),
    ]);
    return NextResponse.json({ total, rows });
  } catch {
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

// Clear ทั้งหมด (retention ปกติ 90 วันแบบ auto-prune)
export async function DELETE(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  try {
    await prisma.adminAuditLog.deleteMany({});
    await writeAudit(gate.discordId, "audit_cleared", undefined, clientIp(req));
    await pruneAudit().catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
