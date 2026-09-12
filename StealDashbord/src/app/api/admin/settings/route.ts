import { NextResponse } from "next/server";
import { requireAdminApi } from "@/shared/lib/admin";
import { clientIp, writeAudit } from "@/shared/lib/audit";
import { getSettings, setSettings } from "@/shared/lib/siteSettings";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  const settings = await getSettings();
  // env-level โชว์ read-only (Q5-A) — เฉพาะค่าที่ไม่ลับ
  const readonly = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    scriptKeyGraceUntil: (process.env.SCRIPT_KEY_GRACE_UNTIL ?? "2026-10-11T00:00:00Z").trim(),
    guildGate: (process.env.ALLOWED_DISCORD_GUILD_ID ?? "").trim() || "(not set)",
  };
  return NextResponse.json({ settings, readonly });
}

export async function PATCH(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  let patch: Record<string, string>;
  try {
    patch = (await req.json()) as Record<string, string>;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("bad body");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const before = await getSettings();
    const after = await setSettings(patch);
    const diff = Object.keys(patch)
      .filter((k) => before[k] !== after[k])
      .map((k) => `${k}: ${before[k] ?? ""} -> ${after[k] ?? ""}`)
      .join("; ")
      .slice(0, 1000);
    await writeAudit(gate.discordId, "settings_update", diff || "(no change)", clientIp(req));
    return NextResponse.json({ settings: after });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
