import { NextRequest, NextResponse } from "next/server";
import { setPlayersForUser, getUserByApiKey, checkRateLimit } from "@/shared/lib/store";
import { recordHit } from "@/shared/lib/dailyStats";
import type { PlayerData } from "@/shared/lib/types";

// กัน DoS / DB bloat: จำกัดขนาด body, จำนวน players และ pets ต่อ request
const MAX_BODY_BYTES = 256 * 1024; // 256KB
const MAX_PLAYERS = 50;
const MAX_PETS = 300;
const MAX_UNITS = 1000;
const MAX_CURRENCIES = 40;
const MAX_NAME_LEN = 64;
const MAX_PC_LEN = 64;
const MAX_KEY_LEN = 128;
const MAX_UUID_LEN = 64;
const MAX_ICON_LEN = 96;
const MAX_NUM = 1e30; // clamp เงิน/power กันค่าหลุดโลกปั่นสถิติ
const MAX_RATE = 1e24;
const KNOWN_GAME_IDS = new Set(["stealanegg", "animeexpeditions", "animeorigin", "bloxfruits"]);

// control chars + bidi override + zero-width: กัน UI spoofing ผ่าน username/pet name
// (React escape HTML ให้อยู่แล้ว เหลือแค่พวก U+202E / \n ที่ทำให้ตารางเพี้ยน)
const CONTROL_RE = /[\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

function cleanStr(v: unknown, max = MAX_NAME_LEN): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_RE, "").trim().slice(0, max);
}

function cleanStrOpt(v: unknown, max = MAX_NAME_LEN): string | undefined {
  const s = cleanStr(v, max);
  return s ? s : undefined;
}

function cleanNum(v: unknown, fallback = 0, min = 0, max = MAX_NUM): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function cleanInt(v: unknown, fallback = 0, min = 0, max = 100000): number {
  return Math.floor(cleanNum(v, fallback, min, max));
}

function cleanMutations(v: unknown): string[] {
  let arr: unknown[];
  if (typeof v === "string") arr = v ? [v] : [];
  else if (Array.isArray(v)) arr = v;
  else return [];
  const out: string[] = [];
  for (const m of arr) {
    if (typeof m !== "string") continue;
    const s = m.replace(CONTROL_RE, "").trim().slice(0, 32);
    if (s) out.push(s);
    if (out.length >= 16) break;
  }
  return out;
}

// icon จากเกมมีแค่ 2 แบบ (rbxassetid://... / ตัวเลข) — นอกนั้นทิ้ง กันยัด URL แปลก (javascript:/http ภายนอก) ลง DB
const RBX_ASSET_RE = /^rbxassetid:\/\/\d{1,20}$/i;
const NUMERIC_ID_RE = /^\d{4,20}$/;
function cleanIcon(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, MAX_ICON_LEN);
  if (RBX_ASSET_RE.test(s) || NUMERIC_ID_RE.test(s)) return s;
  return undefined;
}

// Allowlist ราย pet: field นอกเหนือจากนี้ (สคริปต์แก้ส่งมาเพิ่ม) โดนทิ้งหมด กัน stored-object injection ลง DB/share view
function cleanPet(raw: unknown): PlayerData["pets"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const name = cleanStr(p.name) || cleanStr(p.category);
  if (!name) return null;
  const category = cleanStr(p.category) || name;
  return {
    uuid: cleanStr(p.uuid, MAX_UUID_LEN),
    name,
    category,
    ratePerSecond: cleanNum(p.ratePerSecond, 0, 0, MAX_RATE),
    scale: cleanNum(p.scale, 1, 0, 1000),
    weight: cleanNum(p.weight, 0, 0, MAX_NUM),
    mutations: cleanMutations(p.mutations),
    colorIndex:
      typeof p.colorIndex === "number" && Number.isFinite(p.colorIndex)
        ? Math.max(0, Math.min(999999, Math.floor(p.colorIndex)))
        : undefined,
    rarity: cleanStrOpt(p.rarity),
    rarityNumber:
      typeof p.rarityNumber === "number" && Number.isFinite(p.rarityNumber)
        ? Math.max(0, Math.min(999, Math.floor(p.rarityNumber)))
        : undefined,
    isEquipped: p.isEquipped === true,
    isEgg: p.isEgg === true ? true : undefined,
    remaining:
      typeof p.remaining === "number" && Number.isFinite(p.remaining) && p.remaining >= 0
        ? Math.min(p.remaining, 30 * 86400)
        : undefined,
    icon: cleanIcon(p.icon),
  };
}


