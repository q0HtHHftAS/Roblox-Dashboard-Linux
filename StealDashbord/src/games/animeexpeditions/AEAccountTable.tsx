"use client";
import React, { useState } from "react";
import type { PlayerData, AEUnitData } from "@/shared/lib/types";
import type { SortField, SortDirection } from "@/shared/hooks/useDashboardFilters";
import { formatAbbreviated, formatCount, getBotStatus } from "@/shared/lib/format";
import { StatusDot } from "@/shared/ui/StatusDot";
import { useNow } from "@/shared/hooks/useNow";
import { aeDisplayName } from "@/games/animeexpeditions/aeUnitMeta";
import { AEUnitThumb } from "./AEUnitThumb";

interface AEAccountTableProps {
  players: PlayerData[];
  serverTime: number;
  skew?: number;
  sortField: SortField | null;
  onSortFieldChange: (v: SortField) => void;
  sortDir: SortDirection;
  onSortDirToggle: () => void;
  rowsPerPage: number;
  onSelectPlayer: (player: PlayerData) => void;
  onDeletePlayer?: (pcName: string, username: string) => Promise<void>;
  isReadOnly?: boolean;
}

function SortCaret({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) return <i className="fa-solid fa-sort text-[9px] text-zinc-700"></i>;
  return (
    <i className={`fa-solid ${dir === "asc" ? "fa-sort-up" : "fa-sort-down"} text-[9px] text-accent`}></i>
  );
}

// ฟิลด์ string เริ่มด้วย asc, ตัวเลขเริ่มด้วย desc
const ASC_FIRST: SortField[] = ["username", "pc", "status"];

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
};

function agoText(diffSec: number): string {
  return diffSec < 60 ? `${diffSec}s` : `${Math.floor(diffSec / 60)}m`;
}

