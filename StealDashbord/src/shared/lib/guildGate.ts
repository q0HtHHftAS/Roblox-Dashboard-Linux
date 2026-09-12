// ประตูสมาชิก Discord — ecosystem ร่วมกับบอท robloxupdatetracker:
//
//  - ใช้ Bot Token ของบอทยิง Discord API ฝั่ง server เช็คว่า discordId เป็น
//   สมาชิก guild ที่กำหนดไว้หรือไม่ (user ไม่ต้อง authorize scope เพิ่ม)
//  - ALLOWED_DISCORD_IDS = bypass สำหรับแอดมิน (seed มาจาก ALLOWED_USER_IDS ของบอท)
//  - ALLOWED_DISCORD_ROLE_IDS (optional) = ต้องมี role อย่างน้อย 1 ในนี้
//    (เช่น Verified role ของระบบ /verify+captcha — ดู role id ด้วย Server Settings > Roles)
//
// กฎ: fail-closed — ไม่ผ่าน = เข้าไม่ได้, ตั้งค่าผิด = เข้าไม่ได้ทุกคน + log บอก

const SNOWFLAKE_RE = /^\d{17,20}$/;

function parseIdList(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => SNOWFLAKE_RE.test(s));
}

export function getGateConfig() {
  const guildIds = parseIdList(process.env.ALLOWED_DISCORD_GUILD_ID);
  const allowIds = parseIdList(process.env.ALLOWED_DISCORD_IDS);
  const roleIds = parseIdList(process.env.ALLOWED_DISCORD_ROLE_IDS);
  const botToken = (process.env.DISCORD_BOT_TOKEN ?? "").trim();
  return {
    guildIds,
    allowIds,
    roleIds,
    botToken,
    // ต้องมี guild อย่างน้อย 1 + bot token ถึงจะตรวจได้ (allowlist อย่างเดียวก็ถือว่าเปิดใช้ได้)
    usable: (guildIds.length > 0 && botToken.length > 0) || allowIds.length > 0,
  };
}

export type GateReason =
  | "ok-allowlist"
  | "ok-member"
  | "missing-id"
  | "not-configured"
  | "not-member"
  | "missing-role"
  | "network-error"
  | "check-failed";

export type GateVerdict = { ok: boolean; reason: GateReason; roles?: string[] };

// cache กันยิง Discord API รัว (login ถี่ / revalidate ทุก request)
const cache = new Map<string, { v: GateVerdict; until: number }>();
const OK_TTL_MS = 10 * 60 * 1000;
const DENY_TTL_MS = 60 * 1000;

function cacheGet(key: string): GateVerdict | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.until) {
    cache.delete(key);
    return null;
  }
  return e.v;
}

function cacheSet(key: string, v: GateVerdict) {
  cache.set(key, { v, until: Date.now() + (v.ok ? OK_TTL_MS : DENY_TTL_MS) });
  // กัน map โตไม่จำกัด
  if (cache.size > 5000) {
    const first = cache.keys().next();
    if (!first.done) cache.delete(first.value);
  }
}

async function fetchMember(
  guildId: string,
  discordId: string,
  botToken: string
): Promise<{ found: boolean; roles: string[] } | null> {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.status === 200) {
      const data = (await res.json()) as { roles?: unknown };
      const roles = Array.isArray(data.roles)
        ? data.roles.filter((r): r is string => typeof r === "string")
        : [];
      return { found: true, roles };
    }
    if (res.status === 404) return { found: false, roles: [] };
    console.error(`[gate] discord api unexpected status ${res.status} guild=${guildId}`);
    return null;
  } catch (e) {
    console.error(`[gate] discord api fetch failed guild=${guildId}:`, e);
    return null;
  }
}

export async function checkGuildMembership(discordId: string): Promise<GateVerdict> {
  if (!discordId || !SNOWFLAKE_RE.test(discordId)) {
    return { ok: false, reason: "missing-id" };
  }
  const cfg = getGateConfig();

  // bypass แอดมิน — ไม่ต้องเป็นสมาชิก guild ก็ได้
  if (cfg.allowIds.includes(discordId)) return { ok: true, reason: "ok-allowlist" };

  if (cfg.guildIds.length === 0 || !cfg.botToken) {
    console.error("[gate] not configured: set ALLOWED_DISCORD_GUILD_ID + DISCORD_BOT_TOKEN (or ALLOWED_DISCORD_IDS)");
    return { ok: false, reason: "not-configured" };
  }

  const cached = cacheGet(discordId);
  if (cached) return cached;

  let sawNetworkError = false;
  for (const gid of cfg.guildIds) {
    const m = await fetchMember(gid, discordId, cfg.botToken);
    if (!m) {
      sawNetworkError = true;
      continue;
    }
    if (!m.found) continue;
    // เป็นสมาชิก — ถ้ากำหนด role ไว้ต้องมีอย่างน้อย 1
    if (cfg.roleIds.length > 0 && !m.roles.some((r) => cfg.roleIds.includes(r))) {
      const v: GateVerdict = { ok: false, reason: "missing-role", roles: m.roles };
      cacheSet(discordId, v);
      return v;
    }
    const v: GateVerdict = { ok: true, reason: "ok-member", roles: m.roles };
    cacheSet(discordId, v);
    return v;
  }

  const v: GateVerdict = sawNetworkError
    ? { ok: false, reason: "network-error" }
    : { ok: false, reason: "not-member" };
  cacheSet(discordId, v);
  return v;
}

// ใช้ตอน revalidate session: โดนเตะออกจาก guild (not-member/missing-role) = ตัด session,
// แต่ network-error = เก็บ session ไว้ก่อนแล้วลองใหม่รอบหน้า (กัน Discord ล่มแล้วหลุดทั้งเว็บ)
export function isHardGateFailure(reason: GateReason): boolean {
  return reason === "not-member" || reason === "missing-role";
}
