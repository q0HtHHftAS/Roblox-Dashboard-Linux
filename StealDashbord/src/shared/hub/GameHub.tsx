"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { GameCard, type GameItem, FAV_EVENT, favKey } from "./GameCard";
import { ComingSoonModal } from "./ComingSoonModal";

interface GameHubProps {
  stealEggAccountsCount: number;
  stealEggOnlineCount?: number;
  stealEggTotalCount?: number;
  aeAccountsCount?: number;
  aeOnlineCount?: number;
  aeTotalCount?: number;
  aoAccountsCount?: number;
  aoOnlineCount?: number;
  aoTotalCount?: number;
  onSelectGame: (gameId: string) => void;
}

export const CURATED_GAMES: GameItem[] = [
  {
    id: "stealanegg",
    name: "Steal An Egg",
    subtitle: "Real-time money/sec, live inventory, automated hatching & multi-PC tracking.",
    badge: "ACTIVE",
    icon: "fa-egg",
    image: "/images/steal-an-egg/card.png",
    available: true,
  },
  {
    id: "animeexpeditions",
    name: "Anime Expeditions",
    subtitle: "Raid expeditions, unit summon rates, world progression & team builder.",
    badge: "ACTIVE",
    icon: "fa-compass",
    image: "/images/anime-expeditions/card.png",
    available: true,
  },
  {
    id: "animeorigin",
    name: "Anime Origins",
    subtitle: "Tower collection, trait rolls, story progression & team loadouts.",
    badge: "ACTIVE",
    icon: "fa-dragon",
    image: "/images/anime-origin/card.png",
    available: true,
  },
  {
    id: "bloxfruits",
    name: "Blox Fruits",
    subtitle: "Bounty tracker, fruit inventory, raid status and mastery level farming.",
    badge: "COMING SOON",
    icon: "fa-apple-whole",
    image: "/images/blox-fruits/card.png",
    available: false,
  },
  // Faz2: เติมเกมใหม่ตรงนี้ได้เลย (id + name + image) — grid/tabs/sort รองรับ 16 ใบโดยไม่ต้องแก้โค้ดอื่น
];

type Filter = "all" | "favorites" | "running" | "coming";
type SortKey = "my" | "total" | "online";

const SORT_LABEL: Record<SortKey, string> = {
  my: "My Accounts",
  total: "Total",
  online: "Online",
};

function loadFavs(): Set<string> {
  const s = new Set<string>();
  try {
    for (const g of CURATED_GAMES) {
      if (window.localStorage.getItem(favKey(g.id)) === "1") s.add(g.id);
    }
  } catch {}
  return s;
}

