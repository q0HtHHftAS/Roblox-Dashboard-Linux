"use client";
import React from "react";
import type { PlayerData } from "@/shared/lib/types";

interface StatsOverviewProps {
  players: PlayerData[];
  onlineCount: number;
  idleCount: number;
  offlineCount: number;
  pcCount: number;
}

// แถวการ์ดสถานะแบบ Ducky: ONLINE / OFFLINE / TOTAL ACCOUNTS
export function StatsOverview({
  players,
  onlineCount,
  offlineCount,
}: StatsOverviewProps) {
  const cards = [
    {
      label: "ONLINE",
      short: "ONLINE",
      value: onlineCount,
      valueClass: "text-emerald-400",
      icon: "fa-solid fa-tower-broadcast",
      iconClass: "bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "OFFLINE",
      short: "OFFLINE",
      value: offlineCount,
      valueClass: "text-rose-400",
      icon: "fa-solid fa-tower-broadcast",
      iconClass: "bg-rose-500/10 text-rose-400",
    },
    {
      label: "TOTAL ACCOUNTS",
      short: "TOTAL",
      value: players.length,
      valueClass: "text-violet-300",
      icon: "fa-solid fa-users",
      iconClass: "bg-violet-500/10 text-violet-300",
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <i className="fa-solid fa-earth-americas text-[10px]"></i>
        Dashboard Overview
      </div>
      <div className="grid max-w-[620px] grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface/60 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5"
          >
            <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid sm:h-9 sm:w-9 ${c.iconClass}`}>
              <i className={`${c.icon} text-xs sm:text-sm`}></i>
            </span>
            <div className="min-w-0">
              <div className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-[10px] sm:tracking-[0.15em]">
                <span className="sm:hidden">{c.short}</span>
                <span className="hidden sm:inline">{c.label}</span>
              </div>
              <div className={`text-lg font-black tabular-nums sm:text-2xl ${c.valueClass}`}>
                {c.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
