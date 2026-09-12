import type { PlayerData } from "@/shared/lib/types";

export interface AOCurrencyEntry {
  id: string; // "gold" | "gems" | "cur:<Inventory.Currency key>"
  label: string; // "GOLD" | "GEMS" | "TRAIT REROLL" | ...
  total: number; // รวมทุก account
  img: string | null; // รูปใน /images/anime-origin/icons/ หรือ null = ใช้ fallback icon
  valueClass: string;
  iconClass: string;
}

export const AO_OVERVIEW_CARDS_KEY = "ao:overview:cards:v1";
export const AO_DEFAULT_CARDS = ["gold", "gems", "cur:TraitReroll"];

// "TraitReroll" -> "TRAIT REROLL", "PerfectStatPrism" -> "PERFECT STAT PRISM"
export function prettyCurrencyLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toUpperCase();
}

const IMG_BY_KEY: Record<string, string> = {
  gold: "/images/anime-origin/icons/gold.png",
  gems: "/images/anime-origin/icons/gems.png",
  traitreroll: "/images/anime-origin/icons/traitreroll.png",
  // รูปจริงจาก ReplicatedStorage.Modules.ItemInfo.Currency ในเกม (rbxassetid -> PNG)
  battlepassexp: "/images/anime-origin/icons/battlepassexp.png",
  cursedtickets: "/images/anime-origin/icons/cursedtickets.png",
  exp: "/images/anime-origin/icons/exp.png",
  fusionchip: "/images/anime-origin/icons/fusionchip.png",
  igristoken: "/images/anime-origin/icons/igristoken.png",
  lanternstoken: "/images/anime-origin/icons/lanternstoken.png",
  perfectstatprism: "/images/anime-origin/icons/perfectstatprism.png",
  rezerotoken: "/images/anime-origin/icons/rezerotoken.png",
  spiritpetals: "/images/anime-origin/icons/spiritpetals.png",
  statprism: "/images/anime-origin/icons/statprism.png",
  trophy: "/images/anime-origin/icons/trophy.png",
  umbralsplinters: "/images/anime-origin/icons/umbralsplinters.png",
  worldbosskey: "/images/anime-origin/icons/worldbosskey.png",
};

// normalize สำหรับเทียบ key แบบยืดหยุ่น ("TraitReroll" == "Trait Reroll" == "trait_reroll")
export function normCurrencyKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// รวมยอดทุก account: Gold/Gems จาก field หลัก, ที่เหลือ union key จาก currencies (dynamic — ของใหม่ในเกมโผล่เอง)
export function collectAOCurrencies(players: PlayerData[]): AOCurrencyEntry[] {
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
  const entries: AOCurrencyEntry[] = [
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
      label: prettyCurrencyLabel(k),
      total: v,
      img: IMG_BY_KEY[nk] ?? null,
      valueClass: isTraitReroll ? "text-fuchsia-300" : "text-zinc-100",
      iconClass: isTraitReroll ? "bg-fuchsia-500/10" : "bg-white/5",
    });
  }
  return entries;
}

// order ตั้งต้น: ใช้ key จริงในข้อมูล (กันเคส live ส่ง "Trait Reroll" มีช่องว่าง)
// ถ้าไม่มีเลยจะ fallback เป็น "TraitReroll" ซึ่ง collectAOCurrencies guarantee ไว้แล้วว่าโผล่แน่ (ยอด 0)
export function defaultCardOrder(rawKeys: string[]): string[] {
  const trait = rawKeys.find((k) => normCurrencyKey(k) === "traitreroll") ?? "TraitReroll";
  return ["gold", "gems", `cur:${trait}`];
}
