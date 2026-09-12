"use client";
import React, { useState, useMemo, useEffect } from "react";
import type { PlayerData, AEUnitData } from "@/shared/lib/types";
import { rarityStyle, rarityRank } from "@/shared/lib/rarity";
import {
  aoDisplayName,
  aoIsEvo,
  aoTraitPillClass,
  aoTraitRank,
  aoTraitTextClass,
  aoTraitTextStyle,
  persistAORarities,
  resolveAOUnitRarity,
} from "@/games/animeorigin/aoUnitMeta";
import { AOUnitThumb } from "./AOUnitThumb";
import { AOTraitIcon } from "./AOTraitIcon";
import { RarityBadge } from "@/shared/ui/Badge";
import { CustomSelect } from "@/shared/ui/CustomSelect";

export interface AOUnitGroupItem {
  unit: AEUnitData;
  account: string;
  pc: string;
}

export interface AOUnitGroup {
  asset: string;
  // ชื่อโชว์ (displayName จากเกม ถ้ามี) + รูปตัวแทน — เติมอัตโนมัติตอนรวมกลุ่ม
  name?: string;
  image?: string | null;
  rarity?: string;
  items: AOUnitGroupItem[];
  maxStars: number;
  maxLevel: number;
  shinyCount: number;
}

interface AOUnitVaultProps {
  players: PlayerData[];
  onSelectGroup?: (group: AOUnitGroup) => void;
}

type VaultSort = "rarity" | "stars" | "level" | "count" | "name" | "trait";

const UNIT_SORT_OPTIONS = [
  { value: "rarity", label: "Rarity", icon: "fa-layer-group" },
  { value: "stars", label: "Top stars", icon: "fa-star" },
  { value: "level", label: "Top level", icon: "fa-arrow-trend-up" },
  { value: "trait", label: "Trait", icon: "fa-wand-magic-sparkles" },
  { value: "name", label: "Name", icon: "fa-arrow-down-a-z" },
];

const itemsPerPage = 24;

