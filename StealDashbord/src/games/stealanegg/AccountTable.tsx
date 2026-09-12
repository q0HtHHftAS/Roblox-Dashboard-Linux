"use client";
import React, { useState } from "react";
import type { PlayerData } from "@/shared/lib/types";
import type { SortField, SortDirection } from "@/shared/hooks/useDashboardFilters";
import { formatMoneyAbbreviated, formatRate, getBotStatus } from "@/shared/lib/format";
import { StatusDot } from "@/shared/ui/StatusDot";
import { useCachedImage } from "@/games/stealanegg/useCachedImage";
import { useNow } from "@/shared/hooks/useNow";

interface AccountTableProps {
  players: PlayerData[];
  serverTime: number;
  // ผลต่างนาฬิกา client-server (ms, จาก useLiveData) — ใช้ชดเชยให้นับ "Xs ago" แบบ live ทุกวิ
  // ถ้าไม่ส่งมา จะใช้เวลาฝั่ง client ตรง ๆ
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

function TablePetMini({ icon, label, isEgg }: { icon?: string; label: string; isEgg?: boolean }) {
  const { loaded, onImgError } = useCachedImage(icon, label, isEgg);
  if (!loaded) {
    return <span className="grid h-6 w-6 place-items-center rounded bg-surface border border-line text-[9px] font-bold text-zinc-500">{label.charAt(0)}</span>;
  }
  return <img src={loaded} onError={onImgError} alt={label} className="h-6 w-6 object-contain drop-shadow" />;
}

const STATUS_PILL: Record<string, { pill: string; label: string }> = {
  online: { pill: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300", label: "Online" },
  idle: { pill: "border-amber-500/20 bg-amber-500/[0.07] text-amber-300", label: "Idle" },
  offline: { pill: "border-zinc-600/40 bg-white/[0.03] text-zinc-400", label: "Offline" },
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

export function AccountsEmptyState({
  icon = "fa-regular fa-folder",
  title = "No player data yet",
  subtitle = "Run the script in-game to start syncing your accounts.",
  logo,
  action,
}: {
  icon?: string;
  title?: string;
  subtitle?: string;
  logo?: string;
  action?: React.ReactNode;
} = {}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center py-20 text-center">
      {logo ? (
        <img src={logo} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />
      ) : (
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[0.03] text-xl text-zinc-500">
          <i className={icon}></i>
        </span>
      )}
      <h4 className="mt-4 text-sm font-bold text-zinc-200">{title}</h4>
      <p className="mt-1 text-xs text-zinc-500">
        {subtitle}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SortCaret({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) return <i className="fa-solid fa-sort text-[9px] text-zinc-700"></i>;
  return (
    <i className={`fa-solid ${dir === "asc" ? "fa-sort-up" : "fa-sort-down"} text-[9px] text-accent`}></i>
  );
}

// ฟิลด์ string เริ่มด้วย asc, ตัวเลขเริ่มด้วย desc
const ASC_FIRST: SortField[] = ["username", "pc", "status"];

export function AccountTable({
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
}: AccountTableProps) {
  // นาฬิกา live (tick ทุกวิ) ชดเชย skew แล้ว — "Xs ago" จะนับขึ้นจริงทุกวินาที
  // ไม่รอ poll 4 วิเหมือน serverTime (serverTime ยังใช้เป็น fallback ตอน skew ยังไม่รู้)
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

  if (players.length === 0) {
    return <AccountsEmptyState />;
  }

  // กริดคอลัมน์ fixed เท่ากันทุกแถว (Q5/Q6 — แก้น้อยสุด):
  // แยก grid กันคนละแถวแต่ใช้ px ตายตัวเหมือนกันเลยตรงกันเสมอ + truncate ข้างในแทนดันคอลัมน์
  // Status 160 / PC 110 / Account 150 / Money 210 / Speed 150 / Pen 130 / Pets 210 / Eggs 180 / Total 160 / Action 28
  const gridCols = isReadOnly
    ? "160px 110px 150px 210px 150px 130px 210px 180px 160px"
    : "160px 110px 150px 210px 150px 130px 210px 180px 160px 28px";
  // min-width ของ inner scroll container = ผลรวมคอลัมน์ + gap-x-2 (8px) + px-4 ของแถว (32px)
  // 9 cols: 1460 + 8*8 + 32 = 1556 / 10 cols: 1488 + 9*8 + 32 = 1592
  const innerMinWidth = isReadOnly ? 1556 : 1592;

  return (
    <div className="space-y-2">
      {/* scroll นอกสุดอันเดียว (Q3/Q8) — header + ทุกแถวเลื่อนพร้อมกันทั้ง desktop/mobile */}
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: innerMinWidth }} className="space-y-2">
      {/* Column labels (click = sort) */}
      <div
        style={{ gridTemplateColumns: gridCols }}
        className="hidden w-full items-center gap-x-2 px-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 lg:grid"
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
        <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
          <button onClick={() => handleSort("money")} className="inline-flex items-center gap-1 hover:text-zinc-300">
            <i className="fa-solid fa-money-bill-wave text-[10px]"></i> Money <SortCaret active={sortField === "money"} dir={sortDir} />
          </button>
          <span className="text-zinc-700">·</span>
          <button onClick={() => handleSort("moneyPerSec")} title="Income per second" className="inline-flex items-center gap-1 hover:text-zinc-300">
            <i className="fa-solid fa-bolt text-[10px]"></i>/s <SortCaret active={sortField === "moneyPerSec"} dir={sortDir} />
          </button>
        </span>
        <button onClick={() => handleSort("speedPower")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
          <i className="fa-solid fa-person-running text-[10px]"></i> Speed <SortCaret active={sortField === "speedPower"} dir={sortDir} />
        </button>
        <button onClick={() => handleSort("baseLevel")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
          <i className="fa-solid fa-house text-[10px]"></i> Pen <SortCaret active={sortField === "baseLevel"} dir={sortDir} />
        </button>
        <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
          <button onClick={() => handleSort("petsRate")} className="inline-flex items-center gap-1 hover:text-zinc-300">
            <i className="fa-solid fa-paw text-[10px]"></i> Pets <SortCaret active={sortField === "petsRate"} dir={sortDir} />
          </button>
          <span className="text-zinc-700">·</span>
          <button onClick={() => handleSort("petsRate")} title="Pets income per second" className="inline-flex items-center gap-1 hover:text-zinc-300">
            <i className="fa-solid fa-bolt text-[10px]"></i>/s <SortCaret active={sortField === "petsRate"} dir={sortDir} />
          </button>
        </span>
        <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
          <button onClick={() => handleSort("eggsRate")} className="inline-flex items-center gap-1 hover:text-zinc-300">
            <i className="fa-solid fa-egg text-[10px]"></i> Eggs <SortCaret active={sortField === "eggsRate"} dir={sortDir} />
          </button>
          <span className="text-zinc-700">·</span>
          <button onClick={() => handleSort("eggsRate")} title="Eggs income per second" className="inline-flex items-center gap-1 hover:text-zinc-300">
            <i className="fa-solid fa-bolt text-[10px]"></i>/s <SortCaret active={sortField === "eggsRate"} dir={sortDir} />
          </button>
        </span>
        <button onClick={() => handleSort("totalRate")} className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap hover:text-zinc-300">
          <i className="fa-solid fa-bolt text-[10px]"></i> Pets + Eggs /s <SortCaret active={sortField === "totalRate"} dir={sortDir} />
        </button>
        {!isReadOnly && <span className="w-7" />}
      </div>

      {paged.map((p) => {
        const status = getBotStatus(p.lastSeen, liveNow);
        // Online/Idle → นับเวลาออนไลน์ต่อเนื่องตั้งแต่ firstSeen (session start)
        // Offline → นับเวลาตั้งแต่เห็นครั้งสุดท้าย (…ago)
        const lastSeenNum = Number(p.lastSeen || p.lastUpdated || 0);
        const sessionStart = Number(p.firstSeen || lastSeenNum || 0);
        const uptimeSec = Math.max(0, Math.floor((liveNow - (sessionStart > liveNow ? lastSeenNum : sessionStart)) / 1000));
        const agoSec = Math.max(0, Math.floor((liveNow - lastSeenNum) / 1000));
        const timerText = status === "offline" ? agoText(agoSec) : uptimeText(uptimeSec);
        const st = STATUS_PILL[status];
        const equipped = p.pets || [];
        const ownedCount = (p.inventory && p.inventory.length > 0) ? p.inventory.length : equipped.length;
        const equippedSum = equipped.reduce((s, pet) => s + (pet.ratePerSecond ?? 0), 0);
        const eggList = p.eggsList || [];
        const eggCount = p.eggsTotal ?? eggList.length;
        const eggRate = p.eggsPerSec ?? 0;

        return (
          <div
            key={`${p.pcName}-${p.username}`}
            onClick={() => onSelectPlayer(p)}
            style={{ gridTemplateColumns: gridCols }}
            className="group grid w-full items-center gap-x-2 rounded-xl border border-line bg-surface/70 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface cursor-pointer"
          >
            {/* Status */}
            <span title={`${st.label} · ${timerText}`} className={`flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border px-3 py-2.5 text-xs font-semibold ${st.pill}`}>
              <span className="shrink-0">
                <StatusDot status={status} ping={status === "online"} />
              </span>
              <span className="shrink-0">{st.label}</span>
              <span className="ml-auto shrink-0 truncate text-right font-mono font-medium tabular-nums opacity-60">· {timerText}</span>
            </span>

            {/* PC */}
            <span title={p.pcName || "PC-001"} className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border border-line bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-zinc-300">
              <i className="fa-solid fa-desktop shrink-0 text-[10px] text-zinc-500"></i>
              <span className="min-w-0 flex-1 truncate">{p.pcName || "PC-001"}</span>
            </span>

            {/* Account */}
            <span title={p.username} className="w-full min-w-0 truncate text-center text-[15px] font-bold text-white group-hover:text-accent transition-colors">
              {p.username}
            </span>

            {/* Money */}
            <span title={`${formatMoneyAbbreviated(p.money ?? 0)} (${formatRate(p.moneyPerSec ?? 0)})`} className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2.5 text-[13px] font-bold text-white">
              <img src="/images/steal-an-egg/money.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
              <span className="min-w-0 flex-1 truncate tabular-nums">{formatMoneyAbbreviated(p.money ?? 0)}</span>
              <span className="ml-auto shrink-0 truncate font-semibold tabular-nums text-amber-400">
                <i className="fa-solid fa-bolt mr-0.5 text-[10px]"></i>{formatRate(p.moneyPerSec ?? 0)}
              </span>
            </span>

            {/* Speed */}
            <span title={`${formatMoneyAbbreviated(p.speedPower ?? 0)}${(p.treadmillLevel ?? 0) > 0 ? ` Lv${p.treadmillLevel}` : ""}`} className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border border-purple-500/20 bg-purple-500/[0.07] px-3 py-2.5 text-[13px] font-bold text-white">
              <img src="/images/steal-an-egg/speed.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
              <span className="min-w-0 flex-1 truncate tabular-nums">{formatMoneyAbbreviated(p.speedPower ?? 0)}</span>
              {(p.treadmillLevel ?? 0) > 0 && (
                <span className="ml-auto shrink-0 rounded bg-white/[0.06] px-1 py-px text-[10px] font-semibold text-zinc-400">
                  Lv{p.treadmillLevel}
                </span>
              )}
            </span>

            {/* Pen */}
            <span title={`Lv${p.baseLevel ?? 1} ${p.capacity ?? 0}/${p.maxCapacity ?? 0}`} className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2.5 text-[13px] font-bold text-white">
              <img src="/images/steal-an-egg/pen.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
              <span className="shrink-0">Lv{p.baseLevel ?? 1}</span>
              <span className="ml-auto shrink-0 truncate text-[10px] font-semibold tabular-nums text-zinc-500">
                {p.capacity ?? 0}/{p.maxCapacity ?? 0}
              </span>
            </span>

            {/* Pets */}
            <span className="flex w-full min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
              <span className="flex shrink-0 items-center">
                {equipped.slice(0, 3).map((pet, i) => (
                  <span key={pet.uuid || i} title={`${pet.name} (${formatRate(pet.ratePerSecond)})`} className="-ml-1 first:ml-0 rounded-full ring-2 ring-[#1a1e24]">
                    <TablePetMini icon={pet.icon} label={pet.name} isEgg={pet.isEgg} />
                  </span>
                ))}
              </span>
              <span className="min-w-[3ch] shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-zinc-300">
                {ownedCount}
              </span>
              {equippedSum > 0 && (
                <span title={formatRate(equippedSum)} className="ml-auto shrink-0 truncate text-xs font-semibold tabular-nums text-amber-300">
                  <i className="fa-solid fa-bolt mr-0.5 text-[10px]"></i>{formatRate(equippedSum)}
                </span>
              )}
            </span>

            {/* Eggs */}
            <span className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border border-sky-500/30 bg-transparent px-3 py-2.5">
              <span className="shrink-0">
              {eggList[0] ? (
                <TablePetMini icon={eggList[0].icon} label={eggList[0].name} isEgg />
              ) : (
                <img src="/images/steal-an-egg/egg.png" alt="" className="h-6 w-6 shrink-0 object-contain" />
              )}
              </span>
              <span className="min-w-[2ch] shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-zinc-300">
                {eggCount}
              </span>
              {eggRate > 0 && (
                <span title={formatRate(eggRate)} className="ml-auto shrink-0 truncate text-xs font-semibold tabular-nums text-amber-300">
                  <i className="fa-solid fa-bolt mr-0.5 text-[10px]"></i>{formatRate(eggRate)}
                </span>
              )}
            </span>

            {/* Total pets + eggs /s */}
            <span title={formatRate(equippedSum + eggRate)} className="flex w-full min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-amber-500/40 bg-transparent px-3 py-2.5 text-[13px] font-bold text-amber-300">
              <i className="fa-solid fa-bolt shrink-0 text-xs"></i>
              <span className="min-w-0 truncate tabular-nums">{formatRate(equippedSum + eggRate)}</span>
            </span>

            {/* Actions */}
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

      {/* Pagination — อยู่นอก scroll เพื่อไม่เลื่อนตามตาราง */}
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
