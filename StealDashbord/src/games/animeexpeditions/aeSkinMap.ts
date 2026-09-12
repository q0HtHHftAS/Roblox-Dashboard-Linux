// Skins ของ Anime Expeditions — static data จาก wiki (CC BY-SA 4.0,
// https://wiki.animeexpeditions.com/Skin + หน้ารายตัว): rarity + รูป local
// (`public/ae-skins/`) ต่อ skin
// จับคู่ asset ในเกม (เช่น SummerHimmelSkin, IchigoCyborgSkin) ด้วย token:
// ต้องมี variant (summer/manga/...) + ชื่อ unit (himmel/ichigo/...) อยู่ในชื่อ
// asset ที่จับคู่ไม่ได้ (เช่น Villain ชุดใหม่ที่ wiki ยังไม่มี) คืน undefined —
// ไปอยู่ล่างสุดตอน sort + โชว์ตัวอักษรแทนรูป แต่ไม่หาย

interface SkinEntry {
  title: string;
  unit: string[]; // alias ชื่อ unit asset (lowercase), [] = ใส่ได้ทุกตัว (global)
  variant: string; // token ธีม (lowercase ไม่มีช่องว่าง)
  rarity: string;
  image: string | null; // null = มีข้อมูลแต่ยังไม่มีรูป (ใช้ fallback ตัวอักษร)
}

const SKIN_TABLE: SkinEntry[] = [
  { title: "Carrot (Summer)", unit: ["gokuss1", "goku"], variant: "summer", rarity: "EXCLUSIVE", image: "/ae-skins/carrot-summer.png" },
  { title: "Rainman (Galaxy)", unit: ["weather"], variant: "galaxy", rarity: "EXCLUSIVE", image: "/ae-skins/rainman-galaxy.png" },
  { title: "Sand (Summer)", unit: ["crocodile"], variant: "summer", rarity: "EXCLUSIVE", image: "/ae-skins/sand-summer.png" },
  { title: "Sharkfang (Summer)", unit: ["harribel"], variant: "summer", rarity: "EXCLUSIVE", image: "/ae-skins/sharkfang-summer.png" },
  { title: "Sovereign (Summer)", unit: ["sinbad"], variant: "summer", rarity: "EXCLUSIVE", image: "/ae-skins/sovereign-summer.png" },
  { title: "The Hero (Summer)", unit: ["himmelthehero", "himmel"], variant: "summer", rarity: "EXCLUSIVE", image: "/ae-skins/the-hero-summer.png" },
  { title: "Prodigy (Manga)", unit: ["gohan"], variant: "manga", rarity: "EXCLUSIVE", image: "/ae-skins/prodigy-manga.png" },
  { title: "Bioinsect (Mecha)", unit: ["cell"], variant: "mecha", rarity: "EXCLUSIVE", image: "/ae-skins/bioinsect-mecha.png" },
  { title: "Ballin' Bioinsect", unit: ["cell"], variant: "ballin", rarity: "EXCLUSIVE", image: "/ae-skins/ballin-bioinsect.png" },
  { title: "Ballin' Carrot", unit: ["gokuss1", "goku"], variant: "ballin", rarity: "EXCLUSIVE", image: "/ae-skins/ballin-carrot.png" },
  { title: "Ballin' Vegetable", unit: ["vegeta"], variant: "ballin", rarity: "EXCLUSIVE", image: "/ae-skins/ballin-vegetable.png" },
  { title: "Ballin' Drink", unit: ["trunks"], variant: "ballin", rarity: "EXCLUSIVE", image: "/ae-skins/ballin-drink.png" },
  { title: "Ballin' Prodigy", unit: ["gohan"], variant: "ballin", rarity: "EXCLUSIVE", image: "/ae-skins/ballin-prodigy.png" },
  { title: "The Strongest", unit: [], variant: "strongest", rarity: "EXCLUSIVE", image: "/ae-skins/the-strongest.png" },
  { title: "8th Sword (Aztec)", unit: ["kenpachi"], variant: "aztec", rarity: "EXCLUSIVE", image: "/ae-skins/8th-sword-aztec.png" },
  { title: "Crow (Rider)", unit: ["itachi"], variant: "rider", rarity: "EXCLUSIVE", image: "/ae-skins/crow-rider.png" },
  { title: "Razorjaw (Beyond)", unit: ["grimmjow"], variant: "beyond", rarity: "EXCLUSIVE", image: "/ae-skins/razorjaw-beyond.png" },
  { title: "8th Sword (Thug)", unit: ["kenpachi"], variant: "thug", rarity: "EXCLUSIVE", image: "/ae-skins/8th-sword-thug.png" },
  { title: "Cursed Student (Manga)", unit: ["yuta"], variant: "manga", rarity: "EXCLUSIVE", image: "/ae-skins/cursed-student-manga.png" },
  { title: "Elf Mage (Maid)", unit: ["frieren"], variant: "maid", rarity: "EXCLUSIVE", image: "/ae-skins/elf-mage-maid.png" },
  { title: "Elf Mage (Lunar)", unit: ["frieren"], variant: "lunar", rarity: "EXCLUSIVE", image: "/ae-skins/elf-mage-lunar.png" },
  { title: "Hazmat Skin", unit: [], variant: "hazmat", rarity: "EXCLUSIVE", image: "/ae-skins/hazmat-skin.png" },
  { title: "Player Skin", unit: [], variant: "player", rarity: "EXCLUSIVE", image: "/ae-skins/player-skin.png" },
  { title: "Ramen Guy (Sage)", unit: ["ichiraku"], variant: "sage", rarity: "EXCLUSIVE", image: "/ae-skins/ramen-guy-sage.png" },
  { title: "Salmon Sorcerer (Frog)", unit: ["inumaki"], variant: "frog", rarity: "EXCLUSIVE", image: "/ae-skins/salmon-sorcerer-frog.png" },
  { title: "Miner", unit: [], variant: "miner", rarity: "MYTHIC", image: "/ae-skins/miner.png" },
  { title: "Reaper (Cyborg)", unit: ["ichigo"], variant: "cyborg", rarity: "LEGENDARY", image: "/ae-skins/reaper-cyborg.png" },
  { title: "Puppet (Biker)", unit: ["gowther"], variant: "biker", rarity: "LEGENDARY", image: "/ae-skins/puppet-biker.png" },
  { title: "Hollow (Hellblade)", unit: ["gabimaru"], variant: "hellblade", rarity: "LEGENDARY", image: "/ae-skins/hollow-hellblade.png" },
  { title: "String Demon (Badboy)", unit: ["doflamingo"], variant: "badboy", rarity: "LEGENDARY", image: "/ae-skins/string-demon-badboy.png" },
  { title: "Forbidden Teacher (Curse Queen)", unit: ["utahime"], variant: "cursequeen", rarity: "EPIC", image: "/ae-skins/forbidden-teacher-curse-queen.png" },
  { title: "Stone Alchemist (Boss)", unit: ["senku"], variant: "boss", rarity: "RARE", image: "/ae-skins/stone-alchemist-boss.png" },
  // Villain set: ชื่อ asset ลงท้าย Villain (จับด้วย variant + unit alias) — รูปเดียวกับ wiki title เดิม
  { title: "Crow (Rider)", unit: ["itachi"], variant: "villain", rarity: "EXCLUSIVE", image: "/ae-skins/crow-rider.png" },
  { title: "String Demon (Badboy)", unit: ["doflamingo"], variant: "villain", rarity: "LEGENDARY", image: "/ae-skins/string-demon-badboy.png" },
  { title: "Hollow (Hellblade)", unit: ["gabimaru"], variant: "villain", rarity: "LEGENDARY", image: "/ae-skins/hollow-hellblade.png" },
  { title: "Puppet (Biker)", unit: ["gowther"], variant: "villain", rarity: "LEGENDARY", image: "/ae-skins/puppet-biker.png" },
  { title: "Stone Alchemist (Boss)", unit: ["senku"], variant: "villain", rarity: "RARE", image: "/ae-skins/stone-alchemist-boss.png" },
  { title: "Forbidden Teacher (Curse Queen)", unit: ["utahime"], variant: "villain", rarity: "EPIC", image: "/ae-skins/forbidden-teacher-curse-queen.png" },
  { title: "Razorjaw (Beyond)", unit: ["grimmjow"], variant: "villain", rarity: "EXCLUSIVE", image: "/ae-skins/razorjaw-beyond.png" },
  // ไม่มีรูปบน wiki (ใช้ fallback ตัวอักษรไปก่อน — rarity/title ถูก)
  { title: "Futuristic Turret", unit: ["futuristicpayloadturret"], variant: "futuristic", rarity: "EXCLUSIVE", image: null },
];

