import type { PlayerData } from "@/shared/lib/types";

export interface AECurrencyEntry {
  id: string; // "gold" | "gems" | "cur:<ItemData key>"
  label: string; // "GOLD" | "GEMS" | "TRAIT REROLL" | ...
  total: number; // รวมทุก account
  img: string | null; // รูปใน /images/anime-expeditions/icons/ หรือ null = ใช้ fallback icon
  valueClass: string;
  iconClass: string;
}

export const AE_OVERVIEW_CARDS_KEY = "ae:overview:cards:v1";
export const AE_DEFAULT_CARDS = ["gold", "gems", "cur:TraitReroll"];

// "TraitReroll" -> "TRAIT REROLL", "EventCoin" -> "EVENT COIN"
export function prettyCurrencyLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toUpperCase();
}

const IMG_BY_KEY: Record<string, string> = {
  gold: "/images/anime-expeditions/icons/gold.png",
  gems: "/images/anime-expeditions/icons/gem.png",
  traitreroll: "/images/anime-expeditions/icons/trait_reroll.png",
  // [2026-09-08] icon จริงจาก Information.Assets ในเกม
  crown: "/images/anime-expeditions/icons/crown.png",
  equipmentlock: "/images/anime-expeditions/icons/equipmentlock.png",
  equipmentreroll: "/images/anime-expeditions/icons/equipmentreroll.png",
  eventcoin: "/images/anime-expeditions/icons/eventcoin.png",
  expeditioncoin: "/images/anime-expeditions/icons/expeditioncoin.png",
  luckpotion: "/images/anime-expeditions/icons/luckpotion.png",
  raidtoken: "/images/anime-expeditions/icons/raidtoken.png",
  spiritcitytoken: "/images/anime-expeditions/icons/spiritcitytoken.png",
  statlock: "/images/anime-expeditions/icons/statlock.png",
  statreroll: "/images/anime-expeditions/icons/statreroll.png",
  summercurrency: "/images/anime-expeditions/icons/summercurrency.png",
  hillofswordstoken: "/images/anime-expeditions/icons/hillofswordstoken.png",
  expeditionfuel: "/images/anime-expeditions/icons/expeditionfuel.png",
};

// ชื่อแสดงผลตาม DisplayName ในเกม (ตรงกับที่เกมโชว์ เช่น "Sand Dollar" ไม่ใช่ "Summer Currency")
const LABEL_BY_KEY: Record<string, string> = {
  traitreroll: "TRAIT CRYSTAL",
  spiritcitytoken: "SPIRIT TOKEN",
  summercurrency: "SAND DOLLAR",
  hillofswordstoken: "COIN POUCH", // DisplayName ในเกม (key จริงคือ HillOfSwordsToken)
  expeditionfuel: "FUEL CELL", // DisplayName ในเกม (key จริงคือ ExpeditionFuel)
};

// normalize สำหรับเทียบ key แบบยืดหยุ่น ("TraitReroll" == "Trait Reroll" == "trait_reroll")
export function normCurrencyKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// รวมยอดทุก account: Gold/Gems จาก field หลัก, ที่เหลือ union key จาก currencies (dynamic — ของใหม่ในเกมโผล่เอง)
export function collectAECurrencies(players: PlayerData[]): AECurrencyEntry[] {
  let gold = 0;
  let gems = 0;
  const map = new Map<string, number>();
  for (const p of players) {
    gold += Number(p.money ?? 0) || 0;
    gems += Number(p.gems ?? 0) || 0;
    const cur = p.currencies || {};
    for (const k of Object.keys(cur)) {
      map.set(k, (map.get(k) ?? 0) + (Number(cur[k]) || 0));
    }
  }
  const entries: AECurrencyEntry[] = [
    { id: "gold", label: "GOLD", total: gold, img: IMG_BY_KEY.gold, valueClass: "text-amber-300", iconClass: "bg-amber-500/10" },
    { id: "gems", label: "GEMS", total: gems, img: IMG_BY_KEY.gems, valueClass: "text-sky-300", iconClass: "bg-sky-500/10" },
  ];
  // การ์ด default (TraitReroll) ต้องมีเสมอแม้ live data ยังไม่มี key — กันบั๊กการ์ดหายแล้วเพิ่มกลับไม่ได้
  let hasTraitReroll = false;
  for (const k of map.keys()) {
    if (normCurrencyKey(k) === "traitreroll") {
      hasTraitReroll = true;
      break;
    }
  }
  if (!hasTraitReroll) map.set("TraitReroll", 0);
  for (const [k, v] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const nk = normCurrencyKey(k);
    const isTraitReroll = nk === "traitreroll";
    entries.push({
      id: `cur:${k}`,
      label: LABEL_BY_KEY[nk] ?? prettyCurrencyLabel(k),
      total: v,
      img: IMG_BY_KEY[nk] ?? null,
      valueClass: isTraitReroll ? "text-fuchsia-300" : "text-zinc-100",
      iconClass: isTraitReroll ? "bg-fuchsia-500/10" : "bg-white/5",
    });
  }
  return entries;
}

// order ตั้งต้น: ใช้ key จริงในข้อมูล (กันเคส live ส่ง "Trait Reroll" มีช่องว่าง)
// ถ้าไม่มีเลยจะ fallback เป็น "TraitReroll" ซึ่ง collectAECurrencies guarantee ไว้แล้วว่าโผล่แน่ (ยอด 0)
export function defaultCardOrder(rawKeys: string[]): string[] {
  const trait = rawKeys.find((k) => normCurrencyKey(k) === "traitreroll") ?? "TraitReroll";
  return ["gold", "gems", `cur:${trait}`];
}
