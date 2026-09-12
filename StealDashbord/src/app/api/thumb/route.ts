import { NextRequest, NextResponse } from "next/server";
import { checkSensitiveRateLimit, getClientIp } from "@/shared/lib/store";
import { recordHit } from "@/shared/lib/dailyStats";

// Cache ผลลัพธ์ใน memory กันยิง Roblox API ซ้ำ ๆ ทุก polling (สาเหตุหลักที่โดน
// rate-limit แล้ว API เริ่มตอบ error จนรูปแตกยกแผง):
// success จำ 1 ชม. / not-found จำ 60 วิ (กัน hammer แต่ยังให้โอกาสรูปที่ render เสร็จทีหลัง)
const memCache = new Map<string, { exp: number; url: string | null }>();

function getCached(id: string): string | null | undefined {
  const hit = memCache.get(id);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    memCache.delete(id);
    return undefined;
  }
  return hit.url;
}

// Content hash ของ "รูปแตก" ที่ Roblox ส่งมาแทน thumbnail จริง (state=Completed แต่รูปคือไอคอนแตก)
// เกิดกับ asset ที่ thumbnails API render ไม่ได้ (เช่น รูปอัปโหลดใหม่ยังไม่ผ่านคิว) — เจอแบบนี้ให้ถือว่าไม่มีรูป
// จะได้โชว์ตัวอักษรแทน (อัปเดตรายการนี้ได้ถ้า Roblox เปลี่ยนกราฟิกรูปแตก)
const BROKEN_CONTENT_HASHES = new Set([
  "e5bef3179d5ce82a42fdc8ddc83a2ba9", // https://t0.rbxcdn.com/180DAY-e5bef3179d5ce82a42fdc8ddc83a2ba9
]);

function isBrokenImage(url: string): boolean {
  for (const h of BROKEN_CONTENT_HASHES) {
    if (url.includes(h)) return true;
  }
  return false;
}

// redirect ปลายทางมาจาก Roblox API — allowlist กัน open-redirect ถ้า upstream ส่ง URL แปลกมา
function isAllowedCdnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)rbxcdn\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function redirectToCdn(url: string) {
  // Redirect to CDN กันกระพริบ — browser จำ 302 แค่ 10 นาที (สั้นพอให้ blocklist รูปแตกมีผลเร็วถ้า bump THUMB_V,
  // ยาวพอให้ไม่ยิงซ้ำทุก polling) ส่วน server/CDN จำ 1 ชม. อยู่แล้วผ่าน memCache + s-maxage
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");
  res.headers.set("CDN-Cache-Control", "public, max-age=3600");
  return res;
}

function noImage(state?: string, status = 404) {
  // no-store: กัน browser จำ 404 แล้วรูปค้างเป็นตัวอักษร/แตกแม้รูปมาจริงทีหลัง
  return NextResponse.json({ error: "no image", state }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  recordHit("api", "/api/thumb");
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  // กันสุ่ม ?id= ยิง upstream Roblox รัว ๆ (cache ช่วยเฉพาะ id ซ้ำ — id ใหม่ทะลุทุกครั้ง)
  if (!checkSensitiveRateLimit(`thumb:${getClientIp(req)}`, 120).allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  }
  const hit = getCached(id);
  if (hit !== undefined) {
    if (hit === null) return noImage();
    return redirectToCdn(hit);
  }
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${id}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`, {
      headers: { "User-Agent": "Xsprob" },
      // route นี้ dynamic (อ่าน searchParams) เลยใช้ fetch cache ของ Next ไม่ได้ — ใช้ memCache ด้านบนแทน
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`roblox thumbnails ${r.status}`);
    const j = await r.json();
    const entry = j?.data?.[0];
    const url: string | undefined = entry?.imageUrl;
    const state: string | undefined = entry?.state;
    // ถ้า Roblox ส่ง placeholder (state != Completed / url เป็น placeholder / รูปแตก / host นอก rbxcdn) ให้ถือว่าไม่มีรูป — จะได้โชว์ตัวอักษรแทน
    if (!url || state !== "Completed" || url.includes("PlaceHolder") || url.includes("placeHolder") || isBrokenImage(url) || !isAllowedCdnUrl(url)) {
      memCache.set(id, { exp: Date.now() + 60_000, url: null });
      return noImage(state);
    }
    memCache.set(id, { exp: Date.now() + 3_600_000, url });
    return redirectToCdn(url);
  } catch (e) {
    console.error("[thumb] failed", e);
    return NextResponse.json({ error: "thumbnail unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
