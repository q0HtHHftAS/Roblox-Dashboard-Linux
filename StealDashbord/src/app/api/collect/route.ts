import { NextResponse } from "next/server";
import { recordHit } from "@/shared/lib/dailyStats";

// รับ pageview จาก PageviewTracker (client) — ไม่เก็บ IP/user (Q14)
// มีแค่ path normalize กัน row บวม; ยิงถี่ได้เพราะ recordHit เป็น fire-and-forget
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { path?: unknown };
    const p = typeof b.path === "string" ? b.path : "";
    if (!p.startsWith("/") || p.length > 128) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    // normalize: ตัด query + collapse /share/<token> กัน token หลุดมาเป็น route
    const clean = p.split("?", 1)[0].slice(0, 64);
    if (clean.startsWith("/share/")) {
      recordHit("page");
    } else if (/^\/[a-z0-9/_-]*$/i.test(clean)) {
      recordHit("page");
    } else {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
