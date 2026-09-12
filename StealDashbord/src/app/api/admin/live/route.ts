import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireAdminApi } from "@/shared/lib/admin";
import { getPrevSnapshot } from "@/shared/lib/dailyStats";

// Endpoint เบาสำหรับ poll realtime ทุก 60 วิ: counts + แถว "วันนี้" + snapshot เมื่อวาน + แยกเกม
// ของหนัก getDailyStats(30) อยู่ที่ /api/admin/stats ซึ่ง client โหลดทุก 10 นาที
// (dailyStat อัพเดทแบบ realtime อยู่แล้วผ่าน recordHit upsert — แถววันนี้คือเลขสะสมถึงตอนนี้)
export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const cutoff = BigInt(Date.now() - 90_000);
    const date = new Date().toISOString().slice(0, 10); // UTC day key ตรงกับ recordHit
    const [users, blocked, players, online, todayRow, prev, byGameRows] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.player.count(),
      prisma.player.count({ where: { lastSeen: { gte: cutoff } } }),
      prisma.dailyStat.findUnique({ where: { date } }),
      getPrevSnapshot(),
      prisma.player.groupBy({ by: ["gameId"], _count: { _all: true } }),
    ]);
    const routes: Record<string, number> = {};
    try {
      const o: unknown = JSON.parse(todayRow?.routes ?? "{}");
      if (o && typeof o === "object" && !Array.isArray(o)) {
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (typeof v === "number" && Number.isFinite(v)) routes[k] = Math.floor(v);
        }
      }
    } catch {
      // routes เสีย = ใช้ {} แทน
    }
    const byGame: Record<string, number> = {};
    for (const r of byGameRows) {
      const g = (r.gameId ?? "stealanegg") || "stealanegg";
      byGame[g] = (byGame[g] ?? 0) + r._count._all;
    }
    return NextResponse.json(
      {
        users,
        blocked,
        players,
        online,
        today: {
          date,
          pageviews: todayRow?.pageviews ?? 0,
          apiHits: todayRow?.apiHits ?? 0,
          routes,
        },
        prev, // snapshot เมื่อวาน | null (เริ่มมีหลัง deploy นี้ 1 วัน)
        byGame, // { gameId: accounts }
        serverTime: Date.now(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}
