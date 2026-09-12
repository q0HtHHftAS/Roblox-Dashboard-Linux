import { prisma } from "@/shared/lib/prisma";

// Analytics แบบตีกรอบ (Q14): pageview + api_hit เก็บยอดรายวัน (UTC) — retention 90 วัน
// ไม่เก็บ IP/user-level
export const STATS_RETENTION_DAYS = 90;

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function parseRoutes(raw: string): Record<string, number> {
  try {
    const o: unknown = JSON.parse(raw);
    if (o && typeof o === "object" && !Array.isArray(o)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v)) out[k.slice(0, 128)] = Math.floor(v);
      }
      return out;
    }
  } catch {
    // ตกมาใช้ {}
  }
  return {};
}

// fire-and-forget จาก proxy — ห้าม throw เด็ดขาด
export function recordHit(kind: "page" | "api", route?: string): void {
  void (async () => {
    try {
      const date = todayKey();
      if (kind === "page") {
        await prisma.dailyStat.upsert({
          where: { date },
          create: { date, pageviews: 1 },
          update: { pageviews: { increment: 1 } },
        });
        return;
      }
      const r = (route ?? "unknown").slice(0, 128);
      const cur = await prisma.dailyStat.findUnique({ where: { date } });
      const routes = parseRoutes(cur?.routes ?? "{}");
      routes[r] = (routes[r] ?? 0) + 1;
      // กัน row บวม: เก็บแค่ 50 route แรกที่ hit เยอะสุด
      const top = Object.entries(routes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
      await prisma.dailyStat.upsert({
        where: { date },
        create: { date, apiHits: 1, routes: JSON.stringify(Object.fromEntries(top)) },
        update: { apiHits: { increment: 1 }, routes: JSON.stringify(Object.fromEntries(top)) },
      });
    } catch {
      // เงียบ — stats ห้ามพัง request หลัก
    }
  })();
}

export interface DayStat {
  date: string;
  pageviews: number;
  apiHits: number;
  routes: Record<string, number>;
}

export async function getDailyStats(days = 30): Promise<DayStat[]> {
  const out: DayStat[] = [];
  const now = new Date();
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(todayKey(new Date(now.getTime() - i * 24 * 3600 * 1000)));
  }
  try {
    const rows = await prisma.dailyStat.findMany({ where: { date: { in: keys } } });
    const byDate = new Map(rows.map((r) => [r.date, r]));
    for (const k of keys) {
      const r = byDate.get(k);
      out.push({
        date: k,
        pageviews: r?.pageviews ?? 0,
        apiHits: r?.apiHits ?? 0,
        routes: parseRoutes(r?.routes ?? "{}"),
      });
    }
  } catch {
    for (const k of keys) out.push({ date: k, pageviews: 0, apiHits: 0, routes: {} });
  }
  return out;
}

export async function pruneStats(): Promise<number> {
  const cutoff = todayKey(new Date(Date.now() - STATS_RETENTION_DAYS * 24 * 3600 * 1000));
  try {
    const r = await prisma.dailyStat.deleteMany({ where: { date: { lt: cutoff } } });
    return r.count;
  } catch {
    return 0;
  }
}

// snapshot ยอดนับ (users/players/online) ลงแถววันนี้ — เรียกจาก /api/live แบบ throttle
// 10 นาที fire-and-forget: แถวเมื่อวานจะค้างค่าสุดท้ายของวันนั้น = "ยอดเมื่อวาน" ให้ป้าย %
let lastSnapAt = 0;
const SNAP_TTL_MS = 10 * 60_000;

export function recordSnapshot(users: number, players: number, online: number): void {
  const now = Date.now();
  if (now - lastSnapAt < SNAP_TTL_MS) return;
  lastSnapAt = now;
  void (async () => {
    try {
      const date = todayKey();
      const snapUsers = Math.max(0, Math.floor(users));
      const snapPlayers = Math.max(0, Math.floor(players));
      const snapOnline = Math.max(0, Math.floor(online));
      await prisma.dailyStat.upsert({
        where: { date },
        create: { date, snapUsers, snapPlayers, snapOnline },
        update: { snapUsers, snapPlayers, snapOnline },
      });
    } catch {
      // เงียบ — stats ห้ามพัง request หลัก
    }
  })();
}

// อ่าน snapshot ของเมื่อวาน (คีย์ UTC ย้อน 24 ชม.) — ไม่มี/ไม่ครบ = null (ซ่อนป้าย %)
export async function getPrevSnapshot(): Promise<{ users: number; players: number; online: number } | null> {
  try {
    const row = await prisma.dailyStat.findUnique({
      where: { date: todayKey(new Date(Date.now() - 24 * 3600 * 1000)) },
    });
    if (row?.snapUsers == null || row?.snapPlayers == null || row?.snapOnline == null) return null;
    return { users: row.snapUsers, players: row.snapPlayers, online: row.snapOnline };
  } catch {
    return null;
  }
}