export function AOUnitVault({ players, onSelectGroup }: AOUnitVaultProps) {
  const [sort, setSort] = useState<VaultSort>("rarity");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const unitGroups = useMemo(() => {
    const map = new Map<string, AOUnitGroup>();
    for (const p of players) {
      for (const u of p.units || []) {
        let e = map.get(u.asset);
        if (!e) {
          e = { asset: u.asset, name: undefined, image: null, rarity: undefined, items: [], maxStars: 0, maxLevel: 0, shinyCount: 0 };
          map.set(u.asset, e);
        }
        e.items.push({ unit: u, account: p.username, pc: p.pcName });
        // ชื่อ/รูปจากเกม (Lua อ่าน TowerInfo) — เจอตัวแรกก็จำไว้ใช้ทั้งกลุ่ม
        if (!e.name && typeof u.displayName === "string" && u.displayName.trim()) {
          e.name = u.displayName.trim().slice(0, 64);
        }
        if (!e.image && typeof u.image === "string" && u.image.trim()) {
          e.image = u.image.trim().slice(0, 96);
        }
        // rarity แบบ auto: payload > seed > สืบทอด EVO > ค่าที่เคยจำไว้ (ดู aoUnitMeta)
        const r = resolveAOUnitRarity(u.asset, u.rarity);
        if (!e.rarity && r) e.rarity = r;
        if ((u.ascension ?? u.level ?? 0) > e.maxStars) e.maxStars = u.ascension ?? u.level ?? 0;
        if ((u.level ?? 0) > e.maxLevel) e.maxLevel = u.level ?? 0;
        if (u.shiny) e.shinyCount += 1;
      }
    }
    return Array.from(map.values());
  }, [players]);

  // เขียน rarity ที่เรียนรู้จาก payload ลง localStorage — เปิดมาครั้งหน้าก็ยังจำได้
  useEffect(() => {
    persistAORarities();
  }, [players]);

  const totalCount = useMemo(
    () => unitGroups.reduce((s, g) => s + g.items.length, 0),
    [unitGroups]
  );

  // ร่าง Evolved/EVO อยู่สูงกว่าร่างธรรมดาเสมอ (รวมชื่อเฉพาะอย่าง GriffithFemto/
  // GriffithSilver ที่เป็นร่าง EVO แต่ชื่อไม่ลงท้ายด้วย EVO — ดู aoIsEvo)
  const evoRank = (g: AOUnitGroup) => (aoIsEvo(g.asset) ? 1 : 0);

  // ชื่อโชว์ของกลุ่ม (displayName จากเกม ถ้าไม่มีก็ pretty อัตโนมัติ)
  const groupName = (g: AOUnitGroup): string => aoDisplayName(g.asset, g.name);

  // trait ที่พบบ่อยสุดในกลุ่ม (เสมอกันเอาตัวเวลสูงสุด) — ใช้โชว์บนการ์ด + sort "Trait"
  const dominantTrait = (g: AOUnitGroup): string | null => {
    const freq = new Map<string, { n: number; lv: number }>();
    for (const it of g.items) {
      const t = it.unit.trait?.trim();
      if (!t) continue;
      const e = freq.get(t);
      const lv = it.unit.level ?? 0;
      if (!e) freq.set(t, { n: 1, lv });
      else {
        e.n += 1;
        if (lv > e.lv) e.lv = lv;
      }
    }
    let best: string | null = null;
    let bestN = 0;
    let bestLv = -1;
    for (const [t, v] of freq) {
      if (v.n > bestN || (v.n === bestN && v.lv > bestLv)) {
        best = t;
        bestN = v.n;
        bestLv = v.lv;
      }
    }
    return best;
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // ค้นได้ทั้งชื่อดิบในเกมและชื่อโชว์ ("guts" เจอทั้ง Guts และ GutsEVO)
    const list = q
      ? unitGroups.filter(
          (g) =>
            g.asset.toLowerCase().includes(q) ||
            groupName(g).toLowerCase().includes(q)
        )
      : [...unitGroups];
    switch (sort) {
      case "stars":
        list.sort((a, b) => b.maxStars - a.maxStars || b.maxLevel - a.maxLevel || b.items.length - a.items.length);
        break;
      case "level":
        list.sort((a, b) => b.maxLevel - a.maxLevel || b.maxStars - a.maxStars || b.items.length - a.items.length);
        break;
      case "count":
        list.sort((a, b) => b.items.length - a.items.length || b.maxLevel - a.maxLevel);
        break;
      case "trait":
        // mythic อยู่บนสุดแล้วไล่ tier ลงมา (rank อัตโนมัติ — trait ใหม่ไม่ต้องเพิ่มเอง)
        // ไม่มี trait อยู่ล่างสุด
        list.sort(
          (a, b) =>
            aoTraitRank(dominantTrait(a)) - aoTraitRank(dominantTrait(b)) ||
            b.maxStars - a.maxStars ||
            b.items.length - a.items.length ||
            groupName(a).localeCompare(groupName(b))
        );
        break;
      case "name":
        list.sort((a, b) => groupName(a).localeCompare(groupName(b)));
        break;
      case "rarity":
      default:
        // Evolved อยู่บล็อกแรกเสมอ (เรียง rarity ข้างใน) แล้วค่อยร่างธรรมดา
        list.sort(
          (a, b) =>
            evoRank(b) - evoRank(a) ||
            rarityRank(b.rarity) - rarityRank(a.rarity) ||
            b.maxStars - a.maxStars ||
            b.maxLevel - a.maxLevel ||
            b.items.length - a.items.length ||
            groupName(a).localeCompare(groupName(b))
        );
        break;
    }
    return list;
  }, [unitGroups, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = visible.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <section>
      {/* Header: label + counts + controls */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <i className="fa-solid fa-boxes-stacked text-[10px]"></i>
            Tower Vault
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            <span className="text-base font-black tabular-nums text-white">{unitGroups.length}</span>{" "}
            unique · {totalCount} total
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect
            prefix="Sort:"
            value={sort}
            options={UNIT_SORT_OPTIONS}
            onChange={(v) => { setSort(v as VaultSort); setPage(1); }}
          />
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"></i>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search towers…"
              className="h-9 w-44 rounded-lg border border-line bg-surface pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-accent focus:outline-none sm:w-52"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          {query
            ? `No items match "${query}".`
            : "No towers recorded yet."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {pagedItems.map((g) => {
              const topTrait = dominantTrait(g);
              const st = rarityStyle(g.rarity);
              const name = groupName(g);
              return (
                <div
                  key={`unit-${g.asset}`}
                  onClick={() => onSelectGroup?.(g)}
                  className={`group relative flex flex-col items-center rounded-xl border bg-surface/80 p-3.5 transition-all shadow-sm hover:shadow-md hover:bg-surface hover:border-accent/40 ${onSelectGroup ? "cursor-pointer" : ""} ${st.border}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <RarityBadge rarity={g.rarity} />
                    <span className="min-w-[3ch] rounded-full bg-white/5 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-zinc-300">
                      {g.items.length}
                    </span>
                  </div>
                  <div className="my-3 transition-transform group-hover:scale-105">
                    <AOUnitThumb asset={g.asset} image={g.image} size="lg" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                      <i className="fa-regular fa-eye"></i>
                      View
                    </span>
                  </div>
                  <div className="w-full border-t border-line/50 pt-2.5 text-center">
                    <div className={`truncate text-sm font-bold ${st.text}`} title={`${name} (${g.asset})`}>
                      {name}
                    </div>
                    <div className="mt-0.5 text-xs font-bold tabular-nums text-zinc-400">
                      ★{g.maxStars} · Lv{g.maxLevel}{g.shinyCount > 0 ? ` · ✨${g.shinyCount}` : ""}
                    </div>
                    <div className="mt-0.5 flex h-5 items-center justify-center gap-1 text-[11px] font-bold">
                      {topTrait ? (
                        <span className={`flex max-w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 ${aoTraitPillClass(topTrait)}`} title={topTrait}>
                          <AOTraitIcon trait={topTrait} className="h-3.5 w-3.5" />
                          <span className={`truncate ${aoTraitTextClass(topTrait)}`} style={aoTraitTextStyle(topTrait)}>{topTrait}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </div>
                  </div>
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