// Anime Expeditions: units + currencies allowlist (same stored-object-injection guard as pets)
function cleanAEUnit(raw: unknown): { uuid: string; asset: string; displayName?: string; image?: string; level: number; exp: number; trait?: string; ascension?: number; locked?: boolean; shiny?: boolean; worthiness?: number; takedowns?: number; rarity?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const asset = cleanStr(u.asset) || cleanStr(u.name);
  if (!asset) return null;
  return {
    uuid: cleanStr(u.uuid, MAX_UUID_LEN),
    asset,
    level: cleanInt(u.level, 1, 1, 1000),
    exp: cleanNum(u.exp, 0, 0, MAX_NUM),
    trait: cleanStrOpt(u.trait, 32),
    ascension:
      typeof u.ascension === "number" && Number.isFinite(u.ascension)
        ? Math.max(0, Math.min(100, Math.floor(u.ascension)))
        : undefined,
    locked: u.locked === true ? true : undefined,
    shiny: (u as Record<string, unknown>).shiny === true ? true : undefined,
    worthiness: cleanNum(u.worthiness, 0, 0, MAX_NUM) || undefined,
    takedowns: cleanNum(u.takedowns, 0, 0, MAX_NUM) || undefined,
    rarity: cleanStrOpt(u.rarity, 32),
    // Anime Origins auto: ชื่อโชว์ + รูปจากเกม (Lua อ่าน TowerInfo) — ยูนิตใหม่ใช้ได้เลยไม่ต้องแก้โค้ด
    displayName: cleanStrOpt(u.displayName, 64),
    image: cleanIcon(u.image),
  };
}

function cleanAEUnitList(v: unknown): NonNullable<PlayerData["units"]> {
  if (!Array.isArray(v)) return [];
  const out: NonNullable<PlayerData["units"]> = [];
  for (const item of v.slice(0, MAX_UNITS)) {
    const c = cleanAEUnit(item);
    if (c) out.push(c);
  }
  out.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
  return out;
}

// Anime Expeditions: skins allowlist (SkinData dict keyed "Asset#uuid", same guard as units)
function cleanAESkin(raw: unknown): { uuid: string; asset: string; obtainedAt?: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const asset = cleanStr(s.asset) || cleanStr(s.name);
  if (!asset) return null;
  return {
    uuid: cleanStr(s.uuid, MAX_UUID_LEN),
    asset,
    obtainedAt:
      typeof s.obtainedAt === "number" && Number.isFinite(s.obtainedAt)
        ? Math.max(0, Math.min(9999999999, Math.floor(s.obtainedAt)))
        : undefined,
  };
}

function cleanAESkinList(v: unknown): NonNullable<PlayerData["skins"]> {
  if (!Array.isArray(v)) return [];
  const out: NonNullable<PlayerData["skins"]> = [];
  for (const item of v.slice(0, MAX_UNITS)) {
    const c = cleanAESkin(item);
    if (c) out.push(c);
  }
  out.sort((a, b) => a.asset.localeCompare(b.asset));
  return out;
}

// Anime Expeditions: equipped hotbar (short uuids ตรงกับ units[].uuid, slot order;
// รองรับ payload เก่าที่ส่งฟิลด์ equipped เป็น key เต็ม "Asset#uuid" ด้วย)
function cleanEquippedUnits(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const item of v.slice(0, 12)) {
    if (typeof item !== "string") continue;
    const s = item.replace(CONTROL_RE, "").trim().slice(0, MAX_UUID_LEN);
    if (!s) continue;
    // payload เก่าส่ง key เต็ม "Asset#uuid" — ตัดเหลือ short uuid ให้ตรงกับ units[].uuid
    const short = s.includes("#") ? s.slice(s.lastIndexOf("#") + 1) : s;
    if (short) out.push(short);
  }
  return out.length > 0 ? out : undefined;
}

function cleanCurrencies(v: unknown): Record<string, number> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, number> = {};
  let n = 0;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (n >= MAX_CURRENCIES) break;
    const key = k.replace(CONTROL_RE, "").trim().slice(0, 32);
    if (!key) continue;
    if (typeof val !== "number" || !Number.isFinite(val) || val < 0) continue;
    out[key] = Math.min(val, MAX_NUM);
    n++;
  }
  return n > 0 ? out : undefined;
}

