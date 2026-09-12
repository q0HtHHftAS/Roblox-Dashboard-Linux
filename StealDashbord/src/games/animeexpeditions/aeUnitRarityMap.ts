// Rarity ของ unit ใน Anime Expeditions — FALLBACK (ใช้เมื่อ payload ไม่มี rarity):
// Lua ส่ง rarity จาก Information.Assets มาก่อนเสมอ (payload-first ใน aeUnitMeta.ts);
// map นี้คือ seed สำหรับ payload เก่า/registry อ่านไม่ขึ้น — ดู resolveAEUnitRarity
// ลำดับตามที่ตกลง: Secret > Mythic > Exclusive > Legendary > Epic > Rare
// (rank ตัวเลขอยู่ใน `@/shared/lib/rarity` — EXCLUSIVE = 65 อยู่ระหว่าง MYTHIC กับ LEGENDARY)
// ร่าง EVO นับ rarity เดียวกับร่าง base; asset ที่ไม่มีใน map คืน undefined
// (ไปอยู่ล่างสุดตอน sort แต่ไม่หาย)

const SECRET = new Set([
  "Enel", "EnelEVO", // Lightning God
  "Sinbad", "SinbadEVO", // Sovereign
  "Gohan", "GohanEVO", // Prodigy
  "Itachi", "ItachiEVO", // Crow
  "Megumi", "MegumiEVO", // Shadow
  "Kenpachi", "KenpachiEVO", // 8th Sword
  // Update 2.5 (Berserk): สาย Falcon เป็น Secret ทั้งสาย (Broken Falcon / Silver Falcon /
  // 5th God Hand) — asset ในเกมชื่อ Griffith ตรงๆ (เช็ก Index ในเกมแล้วมีแค่ชื่อนี้)
  "Griffith", // Falcon
  // Update 2.5 (Absolute Dream, 7 ก.ย. 2026) — verify จาก wiki ทางการแล้ว
  // (https://wiki.animeexpeditions.com: 5th God Hand / Silver Falcon / Iron Wolf (+Struggler) = Secret;
  // Eclipse Hunter (+Savior) = Mythic)
  "GriffithFemto", "GriffithSilver", // Falcon (EVO — Secret ทั้งคู่)
  "Guts", "GutsEVO", // Iron Wolf (+Struggler)
]);

const MYTHIC = new Set([
  "Yamamoto", "YamamotoEVO", // Head Captain
  "Weather", "WeatherEVO", // Rainman
  "Crocodile", "CrocodileEVO", // Sand
  "Harribel", "HarribelEVO", // Sharkfang
  "WaterMagician", "WaterMagicianEVO", // Water Mage
  "Cell", "CellEVO", // Bioinsect
  "GokuSS1", "GokuSS1EVO", // Carrot
  "Trunks", "TrunksEVO", // The Drink
  "Vegeta", "VegetaEVO", // Vegetable
  "Zeref", "ZerefEVO", // Cursed Immortal
  "Yuta", "YutaEVO", // Cursed Student
  "Judar", "JudarEVO", // Dark Mage
  "Grimmjow", "GrimmjowEVO", // Razorjaw
  "Frieren", "FrierenEVO", // Elf Mage
  "Sabo", "SaboEVO", // Flame Emperor
  "Gabimaru", "GabimaruEVO", // Hollow
  "Diane", "DianeEVO", // Lady Giant
  "Gowther", "GowtherEVO", // Puppet
  "Inumaki", "InumakiEVO", // Salmon Sorcerer
  "IchigoEVO", // Reaper (Released)
  "Doflamingo", "DoflamingoEVO", // String Demon
  // Update 2.5 (Absolute Dream) — Eclipse Hunter (+Savior) = Mythic (verify จาก wiki แล้ว)
  "SkullKnight", "SkullKnightEVO", // Eclipse Hunter
]);

const EXCLUSIVE = new Set([
  "Kite", // Jester
  "Sparkle", // Kitsune
  "Khun", // Cubert
  "Choso", "ChosoEVO", // Crimson
  "Sugar", // Toy Maker
  "Hinata", "HinataEVO", // True Saint
]);

const LEGENDARY = new Set([
  "Utahime", // Forbidden Teacher
  "Ban", // Greed
  "Rukia", // Ice Queen
  "Ichiraku", // Ramen Guy
  "Riyo", // Scissor
  "Ichigo", // Reaper
  "HimmelTheHero", // The Hero
  "Noelle", // Water Princess
]);

const EPIC = new Set([
  "Zoro", // Bounty Hunter
  "Levi", // Corps Captain
  "Genos", // Demon Cyborg
  "Gray", // Ice Mage
  "Gon", // Nen Hunter
  "Senku", // Stone Alchemist
]);

const RARE = new Set([
  "Sanji", // Curly Brow
  "Killua", // Kid Assassin
  "Uryu", // Reishi Archer
  "Luffy", // Rubber Boy
  "Goku", // Little Carrot
  "Sasuke", // Thunder Shinobi
]);

export function aeUnitRarity(asset?: string | null): string | undefined {
  if (!asset) return undefined;
  if (SECRET.has(asset)) return "SECRET";
  if (MYTHIC.has(asset)) return "MYTHIC";
  if (EXCLUSIVE.has(asset)) return "EXCLUSIVE";
  if (LEGENDARY.has(asset)) return "LEGENDARY";
  if (EPIC.has(asset)) return "EPIC";
  if (RARE.has(asset)) return "RARE";
  return undefined;
}
