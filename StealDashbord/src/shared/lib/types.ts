export type PetData = {
  uuid: string;
  name: string; // Category name e.g. Mantaris
  category: string;
  ratePerSecond: number;
  scale: number;
  mutations: string[];
  colorIndex?: number;
  rarity?: string; // COSMIC, MYTHIC, LEGENDARY etc
  rarityNumber?: number;
  weight?: number; // scale*10000
  isEquipped?: boolean;
  isEgg?: boolean;
  remaining?: number; // seconds till hatch (from EggRecords.GrowthSecondsRemaining) - for eggs
  icon?: string; // rbxassetid://...
};

export type AEUnitData = {
  uuid: string;
  asset: string; // e.g. SaboEVO, Goku
  displayName?: string; // ชื่อโชว์จากเกม (Lua อ่าน TowerInfo.DisplayName) — ไม่มีก็ pretty อัตโนมัติ
  image?: string; // รูปจากเกม (Lua อ่าน TowerInfo: asset id ตัวเลข/rbxassetid) — ใช้ผ่าน /api/thumb
  level: number;
  exp: number;
  trait?: string;
  ascension?: number;
  locked?: boolean;
  shiny?: boolean; // Anime Origins: Shiny variant
  worthiness?: number;
  takedowns?: number;
  rarity?: string; // Rarity จริงจากเกม (Lua อ่าน Information.Assets) — payload-first, fallback คือ aeUnitRarityMap
};

export type AESkinData = {
  uuid: string;
  asset: string; // e.g. SummerHimmelSkin, SenkuVillain
  obtainedAt?: number;
};

export type PlayerData = {
  username: string;
  displayName?: string;
  userId?: number;
  pcName: string; // Q2: PC identifier from Get Script modal
  gameId?: string; // Faz2: game identifier from Lua bridge (default "stealanegg" for legacy payloads)
  money: number;
  moneyPerSec: number;
  speedPower: number;
  walkSpeed: number;
  baseLevel: number;
  treadmillLevel?: number;
  capacity: number; // current equipped count
  maxCapacity: number; // max for level
  nextCost?: number | null;
  petsInBase: number;
  pets: PetData[]; // sorted descending by ratePerSecond, only EquippedAssets (for table) — stealanegg
  // Anime Expeditions (gameId "animeexpeditions"): currencies + units.
  // money = Gold (reuse top-level for sorting), gems = Gem item amount.
  gems?: number;
  aeLevel?: number;
  aeExp?: number;
  // Anime Origins (gameId "animeorigin"): no player Level in game — Exp only.
  // money = Gold, gems = Gems, units = Towers (asset=Name, level=Stars), same shape as AE.
  aoExp?: number;
  unitsTotal?: number;
  units?: AEUnitData[]; // top units by level (cap 300, payload guard)
  equippedUnits?: string[]; // HotbarData slot order: short uuids (หลัง #) ตรงกับ AEUnitData.uuid
  skinsTotal?: number;
  skins?: AESkinData[]; // SkinData inventory (cap 300, payload guard)
  currencies?: Record<string, number>; // extra ItemData amounts (EventCoin, ExpeditionCoin, ...)
  inventory?: PetData[]; // full Inventory (all pets, for aggregation) - v3
  eggsInBag: number;
  eggsPerSec: number;
  eggsTotal?: number;
  eggsList?: PetData[]; // full EggInventory as PetData (isEgg=true)
  isLocal: boolean;
  plotId?: string | null;
  lastUpdated: number; // timestamp
  lastSeen?: number; // server lastSeen for STATUS
  firstSeen?: number; // first time seen for uptime
};

export type IngestPayload = {
  players: PlayerData[];
  timestamp: number;
};

export type BotStatus = "online" | "idle" | "offline";

export type GameStats = {
  gameId: string;
  myAccounts: number;
  totalAccounts: number;
  onlineCount: number;
};

// Faz2-ready: นับสถิติแยกตามเกมจาก live players.
// Legacy payload ที่ไม่มี gameId จะนับเป็น "stealanegg" ทั้งหมด.
export function getStatsByGame(
  players: PlayerData[],
  gameId: string,
  serverTime: number = Date.now(),
  globalTotalForGame?: number
): GameStats {
  const mine = players.filter((p) => (p.gameId ?? "stealanegg") === gameId);
  let online = 0;
  for (const p of mine) {
    const lastSeen = Number(p.lastSeen ?? p.lastUpdated ?? 0);
    if (serverTime - lastSeen < 45_000) online++;
  }
  return {
    gameId,
    myAccounts: mine.length,
    totalAccounts: globalTotalForGame ?? mine.length,
    onlineCount: online,
  };
}

export type SharedDashboardData = {
  players: PlayerData[];
  lastIngest: number;
  serverTime: number;
  maskUsernames: boolean;
  ownerName: string;
};