// ระยะเวลาออนไลน์ต่อเนื่อง (uptime): รองรับ s / m / h / d — ไม่รีเซ็ตตามรอบ poll
function uptimeText(diffSec: number): string {
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(diffSec / 86400);
  const h = Math.floor((diffSec % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function AEAccountTable({
  players,
  serverTime,
  skew = 0,
  sortField,
  onSortFieldChange,
  sortDir,
  onSortDirToggle,
  rowsPerPage,
  onSelectPlayer,
  onDeletePlayer,
  isReadOnly = false,
}: AEAccountTableProps) {
  const now = useNow(1000);
  const liveNow = skew ? now - skew : Math.max(now, serverTime);

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(players.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paged = players.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function handleSort(f: SortField) {
    if (f === sortField) {
      onSortDirToggle();
    } else {
      onSortFieldChange(f);
      if (ASC_FIRST.includes(f) !== (sortDir === "asc")) onSortDirToggle();
    }
    setPage(1);
  }

  const gridCols = isReadOnly
    ? "minmax(120px,1.15fr) minmax(90px,0.85fr) minmax(130px,1.25fr) minmax(85px,0.8fr) minmax(105px,1fr) minmax(105px,1fr) minmax(105px,1fr) minmax(180px,1.7fr)"
    : "minmax(120px,1.15fr) minmax(90px,0.85fr) minmax(130px,1.25fr) minmax(85px,0.8fr) minmax(105px,1fr) minmax(105px,1fr) minmax(105px,1fr) minmax(180px,1.7fr) 28px";
  const innerMinWidth = 1100;

  if (players.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center py-20 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[0.03] text-xl text-zinc-500">
          <i className="fa-solid fa-compass"></i>
        </span>
        <h4 className="mt-4 text-sm font-bold text-zinc-200">No Anime Expeditions data yet</h4>
        <p className="mt-1 text-xs text-zinc-500">Run the script in-game to start syncing your accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: innerMinWidth }} className="space-y-2">
          <div
            style={{ gridTemplateColumns: gridCols }}
            className="hidden w-full items-center gap-x-2 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 lg:grid"
          >
            <button onClick={() => handleSort("status")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-signal text-[10px]"></i> Status <SortCaret active={sortField === "status"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("pc")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-desktop text-[10px]"></i> PC <SortCaret active={sortField === "pc"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("username")} className="flex min-w-0 items-center justify-center gap-1 truncate whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-user text-[10px]"></i> Account <SortCaret active={sortField === "username"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("aeLevel")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-star text-[10px]"></i> Level <SortCaret active={sortField === "aeLevel"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("gems")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-gem text-[10px]"></i> Gem <SortCaret active={sortField === "gems"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("money")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-coins text-[10px]"></i> Gold <SortCaret active={sortField === "money"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("traitReroll")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-ticket text-[10px]"></i> Trait Reroll <SortCaret active={sortField === "traitReroll"} dir={sortDir} />
            </button>
            <button onClick={() => handleSort("unitsTotal")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
              <i className="fa-solid fa-users text-[10px]"></i> Units <SortCaret active={sortField === "unitsTotal"} dir={sortDir} />
            </button>
            {!isReadOnly && <span className="w-7" />}
          </div>

          {paged.map((p) => {
            const status = getBotStatus(p.lastSeen, liveNow);
            // Online/Idle → นับเวลาออนไลน์ต่อเนื่องตั้งแต่ firstSeen (session start)
            // Offline → นับเวลาตั้งแต่เห็นครั้งสุดท้าย (…ago) — เหมือนตาราง Steal An Egg
            const lastSeenNum = Number(p.lastSeen || p.lastUpdated || 0);
            const sessionStart = Number(p.firstSeen || lastSeenNum || 0);
            const uptimeSec = Math.max(0, Math.floor((liveNow - (sessionStart > liveNow ? lastSeenNum : sessionStart)) / 1000));
            const agoSec = Math.max(0, Math.floor((liveNow - lastSeenNum) / 1000));
            const timerText = status === "offline" ? agoText(agoSec) : uptimeText(uptimeSec);
            const pill =
              status === "online"
                ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300"
                : status === "idle"
                  ? "border-amber-500/20 bg-amber-500/[0.07] text-amber-300"
                  : "border-zinc-600/40 bg-white/[0.03] text-zinc-400";
            // ช่องที่ถืออยู่จริง (HotbarData resolve ด้วย uuid) — payload เก่าไม่มี equippedUnits ตกไป top ตาม level
            const byUuid = new Map((p.units || []).map((u) => [u.uuid, u]));
            const equipped = (p.equippedUnits || [])
              .map((k) => byUuid.get(k))
              .filter((u): u is AEUnitData => !!u);
            const shown = (equipped.length > 0 ? equipped : p.units || []).slice(0, 5);
            const unitsCount = p.unitsTotal ?? (p.units || []).length;
            return (
              <div
                key={`${p.pcName}-${p.username}`}
                onClick={() => onSelectPlayer(p)}
                style={{ gridTemplateColumns: gridCols }}
                className="group grid w-full items-center gap-x-2 rounded-xl border border-line bg-surface/70 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-surface cursor-pointer"
              >
                <span title={`${STATUS_LABEL[status]} · ${timerText}`} className={`flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border px-3 py-2 text-xs font-semibold ${pill}`}>
                  <span className="shrink-0">
                    <StatusDot status={status} ping={status === "online"} />
                  </span>
                  <span className="shrink-0">{STATUS_LABEL[status]}</span>
                  <span className="ml-auto shrink-0 truncate text-right font-mono font-medium tabular-nums opacity-60">· {timerText}</span>
                </span>
                <span title={p.pcName || "PC-001"} className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border border-line bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-300">
                  <i className="fa-solid fa-desktop shrink-0 text-[10px] text-zinc-500"></i>
                  <span className="min-w-0 flex-1 truncate">{p.pcName || "PC-001"}</span>
                </span>
                <span title={p.username} className="w-full min-w-0 truncate text-center text-[15px] font-bold text-white group-hover:text-accent transition-colors">
                  {p.username}
                </span>
                <span title={`Level ${p.aeLevel ?? 0}`} className="flex w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border border-emerald-500/20 bg-emerald-500/[0.07] px-2 py-2 text-[13px] font-bold tabular-nums text-emerald-300">
                  <i className="fa-solid fa-star shrink-0 text-[10px]"></i>
                  <span className="min-w-0 truncate">{p.aeLevel ?? 0}</span>
                </span>
                <span title={formatAbbreviated(p.gems ?? 0)} className="flex w-full min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-violet-500/20 bg-violet-500/[0.07] px-2 py-2 text-[13px] font-bold tabular-nums text-violet-200">
                  <img src="/images/anime-expeditions/icons/gem.png" alt="Gem" loading="lazy" className="h-4 w-4 shrink-0 object-contain" />
                  <span className="min-w-0 truncate">{formatAbbreviated(p.gems ?? 0)}</span>
                </span>
                <span title={formatAbbreviated(p.money ?? 0)} className="flex w-full min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-amber-500/20 bg-amber-500/[0.07] px-2 py-2 text-[13px] font-bold tabular-nums text-amber-300">
                  <img src="/images/anime-expeditions/icons/gold.png" alt="Gold" loading="lazy" className="h-4 w-4 shrink-0 object-contain" />
                  <span className="min-w-0 truncate">{formatAbbreviated(p.money ?? 0)}</span>
                </span>
                <span title={formatCount(p.currencies?.TraitReroll ?? 0)} className="flex w-full min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-orange-500/20 bg-orange-500/[0.07] px-2 py-2 text-[13px] font-bold tabular-nums text-orange-200">
                  <img src="/images/anime-expeditions/icons/trait_reroll.png" alt="Trait Reroll" loading="lazy" className="h-4 w-4 shrink-0 object-contain" />
                  <span className="min-w-0 truncate">{formatCount(p.currencies?.TraitReroll ?? 0)}</span>
                </span>
                <span className="flex min-w-0 items-center justify-center">
                  {shown.length === 0 && <span className="text-[11px] text-zinc-600">—</span>}
                  {shown.length > 0 && (
                    <span className="flex min-w-0 items-center justify-center rounded-md border border-line bg-white/[0.02] px-2 py-1">
                      <span className="flex shrink-0 items-center">
                        {shown.map((u, i) => (
                          <span
                            key={u.uuid}
                            title={`${aeDisplayName(u.asset, u.displayName)} Lv${u.level}${u.trait ? ` · ${u.trait}` : ""}`}
                            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
                            className="relative grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.04] ring-2 ring-[#14171c]"
                          >
                            <AEUnitThumb asset={u.asset} image={u.image} displayName={u.displayName} size="sm" />
                          </span>
                        ))}
                      </span>
                      <span title={`${unitsCount} units`} className="ml-1.5 shrink-0 rounded-md border border-amber-400/50 bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-amber-200">
                        {unitsCount}
                      </span>
                    </span>
                  )}
                </span>
                {!isReadOnly && (
                  <span className="w-7" onClick={(e) => e.stopPropagation()}>
                    {onDeletePlayer && (
                      <button
                        onClick={() => onDeletePlayer(p.pcName, p.username)}
                        title="Remove this account"
                        className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 transition-[opacity,background-color,color] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-xs tabular-nums text-zinc-500">
        <span>
          Showing {(currentPage - 1) * rowsPerPage + 1}–
          {Math.min(currentPage * rowsPerPage, players.length)} of {players.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 font-bold text-zinc-300 disabled:opacity-40 hover:bg-white/5"
          >
            Prev
          </button>
          <span className="font-semibold text-zinc-400">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 font-bold text-zinc-300 disabled:opacity-40 hover:bg-white/5"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
