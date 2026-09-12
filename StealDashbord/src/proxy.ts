import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// หมายเหตุ: อย่าดีดคนไม่ login ไป /api/auth/signin จากตรงนี้ — หน้านั้นเป็น default UI
// ของ Auth.js ที่น่าเกลียดและไม่มีทางกลับ ส่วนหน้าเกมทุกหน้า (/stealanegg ฯลฯ) มีการ์ด
// login ของตัวเองพร้อม callbackUrl ที่ถูกต้องอยู่แล้ว ข้อมูลจริงกันซ้ำที่ API ด้วย auth()
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // entry เก่า (extensionless + root .lua) — redirect ไป route ที่มี auth พร้อม ?key= เดิม
  // (ไฟล์จริงย้ายออกจาก public/ ไป lua-private/ แล้ว กันดึงตรงเลี่ยงเช็ค key)
  const LEGACY_LOADER_PATHS = new Set([
    "/Xsprob.lua",
    "/StealAnEgg",
    "/AnimeExpedition",
    "/BloxFruits",
    "/StealDashbord.lua",
  ]);
  if (LEGACY_LOADER_PATHS.has(pathname)) {
    const dest = new URL("/scripts/xsprob.lua", request.url);
    const key =
      request.nextUrl.searchParams.get("key") ??
      request.nextUrl.searchParams.get("api_key");
    if (key) dest.searchParams.set("key", key);
    return NextResponse.redirect(dest, 307);
  }

  // Normalize /StealAnEgg or any casing variation to /stealanegg
  if (pathname.toLowerCase() === "/stealanegg" && pathname !== "/stealanegg") {
    return NextResponse.redirect(new URL("/stealanegg", request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|pets).*)"],
};
