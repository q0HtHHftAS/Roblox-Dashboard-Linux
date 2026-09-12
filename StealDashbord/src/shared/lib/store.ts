// In-memory store for live data - v3: per-user isolation + Prisma persistence
import type { PlayerData } from "./types";
import { prisma } from "./prisma";

// Per-user in-memory maps
const userMaps = new Map<string, Map<string, PlayerData>>();
const userLastIngest = new Map<string, number>();

// Rate limiting per apiKey + PC scope: 6 req/min ต่อ PC (หลายเครื่องใช้ apiKey เดียวกันได้โดยไม่แย่งโควตากัน)
// + global 120 req/min ต่อ apiKey (~30 เครื่องที่รอบส่ง 15 วิ) กัน bypass ด้วยการวนชื่อ PC ใหม่เพื่อปั่นโควตา
// (in-memory: รีเซ็ตเมื่อ restart/deploy — พอสำหรับ single-instance; ถ้าขยายหลาย instance ให้ย้ายไป Redis/DB)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const rateLimitGlobalMap = new Map<string, { count: number; resetAt: number }>();

// Throttle สำหรับ public share endpoint กัน brute-force token (per-IP + per-token, in-memory)
const shareRateMap = new Map<string, { count: number; resetAt: number }>();

function keyFor(p: PlayerData): string {
  const pc = (p.pcName || "unknown").trim() || "unknown";
  const id = p.userId ? String(p.userId) : p.username;
  return `${pc}|${id}`;
}

// gameId ที่เก็บ/นับได้มีแค่นี้ (ตรงกับ KNOWN_GAME_IDS ฝั่ง ingest) — นอกนั้นนับเป็น stealanegg (legacy)
const KNOWN_GAME_IDS = new Set(["stealanegg", "animeexpeditions", "animeorigin", "bloxfruits"]);

export function normalizeGameId(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s && KNOWN_GAME_IDS.has(s) ? s : "stealanegg";
}

export type GameGlobalCount = { total: number; online: number };

export type GlobalPlatformStats = {
  totalAccounts: number;
  onlineAccounts: number;
  byGame: Record<string, GameGlobalCount>;
};

function getUserMap(userId: string): Map<string, PlayerData> {
  let m = userMaps.get(userId);
  if (!m) {
    m = new Map();
    userMaps.set(userId, m);
  }
  return m;
}

// กัน key หลุดแล้วโดนยิง 120 req/min ปั่น DB: persist ลง disk อย่างมาก 1 ครั้ง/30 วิ ต่อ user
// (memory ยังอัปเดตทุกครั้ง — live view ไม่ช้าลง มีแค่ DB ตามหลังนิดหน่อย)
const lastPersistAt = new Map<string, number>();
const PERSIST_THROTTLE_MS = 30_000;

// กันวนชื่อ pcName/username ปั่นแถวไม่จำกัด: เก็บสูงสุดเท่านี้ต่อ user เกินแล้วตัดแถวที่เก่าสุดออก
// (รองรับหลาย acc พร้อมกัน — สูงสุด 500 identities ต่อ user)
const MAX_PLAYERS_PER_USER = 500;

export function setPlayersForUser(userId: string, newPlayers: PlayerData[]) {
  const now = Date.now();
  userLastIngest.set(userId, now);
  const map = getUserMap(userId);
  for (const p of newPlayers) {
    if (!p.pcName) p.pcName = "PC-001";
    p.gameId = normalizeGameId(p.gameId);
    const k = keyFor(p);
    const existing = map.get(k);
    // เริ่ม session ใหม่ถ้าเคยหลุด offline เกิน 90s (uptime จะได้นับเฉพาะรอบที่ออนไลน์ต่อเนื่อง)
    // firstSeen/lastSeen เป็น server-owned ทั้งหมด — ค่าที่ client ส่งมา (ถ้าแก้สคริปต์ยัดมา) ไม่มีผล
    const wasOffline = !existing || now - Number(existing.lastSeen ?? existing.lastUpdated ?? 0) > 90_000;
    p.firstSeen = wasOffline ? now : (existing?.firstSeen ?? now);
    p.lastSeen = now;
    p.lastUpdated = p.lastUpdated || now;
    map.set(k, p);
  }
  // ตัดแถวเก่าสุดทิ้งถ้าเกิน cap (กัน key หลุดแล้วโดนปั่น identities จน memory/DB บวม)
  if (map.size > MAX_PLAYERS_PER_USER) {
    const sorted = Array.from(map.entries()).sort(
      ([, a], [, b]) => Number(a.lastSeen ?? 0) - Number(b.lastSeen ?? 0)
    );
    for (let i = 0; i < sorted.length - MAX_PLAYERS_PER_USER; i++) {
      map.delete(sorted[i][0]);
    }
  }
  // Async persist to DB (fire and forget + throttle, don't block)
  const lastP = lastPersistAt.get(userId) ?? 0;
  if (now - lastP >= PERSIST_THROTTLE_MS) {
    lastPersistAt.set(userId, now);
    void persistPlayersForUser(userId, Array.from(map.values()));
  }
}

