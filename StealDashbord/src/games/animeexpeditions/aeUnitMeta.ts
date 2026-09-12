// Auto metadata สำหรับ units ของ Anime Expeditions — ยูนิตใหม่ในเกมต้องโชว์ข้อมูลได้เอง
//
// หลักการเดียวกับฝั่ง AO (ดู aoUnitMeta.ts):
//   1. ชื่อ: prettyAEUnitName() แปลง asset ดิบอัตโนมัติ ("GutsEVO" -> "Guts EVO");
//      ถ้า Lua ส่ง displayName (Information.Assets) มาก็ใช้ชื่อจากเกมก่อนเสมอ
//   2. รูป: AE_UNIT_IMAGE_MAP มาก่อน (ของเดิมที่ sync จาก wiki) —
//      ไม่มีใน map ก็ลองไฟล์ตาม convention `public/ae-units/<norm>.png` เอง
//      (norm = ตัวเล็กตัดอักขระพิเศษ เช่น gutsevo.png) วางไฟล์อย่างเดียว ไม่ต้องแก้โค้ด
//      ถ้า Lua ส่ง image (asset id) มาจะใช้รูปนั้นผ่าน /api/thumb ก่อนทั้งหมด
//   3. rarity: payload-first (Lua อ่าน Information.Assets.Rarity จากเกม = source of truth)
//      + static map เดิมเป็น fallback + EVO สืบทอดจากร่าง base
//      + จำค่าที่เคยเห็นไว้ใน localStorage อัตโนมัติ
import { aeUnitImageFor } from "@/games/animeexpeditions/aeUnitImageMap";
import { aeUnitRarity } from "@/games/animeexpeditions/aeUnitRarityMap";

// ---------------------------------------------------------------------------
// ชื่อ
// ---------------------------------------------------------------------------

// "GriffithFemto" -> "Griffith Femto", "GutsEVO" -> "Guts EVO",
// "SkullKnightEVO" -> "Skull Knight EVO"
export function prettyAEUnitName(asset?: string | null): string {
  if (!asset) return "Unknown";
  let s = asset.replace(/_/g, " ");
  s = s.replace(/\s*(EVO|Evolved)\s*$/i, " EVO");
  s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  s = s.replace(/\s+/g, " ").trim();
  return s || asset;
}

// ชื่อที่ควรโชว์: displayName จากเกมมาก่อน, ไม่มีค่อย pretty อัตโนมัติ
export function aeDisplayName(asset?: string | null, displayName?: string | null): string {
  const d = (displayName || "").trim();
  if (d) return d;
  return prettyAEUnitName(asset);
}

// ---------------------------------------------------------------------------
// รูป
// ---------------------------------------------------------------------------

// norm สำหรับเทียบชื่อไฟล์: ตัวเล็ก + ตัวอักษร/ตัวเลขเท่านั้น ("GutsEVO" -> "gutsevo")
export function normAEKey(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// path รูป local ตาม convention (ใช้ทั้ง component โหลดจริง + sync script เช็กไฟล์ขาด)
export function aeUnitImagePath(asset?: string | null): string | null {
  const n = normAEKey(asset);
  if (!n) return null;
  return `/ae-units/${n}.png`;
}

// ลำดับรูปที่จะลอง: map เดิม (override เผื่อชื่อไฟล์ไม่ตรง convention) -> convention
export function aeUnitImageCandidates(asset?: string | null): string[] {
  if (!asset) return [];
  const list: string[] = [];
  const mapped = aeUnitImageFor(asset);
  if (mapped) list.push(mapped);
  const conventional = aeUnitImagePath(asset);
  if (conventional && conventional !== mapped) list.push(conventional);
  return list;
}

// image จาก payload (Lua ส่ง asset id จาก Information.Assets) -> URL ผ่าน thumb proxy
// รับเฉพาะตัวเลข กัน forged URL กลายเป็น <img src> เปิด
export function aeThumbUrl(image?: string | null): string | null {
  const s = (image || "").trim();
  if (!s) return null;
  const m = s.match(/(\d{4,20})/);
  if (!m) return null;
  return `/api/thumb?id=${m[1]}`;
}

// ---------------------------------------------------------------------------
// rarity (payload-first + map เดิม + สืบทอด EVO + จำอัตโนมัติ)
// ---------------------------------------------------------------------------

// asset base สำหรับสืบทอด rarity ("GutsEVO" -> "Guts")
export function aeBaseAsset(asset?: string | null): string | null {
  if (!asset) return null;
  const b = asset.replace(/(_?EVO|_?Evolved)$/i, "");
  return b && b !== asset ? b : null;
}

// ร่าง EVO ที่ชื่อไม่ลงท้ายด้วย EVO (ชื่อเฉพาะในเกม):
// Broken Falcon (Griffith) -> Silver Falcon (GriffithSilver) / 5th God Hand (GriffithFemto)
const AE_EVO_ALIASES = new Set([
  "griffithfemto", "griffithsilver",
]);

// ใช่ร่าง EVO ไหม — ใช้จัดบล็อก EVO อยู่บนเสมอใน Vault
export function aeIsEvo(asset?: string | null): boolean {
  if (!asset) return false;
  if (/(_?EVO|_?Evolved)$/i.test(asset)) return true;
  return AE_EVO_ALIASES.has(normAEKey(asset));
}

const AE_RARITY_LS_KEY = "ae:unit-rarity:v1";
const learnedRarity = new Map<string, string>();
let hydrated = false;

function hydrateLearned(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(AE_RARITY_LS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k === "string" && typeof v === "string" && k && v) {
        learnedRarity.set(k, v.toUpperCase());
      }
    }
  } catch {}
}

// จำ rarity ที่มากับ payload ไว้ (เรียกตอนรวมกลุ่ม — idempotent, เรียกซ้ำได้)
export function observeAEUnitRarity(asset?: string | null, rarity?: string | null): void {
  if (!asset || !rarity) return;
  hydrateLearned();
  const r = rarity.trim().toUpperCase();
  if (!r) return;
  if (learnedRarity.get(asset) !== r) learnedRarity.set(asset, r);
}

// เขียนค่าที่จำไว้ลง localStorage (เรียกใน useEffect ฝั่ง component)
export function persistAEUnitRarities(): void {
  if (typeof window === "undefined" || learnedRarity.size === 0) return;
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of learnedRarity) obj[k] = v;
    window.localStorage.setItem(AE_RARITY_LS_KEY, JSON.stringify(obj));
  } catch {}
}

// ลำดับ: payload > static map > สืบทอดจาก base (EVO) > ค่าที่เคยจำไว้ > undefined
export function resolveAEUnitRarity(asset?: string | null, payloadRarity?: string | null): string | undefined {
  const p = (payloadRarity || "").trim();
  if (p) {
    observeAEUnitRarity(asset, p);
    return p.toUpperCase();
  }
  if (!asset) return undefined;
  hydrateLearned();
  const mapped = aeUnitRarity(asset);
  if (mapped) return mapped;
  const base = aeBaseAsset(asset);
  if (base) {
    const bMapped = aeUnitRarity(base);
    if (bMapped) return bMapped;
    const bLearned = learnedRarity.get(base);
    if (bLearned) return bLearned;
  }
  return learnedRarity.get(asset);
}
