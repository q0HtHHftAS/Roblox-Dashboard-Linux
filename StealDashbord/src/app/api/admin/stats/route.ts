import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireAdminApi } from "@/shared/lib/admin";
import { getDailyStats } from "@/shared/lib/dailyStats";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const cutoff = BigInt(Date.now() - 90_000);
    const [users, blocked, players, online, daily] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.player.count(),
      prisma.player.count({ where: { lastSeen: { gte: cutoff } } }),
      getDailyStats(30),
    ]);
    return NextResponse.json({ users, blocked, players, online, daily });
  } catch {
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}
