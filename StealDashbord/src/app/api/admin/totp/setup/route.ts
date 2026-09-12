import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/shared/lib/prisma";
import { isAdminDiscordId } from "@/shared/lib/admin";
import { clientIp, writeAudit } from "@/shared/lib/audit";
import {
  encryptSecret,
  hashBackupCode,
  newBackupCodes,
  newTotpSecret,
  totpUri,
} from "@/shared/lib/totp";
import QRCode from "qrcode";

// เริ่ม enroll 2FA: สร้าง secret ใหม่ + backup codes ใหม่ทุกครั้งที่เรียก (rotate)
// โชว์ QR ครั้งเดียว — ยังไม่เปิดใช้จริงจนกว่าจะ confirm ด้วยโค้ด (ดู /verify)
export async function POST(req: Request) {
  const session = await auth();
  const did = (session?.user as { discordId?: string } | undefined)?.discordId;
  if (!did || !isAdminDiscordId(did)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const u = await prisma.user.findUnique({ where: { discordId: did } });
    if (!u) return NextResponse.json({ error: "Login with Discord first" }, { status: 400 });
    if (u.totpEnabled) {
      return NextResponse.json({ error: "2FA already enabled" }, { status: 400 });
    }
    const secret = newTotpSecret();
    const codes = newBackupCodes(10);
    await prisma.user.update({
      where: { id: u.id },
      data: {
        totpSecret: encryptSecret(secret),
        backupCodes: JSON.stringify(codes.map(hashBackupCode)),
      },
    });
    const uri = totpUri(secret, `admin:${did}`);
    const qr = await QRCode.toDataURL(uri);
    await writeAudit(did, "totp_setup_started", undefined, clientIp(req));
    return NextResponse.json({ qr, secret, backupCodes: codes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "setup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
