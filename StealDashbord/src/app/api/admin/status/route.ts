import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminGate } from "@/shared/lib/admin";
import { prisma } from "@/shared/lib/prisma";
import { parseBackupHashes } from "@/shared/lib/totp";

// สถานะประตู admin สำหรับ UI (denied ก็คืน 404 — ไม่บอกว่ามีหน้านี้)
export async function GET() {
  const jar = await cookies();
  const gate = await getAdminGate(jar.get("sd_admin2fa")?.value ?? null);
  if (gate.status === "denied") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (gate.status === "ok") {
    return NextResponse.json({ status: "ok", verifiedAt: gate.verifiedAt });
  }
  let codesLeft: number | null = null;
  try {
    const u = await prisma.user.findUnique({
      where: { discordId: gate.discordId },
      select: { backupCodes: true, totpEnabled: true },
    });
    if (u?.totpEnabled) codesLeft = parseBackupHashes(u.backupCodes).length;
  } catch {
    // เงียบ
  }
  return NextResponse.json({ status: gate.status, codesLeft });
}
