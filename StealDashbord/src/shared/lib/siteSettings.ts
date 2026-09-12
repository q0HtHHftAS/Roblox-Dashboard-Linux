import { prisma } from "@/shared/lib/prisma";

// Settings ระดับ DB (Q5-A / Q12) — แก้ผ่าน Admin UI ได้โดยไม่ restart
// ค่า env-level โชว์ read-only ข้าง ๆ ในหน้า settings
export const SETTING_DEFS: Record<string, { label: string; def: string; kind: "text" | "bool" }> = {
  siteName: { label: "ชื่อเว็บ", def: "StealDashbord", kind: "text" },
  contactInfo: { label: "ข้อมูลติดต่อ", def: "", kind: "text" },
  registrationEnabled: { label: "รับสมาชิกใหม่ (Discord login)", def: "true", kind: "bool" },
  shareDefaultEnabled: { label: "เปิด share link ให้ user ใหม่เป็นค่าเริ่มต้น", def: "false", kind: "bool" },
};

export async function getSettings(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, d] of Object.entries(SETTING_DEFS)) out[k] = d.def;
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: Object.keys(SETTING_DEFS) } },
    });
    for (const r of rows) out[r.key] = r.value;
  } catch {
    // DB ล่ม = ใช้ default (fail-open สำหรับค่าอ่านอย่างเดียว)
  }
  return out;
}

export async function setSettings(patch: Record<string, string>): Promise<Record<string, string>> {
  const clean: Record<string, string> = {};
  for (const [k, d] of Object.entries(SETTING_DEFS)) {
    if (!(k in patch)) continue;
    let v = String(patch[k] ?? "").slice(0, 500);
    if (d.kind === "bool") v = v === "true" ? "true" : "false";
    clean[k] = v;
  }
  for (const [k, v] of Object.entries(clean)) {
    await prisma.siteSetting.upsert({
      where: { key: k },
      create: { key: k, value: v },
      update: { value: v },
    });
  }
  return getSettings();
}

export async function isRegistrationEnabled(): Promise<boolean> {
  const s = await getSettings();
  return s.registrationEnabled !== "false";
}
