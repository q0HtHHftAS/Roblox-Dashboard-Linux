import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_2FA_COOKIE, requireAdminApi } from "@/shared/lib/admin";
import { clientIp, writeAudit } from "@/shared/lib/audit";

// Reset 2FA (ต้องผ่าน 2FA session อยู่แล้ว) — ปิด totp กลับไปหน้า enroll QR ใหม่
export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const u = await prisma.user.findUnique({ where: { discordId: gate.discordId } });
    if (!u) return NextResponse.json({ error: "Login with Discord first" }, { status: 400 });
    await prisma.user.update({
      where: { id: u.id },
      data: { totpEnabled: false, totpEnabledAt: null, totpSecret: null, backupCodes: "[]" },
    });
    await writeAudit(gate.discordId, "totp_reset", undefined, clientIp(req));
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_2FA_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