function cleanPetList(v: unknown): PlayerData["pets"] {
  if (!Array.isArray(v)) return [];
  const out: PlayerData["pets"] = [];
  for (const item of v.slice(0, MAX_PETS)) {
    const c = cleanPet(item);
    if (c) out.push(c);
  }
  return out;
}

// Allowlist ราย player: สร้าง object ใหม่จาก field ที่รู้จักเท่านั้น (ไม่ spread) —
// สคริปต์ที่ถูกแก้ยัด isAdmin/role/image/script/... เข้ามาจะหายไปตรงนี้ ไม่ถึง DB
function sanitizePlayer(raw: unknown): PlayerData | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const username = cleanStr(p.username);
  if (!username) return null;
  const rawPc = cleanStr(p.pcName, MAX_PC_LEN);
  const gameRaw = cleanStr(p.gameId).toLowerCase();
  const userIdNum =
    typeof p.userId === "number" && Number.isFinite(p.userId) && p.userId >= 0
      ? Math.floor(p.userId)
      : undefined;
  const pets = cleanPetList(p.pets);
  pets.sort((a, b) => (b.ratePerSecond ?? 0) - (a.ratePerSecond ?? 0));
  const gameId = gameRaw && KNOWN_GAME_IDS.has(gameRaw) ? gameRaw : "stealanegg";
  // Anime Expeditions + Anime Origins payload: Gold -> money, Gem -> gems, units list, no stealanegg v2 fields required
  // (AO towers reuse the AE unit shape: asset=Name, level=Stars, trait, locked, takedowns=Kills)
  if (gameId === "animeexpeditions" || gameId === "animeorigin") {
    const units = cleanAEUnitList(p.units) ?? [];
    const skins = cleanAESkinList(p.skins) ?? [];
    return {
      username,
      displayName: cleanStrOpt(p.displayName),
      userId: userIdNum,
      pcName: rawPc ? rawPc : "PC-001",
      gameId,
      money: cleanNum(p.money),
      moneyPerSec: 0,
      speedPower: 0,
      walkSpeed: 16,
      baseLevel: 0,
      capacity: cleanInt(p.unitsTotal, units.length, 0, 100000),
      maxCapacity: cleanInt(p.maxCapacity, 0, 0, 100000),
      nextCost: null,
      petsInBase: 0,
      pets: [],
      eggsInBag: 0,
      eggsPerSec: 0,
      gems: cleanNum(p.gems, 0, 0, MAX_NUM),
      aeLevel: cleanInt(p.aeLevel, 0, 0, 10000),
      aeExp: cleanNum(p.aeExp, 0, 0, MAX_NUM),
      aoExp: cleanNum((p as Record<string, unknown>).aoExp ?? p.aeExp, 0, 0, MAX_NUM),
      unitsTotal:
        typeof p.unitsTotal === "number" && Number.isFinite(p.unitsTotal)
          ? Math.max(0, Math.min(100000, Math.floor(p.unitsTotal)))
          : units.length,
      units,
      equippedUnits: cleanEquippedUnits(p.equippedUnits ?? p.equipped),
      skinsTotal:
        typeof p.skinsTotal === "number" && Number.isFinite(p.skinsTotal)
          ? Math.max(0, Math.min(100000, Math.floor(p.skinsTotal)))
          : skins.length,
      skins,
      currencies: cleanCurrencies(p.currencies),
      isLocal: true,
      plotId: cleanStrOpt(p.plotId, 32),
      lastUpdated: Date.now(),
    };
  }
  return {
    username,
    displayName: cleanStrOpt(p.displayName),
    userId: userIdNum,
    pcName: rawPc ? rawPc : "PC-001",
    gameId,
    money: cleanNum(p.money),
    moneyPerSec: cleanNum(p.moneyPerSec, 0, 0, MAX_RATE),
    speedPower: cleanNum(p.speedPower),
    walkSpeed: cleanNum(p.walkSpeed, 16, 0, 1000),
    baseLevel: cleanInt(p.baseLevel, 0, 0, 1000),
    treadmillLevel:
      typeof p.treadmillLevel === "number" && Number.isFinite(p.treadmillLevel)
        ? Math.max(0, Math.min(10000, Math.floor(p.treadmillLevel)))
        : undefined,
    capacity: cleanInt(p.capacity),
    maxCapacity: cleanInt(p.maxCapacity),
    nextCost:
      typeof p.nextCost === "number" && Number.isFinite(p.nextCost) && p.nextCost >= 0
        ? Math.min(p.nextCost, MAX_NUM)
        : null,
    petsInBase: cleanInt(p.petsInBase),
    pets,
    inventory: cleanPetList(p.inventory),
    eggsInBag: cleanInt(p.eggsInBag),
    eggsPerSec: cleanNum(p.eggsPerSec, 0, 0, MAX_RATE),
    eggsTotal:
      typeof p.eggsTotal === "number" && Number.isFinite(p.eggsTotal)
        ? Math.max(0, Math.min(100000, Math.floor(p.eggsTotal)))
        : undefined,
    eggsList: cleanPetList(p.eggsList),
    isLocal: true, // server ติดตามเฉพาะ account ที่รันสคริปต์จริง
    plotId: cleanStrOpt(p.plotId, 32),
    lastUpdated: Date.now(), // server-owned กัน client ปลอมเวลา
  };
}