async function persistPlayersForUser(userId: string, players: PlayerData[]) {
  try {
    for (const p of players) {
      const k = keyFor(p);
      // Use upsert based on unique constraint [userId, pcName, username]
      await prisma.player.upsert({
        where: {
          userId_pcName_username: {
            userId,
            pcName: p.pcName,
            username: p.username,
          },
        },
        update: {
          gameId: normalizeGameId(p.gameId),
          data: JSON.stringify(p),
          lastSeen: BigInt(p.lastSeen ?? Date.now()),
          lastUpdated: BigInt(p.lastUpdated ?? Date.now()),
          firstSeen: BigInt(p.firstSeen ?? Date.now()),
          robloxUserId: p.userId ? String(p.userId) : null,
        },
        create: {
          userId,
          pcName: p.pcName,
          username: p.username,
          gameId: normalizeGameId(p.gameId),
          robloxUserId: p.userId ? String(p.userId) : null,
          data: JSON.stringify(p),
          firstSeen: BigInt(p.firstSeen ?? Date.now()),
          lastSeen: BigInt(p.lastSeen ?? Date.now()),
          lastUpdated: BigInt(p.lastUpdated ?? Date.now()),
        },
      });
    }
  } catch (e) {
    console.error("[store] persist failed", e);
  }
}

export async function getPlayersForUser(userId: string): Promise<{ players: PlayerData[]; lastIngest: number }> {
  const map = getUserMap(userId);
  // If memory empty, try to load from DB
  if (map.size === 0) {
    try {
      const rows = await prisma.player.findMany({ where: { userId } });
      for (const row of rows) {
        try {
          const p = JSON.parse(row.data) as PlayerData;
          // Ensure timestamps are numbers
          p.firstSeen = Number(row.firstSeen);
          p.lastSeen = Number(row.lastSeen);
          p.lastUpdated = Number(row.lastUpdated);
          // เติม gameId จาก column (แถวเก่าที่ data ไม่มี gameId จะได้ไม่หล่นไปนับผิดเกม)
          p.gameId = normalizeGameId(p.gameId ?? (row as { gameId?: unknown }).gameId);
          const k = keyFor(p);
          map.set(k, p);
        } catch {}
      }
      if (rows.length > 0) {
        const maxLast = Math.max(...rows.map(r => Number(r.lastSeen)), 0);
        if (maxLast) userLastIngest.set(userId, maxLast);
      }
    } catch (e) {
      console.error("[store] load failed", e);
    }
  }
  const players = Array.from(map.values()).sort((a, b) => {
    const aMoney = a.money ?? 0;
    const bMoney = b.money ?? 0;
    const aHas = aMoney > 0;
    const bHas = bMoney > 0;
    if (aHas && bHas) return bMoney - aMoney;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return (b.moneyPerSec ?? 0) - (a.moneyPerSec ?? 0);
  });
  return { players, lastIngest: userLastIngest.get(userId) ?? 0 };
}

// หมายเหตุ: เคยมี legacy global writers (setPlayers/upsertPlayer ลง "__public__") แบบไม่ผ่าน allowlist —
// ลบทิ้งแล้วเพราะไม่มี caller (grep ยืนยัน) กัน route ในอนาคตเผลอเอากลับมาใช้แล้วข้อมูลปลอมทะลุเข้า store
export function getStoreSnapshot() {
  // For debug, return all users' counts
  let total = 0;
  for (const m of userMaps.values()) total += m.size;
  return { total, perUser: Array.from(userMaps.entries()).map(([k, v]) => ({ userId: k, count: v.size })) };
}

