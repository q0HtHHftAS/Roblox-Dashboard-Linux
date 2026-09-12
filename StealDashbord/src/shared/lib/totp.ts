import crypto from "crypto";
import { generateSecret, generateURI, verify } from "otplib";

// TOTP สำหรับ Admin 2FA (ใช้ได้ทั้ง Microsoft / Google Authenticator — มาตรฐาน RFC 6238)
// secret เก็บใน DB แบบเข้ารหัส AES-256-GCM เท่านั้น (Q3) — key มาจาก AUTH_SECRET

function encKey(): Buffer {
  const s = (process.env.AUTH_SECRET ?? "").trim();
  if (!s) throw new Error("[totp] AUTH_SECRET is not set");
  return crypto.createHash("sha256").update("totp:" + s, "utf8").digest();
}

const ISSUER = "StealDashbord";

// "v1:<iv-b64>:<tag-b64>:<ct-b64>"
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(stored: string): string | null {
  try {
    const [v, ivB, tagB, ctB] = stored.split(":");
    if (v !== "v1" || !ivB || !tagB || !ctB) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encKey(),
      Buffer.from(ivB, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function newTotpSecret(): string {
  return generateSecret();
}

export function totpUri(secret: string, accountLabel: string): string {
  return generateURI({ issuer: ISSUER, label: accountLabel, secret });
}

export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const t = token.replace(/[\s-]/g, "");
  if (!/^\d{6,8}$/.test(t)) return false;
  try {
    // epochTolerance 30 เผื่อ clock skew ±30s
    const r = await verify({ secret, token: t, epochTolerance: 30 });
    return typeof r === "object" && r !== null && (r as { valid?: unknown }).valid === true;
  } catch {
    return false;
  }
}

// ---- backup codes: 10 ชุด ใช้ครั้งเดียวทิ้ง เก็บแบบ sha256 ----
export function newBackupCodes(count = 10): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(crypto.randomBytes(5).toString("hex")); // 10 ตัวอักษร
  }
  return out;
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toLowerCase(), "utf8").digest("hex");
}

export function parseBackupHashes(stored: string): string[] {
  try {
    const arr: unknown = JSON.parse(stored);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