function normAsset(asset: string): string {
  return asset.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/skin$/, "");
}

export interface AESkinInfo {
  title: string;
  rarity: string;
  image: string | null;
}

export function aeSkinInfo(asset?: string | null): AESkinInfo | undefined {
  if (!asset) return undefined;
  const n = normAsset(asset);
  if (!n) return undefined;
  let best: SkinEntry | undefined;
  let bestScore = -1;
  for (const e of SKIN_TABLE) {
    if (!n.includes(e.variant)) continue;
    if (e.unit.length === 0) {
      // global skin (ใส่ได้ทุกตัว) — คะแนนต่ำสุด ชนะเฉพาะตอนไม่มีตัวอื่นจับคู่ได้
      if (bestScore < 0) {
        best = e;
        bestScore = 0;
      }
      continue;
    }
    let longest = 0;
    for (const u of e.unit) {
      if (n.includes(u) && u.length > longest) longest = u.length;
    }
    if (!longest) continue;
    const score = longest * 100 + e.variant.length;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (!best) return undefined;
  return { title: best.title, rarity: best.rarity, image: best.image };
}

export function aeSkinRarity(asset?: string | null): string | undefined {
  return aeSkinInfo(asset)?.rarity;
}

export function aeSkinImageFor(asset?: string | null): string | null {
  return aeSkinInfo(asset)?.image || null;
}

export function aeSkinTitle(asset?: string | null): string | undefined {
  return aeSkinInfo(asset)?.title;
}
