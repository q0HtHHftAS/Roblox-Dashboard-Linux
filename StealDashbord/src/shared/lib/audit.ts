import { prisma } from "@/shared/lib/prisma";

// Audit Log: เก็บเฉพาะ admin action (Q6) — retention 90 วัน + ปุ่ม clear
export const AUDIT_RETENTION_DAYS = 90;

export async function writeAudit(
  actorDiscordId: string,
  action: string,
  detail?: string,
  ip?: string
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: { actorDiscordId, action, detail: detail?.slice(0, 2000), ip: ip?.slice(0, 64) },
    });
    // prune แบบสุ่ม 2% กันทุก write ต้องแบก delete
    if (Math.random() < 0.02) {
      await pruneAudit().catch(() => {});
    }
  } catch {
    // audit ห้ามทำ action หลักพัง
  }
}

export async function pruneAudit(): Promise<number> {
  const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 3600 * 1000);
  try {
    const r = await prisma.adminAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return r.count;
  } catch {
    return 0;
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return req.headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}
