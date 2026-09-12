// รูป trait ของ Anime Expeditions ดึงจาก wiki (CC BY-SA 4.0, https://wiki.animeexpeditions.com/Traits)
// เก็บเป็นไฟล์ local ใน `public/ae-traits/` — key = ชื่อ Trait ในเกม (u.Trait จาก Lua) -> path รูป local
// ไฟล์ PNG ถูกย้อมสีตาม tier แล้ว (mythic = เขียว→ฟ้า→ม่วง, legendary = ทอง, rare = น้ำเงิน)
// trait ที่ไม่มีใน map (ชื่อใหม่/สะกดต่าง) คืน null — component โชว์แค่ชื่อแทน
import type { CSSProperties } from "react";
export const AE_TRAIT_IMAGE_MAP: Record<string, string> = {
  "Unbound": "/ae-traits/unbound.png",
  "Primordial": "/ae-traits/primordial.png",
  "Forsaken": "/ae-traits/forsaken.png",
  "Draconic": "/ae-traits/draconic.png",
  "Investor": "/ae-traits/investor.png",
  "Optics": "/ae-traits/optics.png",
  "Bolt": "/ae-traits/bolt.png",
  "Precision 2": "/ae-traits/precision2.png",
  "Precision 1": "/ae-traits/precision1.png",
  "Limit Breaker": "/ae-traits/limitbreaker.png",
  "Range 2": "/ae-traits/range2.png",
  "Speed 2": "/ae-traits/speed2.png",
  "Strength 2": "/ae-traits/strength2.png",
  "Enlightenment": "/ae-traits/enlightenment.png",
  "Range 1": "/ae-traits/range1.png",
  "Speed 1": "/ae-traits/speed1.png",
  "Strength 1": "/ae-traits/strength1.png",
};

export function aeTraitImageFor(trait?: string | null): string | null {
  if (!trait) return null;
  return AE_TRAIT_IMAGE_MAP[trait] ?? AE_TRAIT_IMAGE_MAP[trait.trim()] ?? null;
}

// สีตาม tier ของ trait ตรงกับ wiki (Trait List): Mythic / Legendary / Rare
// (Unbound, Primordial, Forsaken, Draconic = Mythic; Investor, Optics, Bolt,
// Precision 1/2, Limit Breaker = Legendary; ที่เหลือ = Rare)
const TRAIT_TIER: Record<string, "mythic" | "legendary" | "rare"> = {
  "Unbound": "mythic",
  "Primordial": "mythic",
  "Forsaken": "mythic",
  "Draconic": "mythic",
  "Investor": "legendary",
  "Optics": "legendary",
  "Bolt": "legendary",
  "Precision 2": "legendary",
  "Precision 1": "legendary",
  "Limit Breaker": "legendary",
};

export function aeTraitTier(trait?: string | null): "mythic" | "legendary" | "rare" | null {
  if (!trait) return null;
  const t = trait.trim();
  if (!t) return null;
  if (t in AE_TRAIT_IMAGE_MAP || t in TRAIT_TIER) {
    return TRAIT_TIER[t] ?? "rare";
  }
  return null;
}

// ลำดับ trait สำหรับ sort "Trait" — เริ่ม Unbound ลงไปตาม tier wiki;
// trait ที่ไม่รู้จักอยู่ท้าย, กลุ่มที่ไม่มี trait เลยอยู่ล่างสุด
const TRAIT_ORDER = [
  "Unbound", "Primordial", "Forsaken", "Draconic",
  "Investor", "Optics", "Bolt", "Precision 2", "Precision 1", "Limit Breaker",
  "Enlightenment", "Range 2", "Speed 2", "Strength 2", "Range 1", "Speed 1", "Strength 1",
];
const TRAIT_RANK = new Map(TRAIT_ORDER.map((t, i) => [t, i]));
export function aeTraitRank(trait?: string | null): number {
  if (!trait) return 98;
  const t = trait.trim();
  if (!t) return 98;
  return TRAIT_RANK.get(t) ?? 97;
}

export function aeTraitTextClass(trait?: string | null): string {
  switch (aeTraitTier(trait)) {
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

// สไตล์ตัวอักษร Mythic — inline style ตรงๆ (กัน class โดน purge/clip เพี้ยน):
// rainbow แดง→ส้ม→เหลือง→เขียว→ฟ้า→ชมพู แบบ wiki
export function aeTraitTextStyle(trait?: string | null): CSSProperties | undefined {
  if (aeTraitTier(trait) !== "mythic") return undefined;
  return {
    backgroundImage: "linear-gradient(90deg,#f87171,#fb923c,#facc15,#4ade80,#38bdf8,#f472b6)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
}

export function aeTraitPillClass(trait?: string | null): string {
  // คืนแค่พื้น + ขอบ — สีตัวอักษรให้ต่อ aeTraitTextClass เอง (mythic จะได้ gradient)
  switch (aeTraitTier(trait)) {
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
