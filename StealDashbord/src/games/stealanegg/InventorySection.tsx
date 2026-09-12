"use client";
import React, { useState, useMemo } from "react";
import type { PlayerData, PetData } from "@/shared/lib/types";
import { formatRate, formatHatchTime, liveRemaining } from "@/shared/lib/format";
import { baseIncomeFor } from "@/games/stealanegg/petIncomeMap";
import { rarityStyle, rarityRank } from "@/shared/lib/rarity";
import { useCachedImage } from "@/games/stealanegg/useCachedImage";
import { useNow } from "@/shared/hooks/useNow";
import { RarityBadge } from "@/shared/ui/Badge";
import { CustomSelect } from "@/shared/ui/CustomSelect";

export interface InventoryGroupItem {
  pet: PetData;
  account: string;
  pc: string;
  lastSeen?: number;
  updatedAt?: number;
}

interface InventorySectionProps {
  players: PlayerData[];
  onSelectItem: (group: {
    category: string;
    rarity?: string;
    items: InventoryGroupItem[];
  }) => void;
}

type InvTab = "pets" | "eggs";
type InvSort = "rarity" | "rate" | "count" | "name";

const SORT_OPTIONS = [
  { value: "rarity", label: "Rarity", icon: "fa-layer-group" },
  { value: "rate", label: "Top rate", icon: "fa-bolt" },
  { value: "count", label: "Most owned", icon: "fa-boxes-stacked" },
  { value: "name", label: "Name", icon: "fa-arrow-down-a-z" },
];

function InventoryThumb({ icon, label, isEgg }: { icon?: string; label: string; isEgg?: boolean }) {
  const { loaded, onImgError } = useCachedImage(icon, label, isEgg);
  if (!loaded) {
    return <span className="grid h-24 w-24 place-items-center rounded-xl bg-surface border border-line text-2xl font-black text-zinc-500">{label.charAt(0)}</span>;
  }
  return <img src={loaded} onError={onImgError} alt={label} className="h-24 w-24 object-contain drop-shadow" />;
}

// สรุป cooldown ของกลุ่ม: เวลาน้อยสุด + จำนวนฟองที่กำลัง cooldown (อิง liveRemaining แบบ tick ทุกวิ)
function groupCooldown(
  group: { items: InventoryGroupItem[] },
  now: number
): { secs: number; count: number } | null {
  let min = Infinity;
  let n = 0;
  for (const it of group.items) {
    const r = liveRemaining(it.pet.remaining, it.updatedAt, now);
    if (r != null && r > 0) {
      n += 1;
      if (r < min) min = r;
    }
  }
  return n > 0 ? { secs: min, count: n } : null;
}

// บรรทัดทำเงินของการ์ด: ใช้ rate จริงก่อน ถ้าเป็น 0 (Lua คำนวณไม่ได้ เช่น ไข่ที่วางฟัก)
// ใช้ base income ของสายพันธุ์จาก wiki แทน (ติดป้าย base กำกับ)
function groupEarning(group: { category: string; maxRate: number }): { text: string; isBase: boolean } | null {
  if (group.maxRate > 0) return { text: formatRate(group.maxRate), isBase: false };
  const base = baseIncomeFor(group.category);
  return base ? { text: base, isBase: true } : null;
}

