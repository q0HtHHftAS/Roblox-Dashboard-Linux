// ระบบสีตาม rarity แบบ Ducky (โครง) + theme เรา
// ETERNAL/SECRET/COSMIC อยู่อันดับบน — ตรงกับลำดับใน wiki (Module:Pets/Data)
export interface RarityStyle {
  rank: number;
  border: string;
  badge: string;
  text: string;
}

const FALLBACK: RarityStyle = {
  rank: 0,
  border: "border-line",
  badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
  text: "text-zinc-300",
};

export const RARITY_STYLES: Record<string, RarityStyle> = {
  TITAN: {
    rank: 110,
    border: "border-red-500/60",
    badge: "bg-red-500/90 text-white border-red-400",
    text: "text-red-400",
  },
  DIVINE: {
    rank: 106,
    border: "border-yellow-300/60",
    badge: "bg-yellow-300/90 text-yellow-950 border-yellow-200",
    text: "text-yellow-300",
  },
  SUPERIOR: {
    rank: 105,
    border: "border-cyan-100/50",
    badge: "bg-cyan-100/90 text-cyan-950 border-white",
    text: "text-cyan-100",
  },
  ETERNAL: {
    rank: 100,
    border: "border-pink-500/50",
    badge: "bg-pink-500/90 text-pink-950 border-pink-400",
    text: "text-pink-400",
  },
  LIMITED: {
    rank: 99,
    border: "border-purple-500/50",
    badge: "bg-purple-500/90 text-white border-purple-400",
    text: "text-purple-300",
  },
  GODLY: {
    rank: 95,
    border: "border-white/60",
    badge: "bg-white/90 text-zinc-950 border-white",
    text: "text-white",
  },
  EXOTIC: {
    rank: 85,
    border: "border-fuchsia-500/50",
    badge: "bg-fuchsia-500/90 text-white border-fuchsia-400",
    text: "text-fuchsia-400",
  },
  SECRET: {
    rank: 90,
    border: "border-zinc-500/40",
    badge: "bg-zinc-700/90 text-zinc-100 border-zinc-600",
    text: "text-zinc-300",
  },
  ORIGIN: {
    rank: 92,
    border: "border-teal-400/50",
    badge: "bg-teal-500/90 text-white border-teal-400",
    text: "text-teal-300",
  },
  COSMIC: {
    rank: 80,
    border: "border-violet-500/50",
    badge: "bg-violet-500/90 text-white border-violet-400",
    text: "text-violet-400",
  },
  MYTHIC: {
    rank: 70,
    border: "border-rose-500/50",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    text: "text-rose-300",
  },
  EXCLUSIVE: {
    rank: 65,
    border: "border-cyan-500/50",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    text: "text-cyan-300",
  },
  LEGENDARY: {
    rank: 60,
    border: "border-amber-500/50",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    text: "text-amber-300",
  },
  EPIC: {
    rank: 50,
    border: "border-indigo-500/50",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    text: "text-indigo-300",
  },
  RARE: {
    rank: 40,
    border: "border-sky-500/50",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    text: "text-sky-300",
  },
  UNCOMMON: {
    rank: 30,
    border: "border-emerald-500/50",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    text: "text-emerald-300",
  },
  COMMON: {
    rank: 20,
    border: "border-zinc-700/60",
    badge: "bg-zinc-700/20 text-zinc-400 border-zinc-700/40",
    text: "text-zinc-400",
  },
  BRAINROTGOD: {
    rank: 71,
    border: "border-purple-600/60",
    badge: "bg-purple-700/90 text-white border-purple-500",
    text: "text-purple-400",
  },
  RAINBOW: {
    rank: 70,
    border: "border-pink-500/50",
    badge: "bg-pink-500/90 text-white border-pink-400",
    text: "text-pink-400",
  },
  PRISMATIC: {
    rank: 70,
    border: "border-pink-500/50",
    badge: "bg-pink-500/90 text-white border-pink-400",
    text: "text-pink-400",
  },
  MYTHICAL: {
    rank: 70,
    border: "border-rose-500/50",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    text: "text-rose-300",
  },
  CELESTIAL: {
    rank: 32,
    border: "border-green-500/50",
    badge: "bg-green-500/90 text-green-950 border-green-400",
    text: "text-green-400",
  },
  SUPERRARE: {
    rank: 31,
    border: "border-cyan-400/50",
    badge: "bg-cyan-400/90 text-cyan-950 border-cyan-300",
    text: "text-cyan-300",
  },
  BASIC: {
    rank: 20,
    border: "border-zinc-700/60",
    badge: "bg-zinc-700/20 text-zinc-400 border-zinc-700/40",
    text: "text-zinc-400",
  },
  ADMIN: {
    rank: 65,
    border: "border-violet-500/50",
    badge: "bg-violet-500/90 text-white border-violet-400",
    text: "text-violet-400",
  },
};

export function rarityStyle(rarity?: string | null): RarityStyle {
  if (!rarity) return FALLBACK;
  return RARITY_STYLES[rarity.toUpperCase()] ?? FALLBACK;
}

export function rarityRank(rarity?: string | null): number {
  return rarityStyle(rarity).rank;
}
