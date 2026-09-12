import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Admin guard: admin = Discord ID ใน env ADMIN_DISCORD_IDS (Q1-A)
// คนไม่ใช่ admin เจอ 404 เสมอ (Q13 — ไม่บอกว่ามีหน้านี้อยู่)
// 2FA session = cookie ลายเซ็น HMAC อายุ 12 ชม. (Q7-A)

export const ADMIN_2FA_TTL_MS = 12 * 3600 * 1000;
export const ADMIN_2FA_COOKIE = "sd_admin2fa";

export function adminDiscordIds(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{17,20}$/.test(s));
}

export function isAdminDiscordId(did?: string | null): boolean {
  if (!did) return false;
  return adminDiscordIds().includes(did);
}

function signingKey(): Buffer {
  const s = (process.env.AUTH_SECRET ?? "").trim();
  if (!s) throw new Error("[admin] AUTH_SECRET is not set");
  return crypto.createHash("sha256").update("admin2fa:" + s, "utf8").digest();
}

// token = base64url(JSON {did, at}).base64url(HMAC)
export function signAdminToken(did: string, at: number): string {
  const payload = Buffer.from(JSON.stringify({ did, at }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string, did: string): number | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expect = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expect, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      did?: unknown;
      at?: unknown;
    };
    if (data.did !== did || typeof data.at !== "number") return null;
    if (Date.now() - data.at > ADMIN_2FA_TTL_MS) return null;
    return data.at;
  } catch {
    return null;
  }
}

export type AdminGate =
  | { status: "denied" } // ไม่ใช่ admin (→ 404) หรือไม่ login
  | { status: "enroll"; discordId: string } // admin แต่ยังไม่เปิด 2FA
  | { status: "verify"; discordId: string } // เปิดแล้วแต่ session หมดอายุ
  | { status: "ok"; discordId: string; verifiedAt: number };

export async function getAdminGate(cookieToken?: string | null): Promise<AdminGate> {
  const session = await auth();
  const did = (session?.user as { discordId?: string } | undefined)?.discordId;
  if (!did || !isAdminDiscordId(did)) return { status: "denied" };
  if (cookieToken) {
    const at = verifyAdminToken(cookieToken, did);
    if (at) return { status: "ok", discordId: did, verifiedAt: at };
  }
  // ต้องรู้ว่าเคย enroll หรือยัง — อ่านจาก DB
  const { prisma } = await import("@/shared/lib/prisma");
  try {
    const u = await prisma.user.findUnique({
      where: { discordId: did },
      select: { totpEnabled: true },
    });
    if (u?.totpEnabled) return { status: "verify", discordId: did };
  } catch {
    // DB ล่ม = fail-closed ให้ verify (verify จะ fail-closed ต่อเอง)
    return { status: "verify", discordId: did };
  }
  return { status: "enroll", discordId: did };
}

// สำหรับ API routes — ไม่ใช่ admin / 2FA หมดอายุ = 404 (stealth ตาม Q13)
export async function requireAdminApi(req: Request): Promise<{ discordId: string } | NextResponse> {
  const m = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)sd_admin2fa=([^;]+)/);
  const gate = await getAdminGate(m?.[1] ? decodeURIComponent(m[1]) : null);
  if (gate.status !== "ok") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return { discordId: gate.discordId };
}

// ---- กันเดาโค้ด 2FA (Q9): ผิด 5 ครั้งติด = ล็อก 15 นาที ----
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; lockedUntil: number }>();

export function totpLocked(did: string): number {
  const e = fails.get(did);
  if (!e) return 0;
  if (Date.now() < e.lockedUntil) return e.lockedUntil - Date.now();
  return 0;
}

export function recordTotpFail(did: string): boolean {
  const e = fails.get(did) ?? { count: 0, lockedUntil: 0 };
  e.count += 1;
  if (e.count >= MAX_FAILS) {
    e.lockedUntil = Date.now() + LOCK_MS;
    e.count = 0;
    fails.set(did, e);
    return true; // เพิ่งโดนล็อก
  }
  fails.set(did, e);
  return false;
}

export function clearTotpLock(did: string): void {
  fails.delete(did);
}
