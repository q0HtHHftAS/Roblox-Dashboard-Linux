import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getUserByApiKey } from "@/shared/lib/store";
import { recordHit } from "@/shared/lib/dailyStats";

// Loader Lua สำหรับ Roblox executor — ห้ามย้ายกลับเข้า public/ เด็ดขาด
// (ไฟล์ใน public/ เลี่ยง route/auth ได้เสมอ ของจริงอยู่ใน lua-private/ เท่านั้น)
const ALLOWED_SCRIPTS = new Set([
  "xsprob.lua",
  "steal-an-egg.lua",
  "anime-expeditions.lua",
  "anime-origin.lua",
  "blox-fruits.lua",
]);

// Grace 30 วันหลัง deploy (ตกลง Q9): URL เก่าไม่มี key ยังได้สคริปต์ตัวเต็ม + warning
// หมดเขตแล้วคืน error("Authorization failed") แทน — override ผ่าน env ได้
const GRACE_UNTIL_MS = Date.parse(
  (process.env.SCRIPT_KEY_GRACE_UNTIL ?? "2026-10-11T00:00:00Z").trim()
);

const DEPRECATION_WARNING = `-- [Xsprob] WARNING: loader นี้จะใช้ไม่ได้หลัง grace period (30 วัน)
-- ไปกด Get Script ใหม่ใน dashboard จะได้บรรทัด loadstring แบบมี ?key= ฝังมาให้
-- (URL เก่าไม่มี key โดนปิด ให้ไปเอาอันใหม่ก่อนโดนตัด)
pcall(function()
  game:GetService("StarterGui"):SetCore("SendNotification", {
    Title = "Xsprob - update required",
    Text = "Get Script ใหม่ใน dashboard ก่อนโดนตัด (grace 30 วัน)",
    Duration = 10,
  })
end)
warn("[Xsprob] DEPRECATED: re-run Get Script in dashboard to get a keyed URL (grace 30 days).")

`;

const LUA_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: NextRequest,
  ctx: { params: { name: string } | Promise<{ name: string }> }
) {
  // Next เวอร์ชันใหม่ส่ง params เป็น Promise — รองรับทั้งสองแบบ
  const raw = ctx.params;
  const { name } =
    typeof (raw as Promise<{ name: string }>)?.then === "function"
      ? await (raw as Promise<{ name: string }>)
      : (raw as { name: string });
  const file = String(name ?? "").toLowerCase();
  recordHit("api", "/scripts/*");
  if (!ALLOWED_SCRIPTS.has(file)) {
    return new NextResponse("Not found", { status: 404, headers: LUA_HEADERS });
  }

  const qp = request.nextUrl.searchParams;
  const key = (qp.get("key") ?? qp.get("api_key") ?? "").trim();
  const user = await getUserByApiKey(key);

  let body: string;
  try {
    body = await readFile(path.join(process.cwd(), "lua-private", file), "utf8");
  } catch {
    return new NextResponse("Not found", { status: 404, headers: LUA_HEADERS });
  }

  if (user) {
    return new NextResponse(body, { status: 200, headers: LUA_HEADERS });
  }
  // ไม่มี key: ใน grace คืนของจริง + warning (สคริปต์เก่ายังรันได้), หมดเขต = 401
  if (Number.isFinite(GRACE_UNTIL_MS) && Date.now() <= GRACE_UNTIL_MS) {
    return new NextResponse(DEPRECATION_WARNING + body, {
      status: 200,
      headers: LUA_HEADERS,
    });
  }
  return new NextResponse('error("Authorization failed")', {
    status: 401,
    headers: LUA_HEADERS,
  });
}