export function clearAllForUser(userId: string) {
  userMaps.delete(userId);
  userLastIngest.delete(userId);
  lastPersistAt.delete(userId);
  void prisma.player.deleteMany({ where: { userId } }).catch(() => {});
}

export async function clearOfflineForUser(userId: string): Promise<number> {
  const now = Date.now();
  const map = getUserMap(userId);
  const toDeleteKeys: string[] = [];
  const toDeletePairs: { pcName: string; username: string }[] = [];

  for (const [k, p] of map.entries()) {
    const lastSeen = Number(p.lastSeen ?? p.lastUpdated ?? 0);
    // Offline threshold: > 90 seconds
    if (now - lastSeen > 90_000) {
      toDeleteKeys.push(k);
      toDeletePairs.push({ pcName: p.pcName, username: p.username });
    }
  }

  for (const k of toDeleteKeys) {
    map.delete(k);
  }

  if (toDeletePairs.length > 0) {
    try {
      await prisma.player.deleteMany({
        where: {
          userId,
          OR: toDeletePairs.map((pair) => ({
            pcName: pair.pcName,
            username: pair.username,
          })),
        },
      });
    } catch (e) {
      console.error("[store] clearOffline error", e);
    }
  }

  return toDeleteKeys.length;
}

export async function deletePlayerForUser(userId: string, pcName: string, username: string): Promise<boolean> {
  const map = getUserMap(userId);
  // memory key คือ `pc|robloxUserId` เมื่อมี userId (Lua ส่งมาทุกครั้ง) แต่ caller มีแค่ pc+username —
  // เลยต้องลบทุกแถวที่ pcName+username ตรงกัน ไม่ใช่แค่ key รูปเดียว (ไม่งั้นลบใน memory ไม่โดน
  // แล้ว persist รอบถัดไปจะเขียนแถวคืน DB — ลบแล้วฟื้น)
  const pc = (pcName || "").trim() || "unknown";
  for (const [k, p] of map.entries()) {
    if ((p.pcName || "unknown") === pc && p.username === username) {
      map.delete(k);
    }
  }

  try {
    await prisma.player.deleteMany({
      where: {
        userId,
        pcName,
        username,
      },
    });
    return true;
  } catch (e) {
    console.error("[store] deletePlayer error", e);
    return false;
  }
}

export async function getSharedDataByToken(token: string) {
  if (!token || typeof token !== "string") return null;
  try {
    const user = await prisma.user.findUnique({
      where: { shareToken: token },
      select: { id: true, name: true, shareEnabled: true, maskUsernames: true },
    });
    if (!user || !user.shareEnabled) return null;

    const { players, lastIngest } = await getPlayersForUser(user.id);
    const { maskUsername } = await import("./format");

    const processedPlayers = players.map((p) => {
      if (!user.maskUsernames) return p;
      return {
        ...p,
        username: maskUsername(p.username),
        displayName: p.displayName ? maskUsername(p.displayName) : undefined,
      };
    });

    return {
      players: processedPlayers,
      lastIngest,
      serverTime: Date.now(),
      maskUsernames: user.maskUsernames,
      ownerName: user.name || "User",
    };
  } catch (e) {
    console.error("[store] getSharedData error", e);
    return null;
  }
}

// Rate limit สำหรับ action อ่อนไหวฝั่ง session (regenerate key / share config / clear / key fetch)
// กับ endpoint สาธารณะที่ไม่มี auth (thumb): key เป็น string อิสระ — กัน session/IP เดียวปั่นรัว ๆ
// (in-memory แบบเดียวกับ rate limit หลัก: รีเซ็ตเมื่อ restart — พอสำหรับ single-instance)
const sensitiveLimitMap = new Map<string, { count: number; resetAt: number }>();
export function checkSensitiveRateLimit(key: string, maxPerMin: number): { allowed: boolean } {
  const now = Date.now();
  const e = sensitiveLimitMap.get(key);
  if (!e || now > e.resetAt) {
    sensitiveLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }
  if (e.count >= maxPerMin) return { allowed: false };
  e.count += 1;
  return { allowed: true };
}