export function InventorySection({ players, onSelectItem }: InventorySectionProps) {
  const [tab, setTab] = useState<InvTab>("pets");
  const [sort, setSort] = useState<InvSort>("rarity");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const now = useNow(1000);
  const itemsPerPage = 24;

  // Aggregate inventory across all accounts
  const aggregated = useMemo(() => {
    const map = new Map<string, {
      category: string;
      rarity?: string;
      icon?: string;
      isEgg: boolean;
      items: InventoryGroupItem[];
      maxRate: number;
    }>();

    for (const p of players) {
      // pets (equipped) is a subset of inventory — dedupe by uuid so equipped
      // items are not counted twice.
      const seen = new Set<string>();
      const allPets = [...(p.inventory || []), ...(p.pets || []), ...(p.eggsList || [])];
      for (const pet of allPets) {
        const uid = pet.uuid || `${pet.category || pet.name}-noidx`;
        if (seen.has(uid)) continue;
        seen.add(uid);
        const cat = pet.category || pet.name || "Unknown";
        const isEgg = !!pet.isEgg;
        const key = `${isEgg ? "egg" : "pet"}:${cat}`;

        let entry = map.get(key);
        if (!entry) {
          entry = {
            category: cat,
            rarity: pet.rarity,
            icon: pet.icon,
            isEgg,
            items: [],
            maxRate: 0,
          };
          map.set(key, entry);
        }

        entry.items.push({
          pet,
          account: p.username,
          pc: p.pcName,
          lastSeen: p.lastSeen,
          updatedAt: p.lastUpdated,
        });

        if ((pet.ratePerSecond ?? 0) > entry.maxRate) {
          entry.maxRate = pet.ratePerSecond ?? 0;
          if (pet.icon) entry.icon = pet.icon;
          if (pet.rarity) entry.rarity = pet.rarity;
        }
      }
    }

    return Array.from(map.values());
  }, [players]);

  const tabGroups = useMemo(() => {
    const wantEgg = tab === "eggs";
    return aggregated.filter((it) => it.isEgg === wantEgg);
  }, [aggregated, tab]);

  const totalCount = useMemo(
    () => tabGroups.reduce((sum, g) => sum + g.items.length, 0),
    [tabGroups]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? tabGroups.filter((g) => g.category.toLowerCase().includes(q))
      : [...tabGroups];
    switch (sort) {
      case "rate":
        list.sort((a, b) => b.maxRate - a.maxRate || b.items.length - a.items.length);
        break;
      case "count":
        list.sort((a, b) => b.items.length - a.items.length || b.maxRate - a.maxRate);
        break;
      case "name":
        list.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "rarity":
      default:
        list.sort(
          (a, b) =>
            rarityRank(b.rarity) - rarityRank(a.rarity) ||
            b.maxRate - a.maxRate ||
            b.items.length - a.items.length
        );
        break;
    }
    return list;
  }, [tabGroups, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = visible.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const petUnique = aggregated.filter((i) => !i.isEgg).length;
  const eggUnique = aggregated.filter((i) => i.isEgg).length;

  function switchTab(t: InvTab) {
    setTab(t);
    setPage(1);
  }

  return (
    <section>
      {/* Header: label + counts + controls */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <i className="fa-solid fa-boxes-stacked text-[10px]"></i>
            Inventory
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            <span className="text-base font-black tabular-nums text-white">{tabGroups.length}</span>{" "}
            unique · {totalCount} total
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect
            prefix="Sort:"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => { setSort(v as InvSort); setPage(1); }}
          />
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"></i>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="h-9 w-44 rounded-lg border border-line bg-surface pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-accent focus:outline-none sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Pets / Eggs tabs */}
      <div className="mb-4 flex items-center gap-5 border-b border-line/60 text-sm font-bold">
        <button
          onClick={() => switchTab("pets")}
          className={`flex items-center gap-1.5 pb-2 -mb-px transition-colors ${
            tab === "pets"
              ? "text-white border-b-2 border-accent"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <img src="/images/steal-an-egg/pets.png" alt="" className="h-4 w-4 object-contain" />
          Pets
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
            {petUnique}
          </span>
        </button>
        <button
          onClick={() => switchTab("eggs")}
          className={`flex items-center gap-1.5 pb-2 -mb-px transition-colors ${
            tab === "eggs"
              ? "text-white border-b-2 border-accent"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <img src="/images/steal-an-egg/egg.png" alt="" className="h-4 w-4 object-contain" />
          Eggs
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
            {eggUnique}
          </span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          {query ? `No items match "${query}".` : "No inventory items recorded yet."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {pagedItems.map((group) => {
              const st = rarityStyle(group.rarity);
              const cd = groupCooldown(group, now);
              const earn = groupEarning(group);
              const isBest = group.items.some((it) => it.pet.isEquipped);
              return (
              <div
                key={`${group.isEgg ? "egg" : "pet"}-${group.category}`}
                onClick={() => onSelectItem(group)}
                className={`group relative flex flex-col items-center justify-between rounded-xl border bg-surface/80 p-3.5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:bg-surface ${st.border}`}
              >
                <div className="flex w-full items-center justify-between">
                  <RarityBadge rarity={group.rarity} />
                  <span className="min-w-[3ch] rounded-full bg-white/5 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-zinc-300">
                    {group.items.length}
                  </span>
                </div>

                <div className="my-3 flex h-24 w-24 items-center justify-center transition-transform group-hover:scale-105">
                  <InventoryThumb icon={group.icon} label={group.category} isEgg={group.isEgg} />
                </div>

                {/* Hover overlay -> detail */}
                <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                    <i className="fa-regular fa-eye"></i>
                    View
                  </span>
                </div>

                {cd ? (
                  <div className="flex w-full flex-col items-center gap-1.5 border-t border-line/50 pt-2.5 text-center">
                    <div className={`w-full truncate text-xs font-bold leading-tight ${st.text}`}>
                      {group.category}
                    </div>
                    {earn ? (
                      <div className="flex h-4 items-center justify-center gap-1 text-[11px] font-bold tabular-nums text-amber-400">
                        <i className="fa-solid fa-bolt text-[10px]"></i>
                        <span>{earn.text}</span>
                        {isBest && <span className="text-[10px] font-semibold text-zinc-500">best</span>}
                        {earn.isBase && (
                          <span className="rounded bg-white/5 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-zinc-400">base</span>
                        )}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                    <div className="inline-flex h-6 items-center justify-center gap-1 rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-sky-300">
                      <i className="fa-regular fa-clock"></i>
                      {formatHatchTime(cd.secs)}{cd.count > 1 ? ` ×${cd.count}` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="w-full border-t border-line/50 pt-2.5 text-center">
                    <div className={`truncate text-xs font-bold ${st.text}`}>
                      {group.category}
                    </div>
                    {earn && (
                      <div className="mt-0.5 inline-block min-w-[8ch] text-[11px] font-bold tabular-nums text-amber-400">
                        <i className="fa-solid fa-bolt mr-1"></i>{earn.text}
                        {isBest && <span className="ml-1 text-[10px] font-semibold text-zinc-500">best</span>}
                        {earn.isBase && (
                          <span className="ml-1 rounded bg-white/5 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-zinc-400">base</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4 text-xs text-zinc-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, visible.length)} of {visible.length}
            </span>
            {totalPages > 1 && (
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
            )}
          </div>
        </>
      )}
    </section>
  );
}
