import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/shared/lib/prisma";
import {
  ADMIN_2FA_COOKIE,
  ADMIN_2FA_TTL_MS,
  clearTotpLock,
  isAdminDiscordId,
  recordTotpFail,
  signAdminToken,
  totpLocked,
} from "@/shared/lib/admin";
import { clientIp, writeAudit } from "@/shared/lib/audit";
import { decryptSecret, hashBackupCode, parseBackupHashes, verifyTotp } from "@/shared/lib/totp";

function setCookie(res: NextResponse, did: string): void {
  res.cookies.set(ADMIN_2FA_COOKIE, signAdminToken(did, Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ADMIN_2FA_TTL_MS / 1000),
  });
}

// กรอกโค้ด 6 หลัก: ใช้ได้ทั้ง TOTP และ backup code (ครั้งเดียวทิ้ง)
// - ถ้ายังไม่เปิดใช้ (enroll): รับเฉพาะ TOTP → เปิดใช้จริง
// - ถ้าเปิดแล้ว: TOTP หรือ backup code → ได้ session; backup code จะถูก consume + แนะให้ re-enroll
export async function POST(req: Request) {
  const session = await auth();
  const did = (session?.user as { discordId?: string } | undefined)?.discordId;
  if (!did || !isAdminDiscordId(did)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const wait = totpLocked(did);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(wait / 60000)} min.` },
      { status: 429 }
    );
  }
  let token = "";
  try {
    const b = (await req.json()) as { token?: unknown };
    token = typeof b.token === "string" ? b.token : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const ip = clientIp(req);
  try {
    const u = await prisma.user.findUnique({ where: { discordId: did } });
    if (!u) return NextResponse.json({ error: "Login with Discord first" }, { status: 400 });

    // 1) ลอง TOTP ก่อน
    const secret = u.totpSecret ? decryptSecret(u.totpSecret) : null;
    if (secret && (await verifyTotp(secret, token))) {
      clearTotpLock(did);
      if (!u.totpEnabled) {
        await prisma.user.update({
          where: { id: u.id },
          data: { totpEnabled: true, totpEnabledAt: new Date() },
        });
        await writeAudit(did, "totp_enabled", undefined, ip);
      } else {
        await writeAudit(did, "totp_ok", undefined, ip);
      }
      const res = NextResponse.json({ ok: true });
      setCookie(res, did);
      return res;
    }

    // 2) backup code (ใช้ได้เฉพาะตอนเปิดใช้แล้ว — เปิดใช้ครั้งแรกต้องใช้ TOTP เท่านั้น)
    if (u.totpEnabled) {
      const hashes = parseBackupHashes(u.backupCodes);
      const h = hashBackupCode(token);
      const idx = hashes.indexOf(h);
      if (idx >= 0) {
        hashes.splice(idx, 1);
        await prisma.user.update({ where: { id: u.id }, data: { backupCodes: JSON.stringify(hashes) } });
        clearTotpLock(did);
        await writeAudit(did, "backup_code_used", `${hashes.length} left`, ip);
        const res = NextResponse.json({ ok: true, reEnroll: true, codesLeft: hashes.length });
        setCookie(res, did);
        return res;
      }
    }

    const justLocked = recordTotpFail(did);
    await writeAudit(did, justLocked ? "totp_locked" : "totp_fail", undefined, ip);
    if (justLocked) {
      return NextResponse.json({ error: "Too many attempts. Locked for 15 min." }, { status: 429 });
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
