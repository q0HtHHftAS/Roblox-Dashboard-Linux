import crypto from "crypto";

// apiKey ที่เก็บในคอลัมน์ User.apiKey เป็น sha256 hex (64 ตัวอักษร) —
// ไฟล์ DB หลุด คีย์ตัวจริงก็ยังไม่หลุดตาม (one-way, ย้อนกลับไม่ได้)
//
// legacy: แถวเก่าเก็บ plaintext "sd_..." ตรงๆ — ยังใช้งานได้ผ่าน fallback
// ใน getUserByApiKey แล้ว migrate เป็น hash แบบโปร่งใสตอน bot ยิง ingest สำเร็จ
// (คีย์เดิมของ user ไม่เปลี่ยน ไม่ต้องตั้งค่าสคริปต์ใหม่)

export function generateApiKey(): string {
  return "sd_" + crypto.randomBytes(24).toString("base64url");
}

export function hashApiKey(plain: string): string {
  return crypto.createHash("sha256").update(plain, "utf8").digest("hex");
}

export function isLegacyPlaintextApiKey(v: string | null | undefined): v is string {
  return !!v && v.startsWith("sd_");
}

export function isHashedApiKey(v: string | null | undefined): boolean {
  return !!v && /^[0-9a-f]{64}$/.test(v);
}