// ดึง pcName ของเครื่องที่ส่งมาเพื่อแยกโควตา rate limit ราย PC (body ยังไม่ validate ตรงนี้ แค่เอามาทำ scope)
function pcScopeFor(body: unknown): string {
  try {
    const b = body as { pcName?: unknown; players?: unknown } | null;
    const first = Array.isArray(b?.players)
      ? (b.players[0] as { pcName?: unknown; gameId?: unknown; username?: unknown })
      : (b as { pcName?: unknown; gameId?: unknown; username?: unknown } | null);
    const pc = typeof first?.pcName === "string" ? first.pcName.replace(CONTROL_RE, "").trim() : "";
    const pcPart = pc ? pc.slice(0, 32) : "default";
    // แยก quota ตามเกมด้วย — ไม่งั้นเครื่องเดียวรัน 2 เกม (SAE + AE) แย่ง bucket 6/min
    // เดียวกันจนโดน 429 แล้ว lastSeen ขาดช่วงเป็น idle
    const game =
      typeof first?.gameId === "string"
        ? first.gameId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)
        : "";
    // Split quota down to account level (1 account pushes its own data) —
    // 20 windows on one PC stop starving each other.
    const user =
      typeof first?.username === "string"
        ? first.username.replace(CONTROL_RE, "").trim().toLowerCase().slice(0, 32)
        : "";
    return [pcPart, game || "na", user || "anon"].join("|");
  } catch {
    return "default";
  }
}