export function GameHub({ stealEggAccountsCount, stealEggOnlineCount, stealEggTotalCount, aeAccountsCount = 0, aeOnlineCount = 0, aeTotalCount, aoAccountsCount = 0, aoOnlineCount = 0, aoTotalCount, onSelectGame }: GameHubProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("my");
  const [sortOpen, setSortOpen] = useState(false);
  const [previewGame, setPreviewGame] = useState<GameItem | null>(null);
  const [favs, setFavs] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    return loadFavs();
  });
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setFavs(loadFavs());
    window.addEventListener(FAV_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FAV_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [sortOpen]);

  const counts = useMemo(() => {
    return {
      all: CURATED_GAMES.length,
      favorites: CURATED_GAMES.filter((g) => favs.has(g.id)).length,
      running: CURATED_GAMES.filter((g) => g.available).length,
      coming: CURATED_GAMES.filter((g) => !g.available).length,
    };
  }, [favs]);

  const games = useMemo(() => {
    const withStats = CURATED_GAMES.map((g) => {
      if (g.id === "stealanegg") {
        return {
          ...g,
          myAccounts: stealEggAccountsCount,
          totalAccounts: stealEggTotalCount ?? stealEggAccountsCount,
          accountsCount: stealEggAccountsCount,
          onlineCount: stealEggOnlineCount ?? 0,
        };
      }
      if (g.id === "animeexpeditions") {
        return {
          ...g,
          myAccounts: aeAccountsCount,
          totalAccounts: aeTotalCount ?? aeAccountsCount,
          accountsCount: aeAccountsCount,
          onlineCount: aeOnlineCount ?? 0,
        };
      }
      if (g.id === "animeorigin") {
        return {
          ...g,
          myAccounts: aoAccountsCount,
          totalAccounts: aoTotalCount ?? aoAccountsCount,
          accountsCount: aoAccountsCount,
          onlineCount: aoOnlineCount ?? 0,
        };
      }
      return g;
    });

    const filtered = withStats.filter((g) => {
      if (filter === "favorites" && !favs.has(g.id)) return false;
      if (filter === "running" && !g.available) return false;
      if (filter === "coming" && g.available) return false;
      if (search) {
        const q = search.toLowerCase();
        return g.name.toLowerCase().includes(q) || g.subtitle.toLowerCase().includes(q);
      }
      return true;
    });

    const num = (g: GameItem) => {
      if (sort === "my") return g.available ? (g.myAccounts ?? g.accountsCount ?? 0) : -1;
      if (sort === "online") return g.available ? (g.onlineCount ?? 0) : -1;
      if (typeof g.totalAccounts === "number") return g.available ? g.totalAccounts : -1;
      return -1;
    };
    // favorites ปักหมุดขึ้นก่อนเสมอ แล้วค่อยเรียงตาม stat ที่เลือก
    return [...filtered].sort(
      (a, b) => Number(favs.has(b.id)) - Number(favs.has(a.id)) || num(b) - num(a)
    );
  }, [stealEggAccountsCount, stealEggOnlineCount, stealEggTotalCount, aeAccountsCount, aeOnlineCount, aeTotalCount, aoAccountsCount, aoOnlineCount, aoTotalCount, filter, search, sort, favs]);

  const toggleFav = (game: GameItem) => {
    setFavs((prev) => {
      const next = new Set(prev);
      const on = !next.has(game.id);
      if (on) next.add(game.id);
      else next.delete(game.id);
      try {
        if (on) window.localStorage.setItem(favKey(game.id), "1");
        else window.localStorage.removeItem(favKey(game.id));
      } catch {}
      try {
        window.dispatchEvent(new Event(FAV_EVENT));
      } catch {}
      return next;
    });
  };

  const handleCardClick = (game: GameItem) => {
    if (game.available) {
      onSelectGame(game.id);
    } else {
      setPreviewGame(game);
    }
  };

  const tabs: { key: Filter; label: string; icon: string; count: number }[] = [
    { key: "all", label: "All", icon: "fa-layer-group", count: counts.all },
    { key: "favorites", label: "Favorites", icon: "fa-star", count: counts.favorites },
    { key: "running", label: "Running", icon: "fa-tower-broadcast", count: counts.running },
    { key: "coming", label: "Coming soon", icon: "fa-clock", count: counts.coming },
  ];

  return (
    <div className="mx-auto w-full max-w-[1760px] px-4 py-6 sm:px-6">
      {/* Row 1: title + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent border border-accent/25">
            <i className="fa-solid fa-gamepad text-sm"></i>
          </span>
          <h1 className="text-lg font-extrabold tracking-tight text-white">Select Game</h1>
          <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
            {counts.all} Games
          </span>
        </div>

        <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
            className="h-9 w-full sm:w-60 rounded-lg border border-line bg-[#14181d] pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Row 2: tabs + sort */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? "border-accent bg-accent text-bg"
                    : "border-line bg-[#14181d] text-zinc-400 hover:text-white"
                }`}
              >
                <i className={`fa-solid ${t.icon} text-[10px] ${active ? "" : "text-zinc-500"}`}></i>
                {t.label}
                <span className={`text-[11px] font-extrabold ${active ? "text-bg/70" : "text-zinc-500"}`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-line bg-[#14181d] px-3 py-1.5 text-xs font-bold text-zinc-200 hover:text-white"
          >
            <i className="fa-solid fa-arrow-down-wide-short text-[11px] text-zinc-400"></i>
            {SORT_LABEL[sort]}
            <i className={`fa-solid fa-chevron-down text-[10px] text-zinc-500 transition-transform ${sortOpen ? "rotate-180" : ""}`}></i>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-[#14181d] p-1 shadow-2xl shadow-black/60 dropdown-in">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSort(k);
                    setSortOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    sort === k ? "bg-accent/15 text-accent" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {SORT_LABEL[k]}
                  {sort === k && <i className="fa-solid fa-check text-[10px]"></i>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid auto-fill (ducky-style) */}
      {games.length > 0 ? (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {games.map((g, i) => (
            <div
              key={g.id}
              className="animate-enter"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <GameCard
                game={g}
                onSelect={handleCardClick}
                isFavorite={favs.has(g.id)}
                onToggleFavorite={toggleFav}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-line bg-white/[0.01] py-16 text-center">
          <div className="text-zinc-500">
            <i className="fa-regular fa-star text-2xl"></i>
            <p className="mt-3 text-sm font-bold text-zinc-300">No favorite games yet</p>
            <p className="mt-1 text-xs text-zinc-500">Tap the star on any game to pin it here.</p>
          </div>
        </div>
      )}

      <ComingSoonModal game={previewGame} onClose={() => setPreviewGame(null)} />
    </div>
  );
}
