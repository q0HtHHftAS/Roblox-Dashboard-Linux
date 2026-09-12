import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlayersForUser, getGlobalPlatformStats, getTotalUsers } from "@/shared/lib/store";
import { recordHit, recordSnapshot } from "@/shared/lib/dailyStats";

export async function GET() {
  recordHit("api", "/api/live");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized - please login via Discord" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const [{ players, lastIngest }, globalStats, totalUsers] = await Promise.all([
    getPlayersForUser(userId),
    getGlobalPlatformStats(),
    getTotalUsers(),
  ]);
  // snapshot ยอดนับรายวัน (throttle 10 นาทีในตัว) — ให้ป้าย % เทียบเมื่อวานของ admin
  recordSnapshot(totalUsers, globalStats.totalAccounts, globalStats.onlineAccounts);

  return NextResponse.json(
    {
      players,
      lastIngest,
      serverTime: Date.now(),
      userId,
      globalTotal: globalStats.totalAccounts,
      globalOnline: globalStats.onlineAccounts,
      globalByGame: globalStats.byGame,
      totalUsers,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
