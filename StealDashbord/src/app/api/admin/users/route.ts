import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireAdminApi } from "@/shared/lib/admin";
import { clientIp, writeAudit } from "@/shared/lib/audit";
import { generateApiKey, hashApiKey } from "@/shared/lib/apikey";

const PAGE_SIZE = 50;

// User Management (Q10-A): list + reset-apiKey + block/unblock + delete (ไม่มีปุ่มเพิ่ม)
export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 64) ?? "";
  try {
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { discordId: { contains: q } },
          ],
        }
      : {};
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        select: {
          id: true,
          discordId: true,
          name: true,
          image: true,
          isBlocked: true,
          totpEnabled: true,
          apiKey: true,
          shareEnabled: true,
          createdAt: true,
          _count: { select: { players: true } },
        },
      }),
    ]);
    return NextResponse.json({
      total,
      users: users.map((u) => ({
        id: u.id,
        discordId: u.discordId,
        name: u.name,
        image: u.image,
        isBlocked: u.isBlocked,
        totpEnabled: u.totpEnabled,
        hasApiKey: !!u.apiKey,
        shareEnabled: u.shareEnabled,
        players: u._count.players,
        createdAt: u.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdminApi(req);
  if (gate instanceof NextResponse) return gate;
  let body: { id?: unknown; op?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; op?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const op = typeof body.op === "string" ? body.op : "";
  if (!id || !["block", "unblock", "resetKey", "delete"].includes(op)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ip = clientIp(req);
  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (op === "block") {
      await prisma.user.update({ where: { id }, data: { isBlocked: true, blockedAt: new Date() } });
      await writeAudit(gate.discordId, "user_block", target.discordId ?? target.id, ip);
      return NextResponse.json({ ok: true });
    }
    if (op === "unblock") {
      await prisma.user.update({ where: { id }, data: { isBlocked: false, blockedAt: null } });
      await writeAudit(gate.discordId, "user_unblock", target.discordId ?? target.id, ip);
      return NextResponse.json({ ok: true });
    }
    if (op === "resetKey") {
      const plain = generateApiKey();
      await prisma.user.update({ where: { id }, data: { apiKey: hashApiKey(plain) } });
      await writeAudit(gate.discordId, "user_reset_key", target.discordId ?? target.id, ip);
      // โชว์ครั้งเดียว — เอาไปวางในสคริปต์ใหม่ทันที
      return NextResponse.json({ ok: true, apiKey: plain });
    }
    // delete — cascade ลบ players/accounts/sessions ตาม schema
    await prisma.user.delete({ where: { id } });
    await writeAudit(gate.discordId, "user_delete", target.discordId ?? target.id, ip);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
