// Auto metadata สำหรับ towers ของ Anime Origins — ไม่ต้องเพิ่ม map เองทีละตัวอีก
//
// หลักการ: ยูนิตใหม่ในเกมต้องโชว์ข้อมูลได้เองตั้งแต่วันแรก (day-1) โดยไม่ต้องแก้โค้ด
//   1. ชื่อ: prettyAOUnitName() แปลง asset ดิบเป็นชื่ออ่านง่ายอัตโนมัติ
//      ("GriffithFemto" -> "Griffith Femto", "SkullKnightEVO" -> "Skull Knight EVO")
//      ถ้า Lua ส่ง displayName มา (อ่านจาก TowerInfo ในเกม) จะใช้ชื่อจากเกมก่อนเสมอ
//   2. รูป: วางไฟล์ PNG ที่ `public/images/anime-origin/units/<norm>.png` อย่างเดียวพอ
//      (norm = ชื่อ asset ตัวเล็กตัดอักขระพิเศษ เช่น gutsevo.png, griffithfemto.png)
//      ไม่ต้องแตะ map ใดๆ — AOUnitThumb จะลองโหลดเอง เจอก็โชว์ ไม่เจอก็ fallback avatar
//      ถ้า Lua ส่ง image (asset id จาก TowerInfo) มาจะใช้รูปนั้นผ่าน /api/thumb ก่อน
//   3. rarity: payload-first (Lua อ่าน TowerInfo.Rarity จากเกม = source of truth)
//      + EVO สืบทอด rarity จากร่าง base + จำค่าที่เคยเห็นไว้ใน localStorage อัตโนมัติ
//      ยูนิตที่ไม่รู้ rarity จะไปอยู่ล่างสุดตอน sort แต่ไม่หายไปไหน
//   4. trait: จัด tier/สีอัตโนมัติจาก keyword (Immortal/Unbound/... = mythic ฯลฯ)
//      trait ชื่อใหม่ที่ไม่รู้จักจะได้สไตล์กลางๆ + เรียงท้าย — ไม่ต้องมาบอกให้เพิ่ม
//      วางไอคอนที่ `public/images/anime-origin/traits/<norm>.png` (เช่น immortal.png)
//      เจอก็โชว์ ไม่เจอก็โชว์แค่ชื่อ
import type { CSSProperties } from "react";

// ---------------------------------------------------------------------------
// ชื่อ
// ---------------------------------------------------------------------------

// "GriffithFemto" -> "Griffith Femto", "GutsEVO" -> "Guts EVO",
// "Yuta_Evolved" -> "Yuta EVO", "SkullKnight_Evolved" -> "Skull Knight EVO"
export function prettyAOUnitName(asset?: string | null): string {
  if (!asset) return "Unknown";
  let s = asset.replace(/_/g, " ");
  // suffix EVO/Evolved รวมเป็น "EVO" เดียวกัน (กัน GutsEVO กับ Guts_Evolved กลายเป็นคนละชื่อ)
  s = s.replace(/\s*(EVO|Evolved)\s*$/i, " EVO");
  s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  s = s.replace(/\s+/g, " ").trim();
  return s || asset;
}

// ชื่อที่ควรโชว์: displayName จากเกมมาก่อน (Lua อ่าน TowerInfo), ไม่มีค่อย pretty อัตโนมัติ
export function aoDisplayName(asset?: string | null, displayName?: string | null): string {
  const d = (displayName || "").trim();
  if (d) return d;
  return prettyAOUnitName(asset);
}

// ---------------------------------------------------------------------------
// รูป (convention — ไม่ต้องมี map)
// ---------------------------------------------------------------------------

// norm สำหรับเทียบชื่อไฟล์: ตัวเล็ก + ตัวอักษร/ตัวเลขเท่านั้น
// ("GutsEVO" -> "gutsevo", "Yuta_Evolved" -> "yutaevolved", "Trait Reroll" -> "traitreroll")
export function normAOKey(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// path รูป local ที่ควรมี (ใช้ทั้ง component โหลดจริง + sync script เช็กไฟล์ขาด)
export function aoUnitImagePath(asset?: string | null): string | null {
  const n = normAOKey(asset);
  if (!n) return null;
  return `/images/anime-origin/units/${n}.png`;
}

export function aoTraitImagePath(trait?: string | null): string | null {
  const n = normAOKey(trait);
  if (!n) return null;
  return `/images/anime-origin/traits/${n}.png`;
}

// image จาก payload (Lua ส่ง asset id จาก TowerInfo) -> URL ผ่าน thumb proxy
// รับเฉพาะตัวเลข กัน forged URL กลายเป็น <img src> เปิด
export function aoThumbUrl(image?: string | null): string | null {
  const s = (image || "").trim();
  if (!s) return null;
  const m = s.match(/(\d{4,20})/);
  if (!m) return null;
  return `/api/thumb?id=${m[1]}`;
}

// ---------------------------------------------------------------------------
// rarity (payload-first + สืบทอด EVO + จำอัตโนมัติ)
// ---------------------------------------------------------------------------

// seed: ค่าที่ "เห็นจากในเกมจริง" เท่านั้น (ผ่าน TowerInfo/payload) — ห้ามเดาจากเกมอื่น
// ตอนนี้ว่างไว้ตั้งใจ: ระบบจะเติมเองจาก payload + localStorage ด้านล่าง
const AO_RARITY_SEED: Record<string, string> = {
  // ตัวอย่างถ้าวันไหนยืนยันจากในเกมแล้ว: "Guts": "MYTHIC",
};

// asset base สำหรับสืบทอด rarity ("GutsEVO"/"Yuta_Evolved" -> base "Guts"/"Yuta")
export function aoBaseAsset(asset?: string | null): string | null {
  if (!asset) return null;
  const b = asset.replace(/(_?EVO|_?Evolved)$/i, "");
  return b && b !== asset ? b : null;
}

// ร่าง EVO ที่ชื่อไม่ลงท้ายด้วย EVO (ชื่อเฉพาะในเกม — ชุดเดียวกับฝั่ง AE)
const AO_EVO_ALIASES = new Set([
  "griffithfemto", "griffithsilver",
]);

// ใช่ร่าง EVO ไหม — ใช้จัดบล็อก EVO อยู่บนเสมอใน Vault
export function aoIsEvo(asset?: string | null): boolean {
  if (!asset) return false;
  if (/(_?EVO|_?Evolved)$/i.test(asset)) return true;
  return AO_EVO_ALIASES.has(normAOKey(asset));
}

const AO_RARITY_LS_KEY = "ao:unit-rarity:v1";
const learnedRarity = new Map<string, string>();
let hydrated = false;

function hydrateLearned(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(AO_RARITY_LS_KEY);
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
export function observeAORarity(asset?: string | null, rarity?: string | null): void {
  if (!asset || !rarity) return;
  hydrateLearned();
  const r = rarity.trim().toUpperCase();
  if (!r) return;
  if (learnedRarity.get(asset) !== r) learnedRarity.set(asset, r);
}

// เขียนค่าที่จำไว้ลง localStorage (เรียกใน useEffect ฝั่ง component)
export function persistAORarities(): void {
  if (typeof window === "undefined" || learnedRarity.size === 0) return;
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of learnedRarity) obj[k] = v;
    window.localStorage.setItem(AO_RARITY_LS_KEY, JSON.stringify(obj));
  } catch {}
}

