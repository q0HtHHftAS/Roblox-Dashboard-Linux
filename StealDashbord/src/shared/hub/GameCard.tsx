"use client";
import React, { useState } from "react";

export interface GameItem {
  id: string;
  name: string;
  subtitle: string;
  badge: "ACTIVE" | "COMING SOON" | "MAINTENANCE";
  icon: string;
  image: string;
  myAccounts?: number;
  totalAccounts?: number | string;
  onlineCount?: number;
  accountsCount?: number;
  available: boolean;
}

interface GameCardProps {
  game: GameItem;
  onSelect: (game: GameItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (game: GameItem) => void;
}

export const FAV_EVENT = "hub:fav-changed";

export function favKey(id: string) {
  return `hub:fav:${id}`;
}

export function readFav(id: string): boolean {
  try {
    return window.localStorage.getItem(favKey(id)) === "1";
  } catch {
    return false;
  }
}

export function GameCard({ game, onSelect, isFavorite: controlledFav, onToggleFavorite }: GameCardProps) {
  const [internalFav, setInternalFav] = useState<boolean | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const isFavorite = controlledFav ?? (internalFav ?? (typeof window !== "undefined" ? readFav(game.id) : false));

  const toggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(game);
      return;
    }
    const next = !isFavorite;
    setInternalFav(next);
    try {
      if (next) window.localStorage.setItem(favKey(game.id), "1");
      else window.localStorage.removeItem(favKey(game.id));
    } catch {}
    try {
      window.dispatchEvent(new Event(FAV_EVENT));
    } catch {}
  };

  return (
    <div
      onClick={() => onSelect(game)}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-lg shadow-black/30 ring-1 ring-inset ring-line2 transition-[box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:ring-accent/40 cursor-pointer"
    >
      {/* Top Banner Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1a2027]">
        {imgOk ? (
          /* รูป + gradient ซูมเป็นก้อนเดียวกัน (ไม่มี relative motion ระหว่างชั้น = ไม่มีเส้นคั่นตอน animation)
             -inset-px เผื่อขอบ 1px ให้ขอบที่ถูก transform อยู่เลยนอก clip region เสมอ กันรอย subpixel */
          <div className="absolute -inset-px transition-transform duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]">
            <img
              src={game.image}
              alt={game.name}
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover"
            />
            {/* Dark gradient behind title (ducky-style legibility fade) */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#13171e] via-[#13171e]/30 to-transparent" />
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1c232c] to-[#12161b] text-zinc-600">
            <i className="fa-solid fa-gamepad text-3xl"></i>
          </div>
        )}
        {/* Top-Right Favorite Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite();
          }}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          className={`absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-lg border backdrop-blur-md transition-[background-color,border-color,color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isFavorite
              ? "border-amber-400/40 bg-amber-400/20 text-amber-300 shadow-md shadow-amber-500/20"
              : "border-white/10 bg-black/40 text-zinc-400 hover:bg-black/60 hover:text-white"
          }`}
        >
          <i className={`fa-star ${isFavorite ? "fa-solid" : "fa-regular"} text-[11px]`}></i>
        </button>

        {/* Game Title at bottom of banner */}
        <div className="absolute bottom-2 left-2.5 right-2.5">
          <h3 className="truncate text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight">
            {game.name}
          </h3>
        </div>
      </div>

      {/* Bottom 3-Column Stats Bar matching reference design */}
      <div className="grid grid-cols-3 divide-x divide-line/60 border-t border-line/60 bg-[#0e1117] py-2.5 text-center">
        {/* Column 1: MY ACCOUNTS */}
        <div className="flex flex-col items-center justify-center px-1">
          <span className={`text-[13px] font-extrabold tabular-nums ${game.available && (game.myAccounts ?? game.accountsCount ?? 0) > 0 ? "text-sky-400" : "text-zinc-500"}`}>
            {game.available && (game.myAccounts ?? game.accountsCount ?? 0) > 0 ? (game.myAccounts ?? game.accountsCount ?? 0) : "—"}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            MY ACCOUNTS
          </span>
        </div>

        {/* Column 2: TOTAL — ยอดจริงรายเกมของผู้ใช้คนนี้ (0 แสดงเป็น — เหมือนช่องอื่น) */}
        <div className="flex flex-col items-center justify-center px-1">
          {(() => {
            const raw = game.totalAccounts ?? game.myAccounts ?? game.accountsCount ?? 0;
            const totalNum = typeof raw === "string" ? Number(raw) || 0 : raw;
            return game.available && totalNum > 0 ? (
              <span className="text-[13px] font-extrabold tabular-nums text-white">
                {totalNum.toLocaleString()}
              </span>
            ) : (
              <span className="text-[13px] font-extrabold text-zinc-500">—</span>
            );
          })()}
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            TOTAL
          </span>
        </div>

        {/* Column 3: ONLINE */}
        <div className="flex flex-col items-center justify-center px-1">
          {game.available ? (
            (game.onlineCount ?? 0) > 0 ? (
              <span className="text-[13px] font-extrabold tabular-nums text-emerald-400 flex items-center justify-center gap-1.5">
                {game.onlineCount}
              </span>
            ) : (
              <span className="text-[13px] font-extrabold text-zinc-500">—</span>
            )
          ) : (
            <span className="text-[13px] font-extrabold text-zinc-500">—</span>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