// ดึง IP ฝั่ง client ไว้ทำ rate limit (หลัง funnel/cloudflare จะอยู่ใน x-forwarded-for)
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return req.headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}

// Rate limiting
export function checkRateLimit(apiKey: string, scope = "default"): { allowed: boolean; remaining: number; limited?: "pc" | "key"; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60_000;
  // quota ต่อ (PC + เกม + account): สคริปต์ยิงทุก ~11 วิ (~5.5/min) — เผื่อ burst ตอนเปิดสคริปต์/push ซ้อน
  const maxPerPc = 12;
  // global ต่อ apiKey: 20 จอ (~110/min) + headroom
  const maxPerKey = 240;
  // อ่านทั้งสอง bucket ก่อน — request ที่โดน reject ต้องไม่กินโควตา
  const g = rateLimitGlobalMap.get(apiKey);
  const gAlive = g && now <= g.resetAt;
  if (gAlive && g.count >= maxPerKey) {
    return { allowed: false, remaining: 0, limited: "key", retryAfter: Math.max(1, Math.ceil((g.resetAt - now) / 1000)) };
  }
  const key = `${apiKey}|${scope}`;
  const entry = rateLimitMap.get(key);
  const pcAlive = entry && now <= entry.resetAt;
  if (pcAlive && entry.count >= maxPerPc) {
    return { allowed: false, remaining: 0, limited: "pc", retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  // ผ่านทั้งคู่ค่อยนับ
  if (gAlive) {
    g.count += 1;
  } else {
    rateLimitGlobalMap.set(apiKey, { count: 1, resetAt: now + windowMs });
  }
  if (pcAlive) {
    entry.count += 1;
    return { allowed: true, remaining: maxPerPc - entry.count };
  }
  rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
  return { allowed: true, remaining: maxPerPc - 1 };
}

export function checkShareRateLimit(ip: string, token: string): { allowed: boolean } {
  const now = Date.now();
  const windowMs = 60_000;
  // หน้า share poll ทุก 4 วิ (~15 req/min ต่อคน) — per-IP 120/min, per-token 600/min
  // (กันปั๊มทาย token; entropy หลักของ token ยังมาจาก sh_ 128-bit)
  const buckets: Array<[string, number]> = [
    [`share-ip:${ip}`, 120],
    [`share-token:${token}`, 600],
  ];
  for (const [k, max] of buckets) {
    const e = shareRateMap.get(k);
    if (!e || now > e.resetAt) {
      shareRateMap.set(k, { count: 1, resetAt: now + windowMs });
    } else if (e.count >= max) {
      return { allowed: false };
    } else {
      e.count += 1;
    }
  }
  return { allowed: true };
}

import { hashApiKey } from "./apikey";

export async function getUserByApiKey(apiKey: string) {
  // รับเฉพาะคีย์จริง "sd_..." — ไม่รับ userId/cuid เป็น credential แล้ว (กันสับสน credential)
  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sd_") || apiKey.length > 128) return null;
  try {
    // แถวใหม่เก็บแบบ hash — หาแบบ hash ก่อนเสมอ
    const byHash = await prisma.user.findUnique({ where: { apiKey: hashApiKey(apiKey) } });
    if (byHash) return byHash;
    // fallback แถว legacy (plaintext) + migrate เป็น hash แบบโปร่งใส — คีย์เดิมยังใช้ได้ต่อ
    const legacy = await prisma.user.findUnique({ where: { apiKey } });
    if (legacy) {
      prisma.user
        .update({ where: { id: legacy.id }, data: { apiKey: hashApiKey(apiKey) } })
        .catch(() => {});
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

async function computeGlobalPlatformStats(): Promise<GlobalPlatformStats> {
  // Global = union ของ DB + memory (กัน double-count ด้วย key userId|pcName|username)
  // online = live = lastSeen >= now - 90s (ตรงกับปุ่ม Clear offline / idle threshold)
  // นับแยกตามเกมด้วย gameId — 1 identity นับแค่เกมล่าสุด (แถวเดียวต่อ pc+username อยู่แล้ว)
  const ONLINE_WINDOW_MS = 90_000;
  const tally = (merged: Map<string, { gameId: string; lastSeen: number }>): GlobalPlatformStats => {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    const byGame: Record<string, GameGlobalCount> = {};
    let onlineAccounts = 0;
    for (const v of merged.values()) {
      const g = normalizeGameId(v.gameId);
      const b = byGame[g] ?? (byGame[g] = { total: 0, online: 0 });
      b.total++;
      if (v.lastSeen >= cutoff) {
        b.online++;
        onlineAccounts++;
      }
    }
    return { totalAccounts: merged.size, onlineAccounts, byGame };
  };
  try {
    const rows = await prisma.player.findMany({
      select: { userId: true, pcName: true, username: true, gameId: true, lastSeen: true },
    });
    const merged = new Map<string, { gameId: string; lastSeen: number }>();
    for (const r of rows) {
      merged.set(`${r.userId}|${r.pcName}|${r.username}`, {
        gameId: r.gameId,
        lastSeen: Number(r.lastSeen),
      });
    }
    // Overlay memory (อาจใหม่กว่า DB เพราะ persist เป็น fire-and-forget)
    for (const [userId, userMap] of userMaps.entries()) {
      for (const player of userMap.values()) {
        const k = `${userId}|${player.pcName}|${player.username}`;
        const memLastSeen = Number(player.lastSeen ?? player.lastUpdated ?? 0);
        const existing = merged.get(k);
        if (existing === undefined || memLastSeen > existing.lastSeen) {
          merged.set(k, { gameId: normalizeGameId(player.gameId), lastSeen: memLastSeen });
        }
      }
    }
    return tally(merged);
  } catch (e) {
    // DB ล่ม: fallback นับจาก memory อย่างเดียว
    try {
      const merged = new Map<string, { gameId: string; lastSeen: number }>();
      for (const [userId, userMap] of userMaps.entries()) {
        for (const player of userMap.values()) {
          merged.set(`${userId}|${player.pcName}|${player.username}`, {
            gameId: normalizeGameId(player.gameId),
            lastSeen: Number(player.lastSeen ?? player.lastUpdated ?? 0),
          });
        }
      }
      return tally(merged);
    } catch {
      return { totalAccounts: 0, onlineAccounts: 0, byGame: {} };
    }
  }
}

// จำนวน User ทั้งหมดที่เคย login เว็บ (Discord OAuth สร้างแถว User ตั้งแต่ login ครั้งแรก) — โชว์ใน footer "N All User"
// (session เป็น JWT ไม่มี Session table ให้นับ online แบบ real-time; /api/live โดน poll ทุก 4 วิต่อคน เลย cache 60 วิกันยิง DB รัว)
let cachedTotalUsers = 0;
let cachedTotalUsersAt = 0;
const TOTAL_USERS_TTL_MS = 60_000;
export async function getTotalUsers(): Promise<number> {
  const now = Date.now();
  if (cachedTotalUsersAt > 0 && now - cachedTotalUsersAt < TOTAL_USERS_TTL_MS) return cachedTotalUsers;
  try {
    cachedTotalUsers = await prisma.user.count();
    cachedTotalUsersAt = now;
  } catch {
    // DB ล่ม: คืนค่า cache เดิม (0 ถ้ายังไม่เคยอ่านสำเร็จ)
  }
  return cachedTotalUsers;
}

// global stats ต้องไล่อ่านตาราง Player ทั้งตาราง + merge memory ทุกครั้ง — live poll ทุก 4 วิ/แท็บ
// user เยอะแล้ว DB โดนสแกนฟรีหลายสิบครั้ง/วิ เลย cache 10 วิ (footer/การ์ดช้าหลังข้อมูลจริงนิดเดียว)
let cachedGlobalStats: GlobalPlatformStats | null = null;
let cachedGlobalStatsAt = 0;
const GLOBAL_STATS_TTL_MS = 10_000;
export async function getGlobalPlatformStats(): Promise<GlobalPlatformStats> {
  const now = Date.now();
  if (cachedGlobalStats && now - cachedGlobalStatsAt < GLOBAL_STATS_TTL_MS) return cachedGlobalStats;
  const fresh = await computeGlobalPlatformStats();
  cachedGlobalStats = fresh;
  cachedGlobalStatsAt = Date.now();
  return fresh;
}