// ลำดับ: payload > seed > สืบทอดจาก base (EVO) > ค่าที่เคยจำไว้ > undefined
export function resolveAOUnitRarity(asset?: string | null, payloadRarity?: string | null): string | undefined {
  const p = (payloadRarity || "").trim();
  if (p) {
    observeAORarity(asset, p);
    return p.toUpperCase();
  }
  if (!asset) return undefined;
  hydrateLearned();
  if (AO_RARITY_SEED[asset]) return AO_RARITY_SEED[asset];
  const base = aoBaseAsset(asset);
  if (base) {
    const bLearned = learnedRarity.get(base);
    if (bLearned) return bLearned;
    if (AO_RARITY_SEED[base]) return AO_RARITY_SEED[base];
  }
  return learnedRarity.get(asset);
}

// ---------------------------------------------------------------------------
// trait (tier อัตโนมัติ — trait ใหม่ไม่ต้องเพิ่มเองก็ยังมีสี + เรียงถูกกลุ่ม)
// ---------------------------------------------------------------------------

// tier อิง trait list ในเกม (Immortal = บนสุด one-per-team, Overseer มี pity, Ace คู่ Secret;
// Unbound/Primordial/Forsaken/Draconic = กลุ่ม mythic แบบเดียวกับ AE)
const AO_TRAIT_MYTHIC = new Set([
  "immortal", "unbound", "primordial", "forsaken", "draconic",
]);

const AO_TRAIT_LEGENDARY = new Set([
  "overseer", "ace", "investor", "optics", "bolt",
  "precision2", "precision1", "precision", "limitbreaker",
]);

export type AOTraitTier = "mythic" | "legendary" | "rare" | null;

export function aoTraitTier(trait?: string | null): AOTraitTier {
  if (!trait) return null;
  const n = normAOKey(trait);
  if (!n) return null;
  if (AO_TRAIT_MYTHIC.has(n)) return "mythic";
  if (AO_TRAIT_LEGENDARY.has(n)) return "legendary";
  // trait มีชื่อจริงแต่ไม่รู้จัก = กลุ่ม rare (สีฟ้า) — ยังแยกจาก "ไม่มี trait" (null) ชัดเจน
  return "rare";
}

// ลำดับสำหรับ sort "Trait": mythic ก่อน legendary ก่อน rare; ไม่รู้จักอยู่ท้าย; ไม่มี trait ล่างสุด
const AO_TRAIT_ORDER = [
  "immortal", "unbound", "primordial", "forsaken", "draconic",
  "overseer", "ace", "investor", "optics", "bolt",
  "precision2", "precision1", "precision", "limitbreaker",
];
const AO_TRAIT_RANK = new Map(AO_TRAIT_ORDER.map((t, i) => [t, i]));

export function aoTraitRank(trait?: string | null): number {
  if (!trait) return 98;
  const n = normAOKey(trait);
  if (!n) return 98;
  return AO_TRAIT_RANK.get(n) ?? 97;
}

export function aoTraitTextClass(trait?: string | null): string {
  switch (aoTraitTier(trait)) {
    case "mythic":
      return "";
    case "legendary":
      return "text-[#FFB800]";
    case "rare":
      return "text-[#2E9DFF]";
    default:
      return "text-zinc-300";
  }
}

// Mythic = ตัวหนังสือ rainbow แบบ wiki (inline style กัน class โดน purge)
export function aoTraitTextStyle(trait?: string | null): CSSProperties | undefined {
  if (aoTraitTier(trait) !== "mythic") return undefined;
  return {
    backgroundImage: "linear-gradient(90deg,#f87171,#fb923c,#facc15,#4ade80,#38bdf8,#f472b6)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
}

export function aoTraitPillClass(trait?: string | null): string {
  switch (aoTraitTier(trait)) {
    case "mythic":
      return "bg-rose-500/10 border-rose-500/20";
    case "legendary":
      return "bg-amber-500/10 border-amber-500/20";
    case "rare":
      return "bg-sky-500/10 border-sky-500/20";
    default:
      return "bg-fuchsia-500/10 border-fuchsia-500/20";
  }
}