export async function POST(req: NextRequest) {
  recordHit("api", "/api/ingest");
  try {
    const text = await req.text();
    // นับเป็น bytes จริง (text.length นับ UTF-16 code units — emoji ทำให้หลุดโควตาได้ ~2เท่า)
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    // Require api_key for multi-user isolation (Q3, Q7) — รับทาง JSON body หรือ x-api-key header เท่านั้น
    // (ห้ามส่งผ่าน URL query: จะหลุดใน server/proxy log และ browser history)
    const b = body as Record<string, unknown>;
    const rawKey: string | undefined =
      (typeof b.api_key === "string" && b.api_key) ||
      (typeof b.apiKey === "string" && b.apiKey) ||
      req.headers.get("x-api-key") ||
      undefined;
    if (!rawKey || typeof rawKey !== "string" || !rawKey.startsWith("sd_") || rawKey.length > MAX_KEY_LEN) {
      return NextResponse.json({ error: "Missing or invalid api_key. Get it from Get Script modal after Discord login." }, { status: 401 });
    }
    const rate = checkRateLimit(rawKey, pcScopeFor(body));
    if (!rate.allowed) {
      // limited: 'pc' = quota 12 req/min ต่อ (PC + เกม + account), 'key' = quota 240 req/min per apiKey (client reads 'which' then backs off per 'retry in')
      const which = rate.limited === "key" ? "240 req/min per apiKey" : "12 req/min per PC per game per account";
      const retryIn = Math.max(1, rate.retryAfter ?? 60);
      return NextResponse.json({ error: "Rate limited: 12 req/min per PC per game per account, 240 req/min per apiKey (" + which + ", retry in " + retryIn + "s)" }, { status: 429, headers: { "Retry-After": String(retryIn) } });
    }
    const user = await getUserByApiKey(rawKey);
    if (!user) {
      return NextResponse.json({ error: "Invalid api_key" }, { status: 401 });
    }
    // Admin block (User Management): โดนบล็อก = ห้ามยิง ingest
    if ((user as { isBlocked?: boolean }).isBlocked) {
      return NextResponse.json({ error: "Account blocked. Contact admin." }, { status: 403 });
    }
    // Accept either { players: [...] } or single player payload or array directly
    let rawPlayers: unknown[] = [];
    if (Array.isArray(body)) {
      rawPlayers = body;
    } else if (Array.isArray(b.players)) {
      rawPlayers = b.players as unknown[];
    } else if (typeof b.username === "string") {
      rawPlayers = [body];
    } else {
      return NextResponse.json({ error: "Invalid payload, expected { players: PlayerData[] }" }, { status: 400 });
    }
    if (rawPlayers.length > MAX_PLAYERS) {
      return NextResponse.json({ error: `Too many players (max ${MAX_PLAYERS})` }, { status: 413 });
    }

    // v2: only executed accounts (isLocal true) + require v2 fields to drop old bridge payloads
    // + sanitize ทุก record (ตัด string ยาว, ตัด pets เกิน, ตัวเลข non-finite → 0)
    const players: PlayerData[] = [];
    for (const raw of rawPlayers) {
      const r = raw as { username?: unknown; isLocal?: unknown; treadmillLevel?: unknown; eggsInBag?: unknown; gameId?: unknown };
      if (!r || typeof r.username !== "string" || r.isLocal === false) continue;
      // Faz2 multi-game: stealanegg must have v2 fields (drop old bridge); other games (AE/BF stub) pass without them
      const gRaw = typeof r.gameId === "string" ? r.gameId.toLowerCase() : "stealanegg";
      if (gRaw === "stealanegg" && r.treadmillLevel === undefined && r.eggsInBag === undefined) continue;
      const clean = sanitizePlayer(raw);
      if (clean) players.push(clean);
    }
    players.sort((a, b) => {
        const aMoney = a.money ?? 0;
        const bMoney = b.money ?? 0;
        const aHas = aMoney > 0;
        const bHas = bMoney > 0;
        if (aHas && bHas) return bMoney - aMoney;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return (b.moneyPerSec ?? 0) - (a.moneyPerSec ?? 0);
      });

    // sanitizePlayer จัดการ normalize/sort ไว้แล้ว เหลือแค่กัน pcName หาย
    for (const p of players) {
      if (!p.pcName) p.pcName = "unknown";
    }

    setPlayersForUser(user.id, players);
    return NextResponse.json({ ok: true, count: players.length });
  } catch (e) {
    console.error("[ingest] failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  recordHit("api", "/api/ingest");
  // Only clear the caller's own data if api_key provided, otherwise 401 (Q12)
  // รับ key ทาง JSON body หรือ x-api-key header เท่านั้น — ห้ามผ่าน URL query (หลุดใน log/history)
  try {
    const body = await req.json().catch(() => ({}));
    const rawKey: string | undefined =
      (typeof body?.api_key === "string" && body.api_key) ||
      (typeof body?.apiKey === "string" && body.apiKey) ||
      req.headers.get("x-api-key") ||
      undefined;
    if (!rawKey || !rawKey.startsWith("sd_") || rawKey.length > MAX_KEY_LEN) {
      return NextResponse.json({ error: "Missing api_key (send via JSON body or x-api-key header, never in URL)" }, { status: 401 });
    }
    const user = await getUserByApiKey(rawKey);
    if (!user) return NextResponse.json({ error: "Invalid api_key" }, { status: 401 });
    const { clearAllForUser } = await import("@/shared/lib/store");
    clearAllForUser(user.id);
    return NextResponse.json({ ok: true, cleared: true });
  } catch {
    return NextResponse.json({ error: "Missing api_key" }, { status: 401 });
  }
}

export async function GET() {
  return NextResponse.json({ hint: "POST JSON { api_key: 'sd_...', players: PlayerData[] } to this endpoint (or send key via x-api-key header, never in URL)" });
}
