import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/shared/lib/prisma";
import { generateApiKey, hashApiKey, isLegacyPlaintextApiKey } from "@/shared/lib/apikey";
import { recordHit } from "@/shared/lib/dailyStats";

export async function GET() {
  recordHit("api", "/api/user/api-key");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { checkSensitiveRateLimit } = await import("@/shared/lib/store");
  if (!checkSensitiveRateLimit(`keyget:${session.user.id}`, 30).allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true, discordId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  // ยังไม่เคยมีคีย์: ออกคีย์ใหม่ เก็บแบบ hash แล้วโชว์ plaintext "ครั้งเดียว" (provision)
  if (!user.apiKey) {
    const plain = generateApiKey();
    await prisma.user.update({ where: { id: session.user.id }, data: { apiKey: hashApiKey(plain) } });
    return NextResponse.json({ apiKey: plain, discordId: user.discordId, hasKey: true });
  }
  // แถว legacy (plaintext): คืนค่าคงเดิม — จะ migrate เป็น hash เองตอน bot ยิง ingest
  if (isLegacyPlaintextApiKey(user.apiKey)) {
    return NextResponse.json({ apiKey: user.apiKey, discordId: user.discordId, hasKey: true });
  }
  // เก็บแบบ hash แล้ว: ย้อนกลับไปดู plaintext ไม่ได้ — ต้องกด Regenerate (POST) ถึงจะได้คีย์ใหม่
  // (ไม่คืน userId ออกไป — เป็น internal cuid ไม่ใช่ credential และ client ไม่ได้ใช้)
  return NextResponse.json({ apiKey: null, discordId: user.discordId, hasKey: true });
}

export async function POST() {
  recordHit("api", "/api/user/api-key");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // กัน session หลุดแล้วโดนปั่น rotate key รัว ๆ จนบอทเจ้าของดับหมด
  const { checkSensitiveRateLimit } = await import("@/shared/lib/store");
  if (!checkSensitiveRateLimit(`rekey:${session.user.id}`, 5).allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const plain = generateApiKey();
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { apiKey: hashApiKey(plain) },
    select: { discordId: true },
  });
  // คืน plaintext ครั้งเดียวตอน rotate เท่านั้น
  return NextResponse.json({ apiKey: plain, discordId: updated.discordId, hasKey: true });
}
