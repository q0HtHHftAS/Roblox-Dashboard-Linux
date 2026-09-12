"use client";
import React, { useState, useMemo, useEffect } from "react";
import type { PlayerData, AEUnitData, AESkinData } from "@/shared/lib/types";
import { rarityStyle, rarityRank } from "@/shared/lib/rarity";
import {
  aeDisplayName,
  aeIsEvo,
  persistAEUnitRarities,
  resolveAEUnitRarity,
} from "@/games/animeexpeditions/aeUnitMeta";
import { aeSkinRarity, aeSkinImageFor } from "@/games/animeexpeditions/aeSkinMap";
import { aeTraitTextClass, aeTraitTextStyle, aeTraitRank } from "@/games/animeexpeditions/aeTraitImageMap";
import { AEUnitThumb } from "./AEUnitThumb";
import { AETraitIcon } from "./AETraitIcon";
import { RarityBadge } from "@/shared/ui/Badge";
import { CustomSelect } from "@/shared/ui/CustomSelect";

export interface AEUnitGroupItem {
  unit: AEUnitData;
  account: string;
  pc: string;
}

export interface AEUnitGroup {
  asset: string;
  // ชื่อโชว์ (displayName จากเกม ถ้ามี) + รูปตัวแทน — เติมอัตโนมัติตอนรวมกลุ่ม
  name?: string;
  image?: string | null;
  rarity?: string;
  items: AEUnitGroupItem[];
  maxLevel: number;
}

export interface AESkinGroupItem {
  skin: AESkinData;
  account: string;
  pc: string;
}

export interface AESkinGroup {
  asset: string;
  rarity?: string;
  items: AESkinGroupItem[];
}

interface AEUnitVaultProps {
  players: PlayerData[];
  onSelectGroup?: (group: AEUnitGroup) => void;
  onSelectSkin?: (group: AESkinGroup) => void;
}

type VaultTab = "units" | "skins";
type VaultSort = "rarity" | "level" | "count" | "name" | "trait";

const UNIT_SORT_OPTIONS = [
  { value: "rarity", label: "Rarity", icon: "fa-layer-group" },
  { value: "level", label: "Top level", icon: "fa-arrow-trend-up" },
  { value: "trait", label: "Trait", icon: "fa-wand-magic-sparkles" },
  { value: "name", label: "Name", icon: "fa-arrow-down-a-z" },
];

const SKIN_SORT_OPTIONS = [
  { value: "rarity", label: "Rarity", icon: "fa-layer-group" },
  { value: "count", label: "Most owned", icon: "fa-boxes-stacked" },
  { value: "name", label: "Name", icon: "fa-arrow-down-a-z" },
];

const itemsPerPage = 24;

// รูป skin (wiki render, local `public/ae-skins/`) — ไม่มีรูป/โหลดพลาดโชว์ตัวอักษรแทน
export function SkinThumb({ asset }: { asset: string }) {
  const src = aeSkinImageFor(asset);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-xl font-black text-zinc-400">
        {asset.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={src}
      onError={() => setFailed(true)}
      alt={asset}
      loading="lazy"
      className="h-20 w-20 shrink-0 rounded-lg border border-line bg-white/[0.03] object-contain p-0.5 drop-shadow"
    />
  );
}

export function AEUnitVault({ players, onSelectGroup, onSelectSkin }: AEUnitVaultProps) {
  const [tab, setTab] = useState<VaultTab>("units");
  const [sort, setSort] = useState<VaultSort>("rarity");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const unitGroups = useMemo(() => {
    const map = new Map<string, AEUnitGroup>();
    for (const p of players) {
      for (const u of p.units || []) {
        let e = map.get(u.asset);
        if (!e) {
          e = { asset: u.asset, name: undefined, image: null, rarity: undefined, items: [], maxLevel: 0 };
          map.set(u.asset, e);
        }
        e.items.push({ unit: u, account: p.username, pc: p.pcName });
        // ชื่อ/รูปจากเกม (Lua อ่าน Information.Assets) — เจอตัวแรกก็จำไว้ใช้ทั้งกลุ่ม
        if (!e.name && typeof u.displayName === "string" && u.displayName.trim()) {
          e.name = u.displayName.trim().slice(0, 64);
        }
        if (!e.image && typeof u.image === "string" && u.image.trim()) {
          e.image = u.image.trim().slice(0, 96);
        }
        // rarity แบบ auto: payload > static map > สืบทอด EVO > ค่าที่เคยจำไว้ (ดู aeUnitMeta)
        const r = resolveAEUnitRarity(u.asset, u.rarity);
        if (!e.rarity && r) e.rarity = r;
        if ((u.level ?? 0) > e.maxLevel) e.maxLevel = u.level ?? 0;
      }
    }
    return Array.from(map.values());
  }, [players]);

  // เขียน rarity ที่เรียนรู้จาก payload ลง localStorage — เปิดมาครั้งหน้าก็ยังจำได้
  useEffect(() => {
    persistAEUnitRarities();
  }, [players]);

  const skinGroups = useMemo(() => {
    const map = new Map<string, AESkinGroup>();
    for (const p of players) {
      for (const s of p.skins || []) {
        const asset = s.asset || "Unknown";
        let e = map.get(asset);
        if (!e) {
          e = { asset, rarity: aeSkinRarity(asset), items: [] };
          map.set(asset, e);
        }
        e.items.push({ skin: s, account: p.username, pc: p.pcName });
      }
    }
    return Array.from(map.values());
  }, [players]);

  const isUnits = tab === "units";
  const tabGroups = isUnits ? unitGroups : skinGroups;
  const totalCount = useMemo(
    () => tabGroups.reduce((s, g) => s + g.items.length, 0),
    [tabGroups]
  );

  // ร่าง EVO อยู่สูงกว่าร่างธรรมดาเสมอ (รวมชื่อเฉพาะอย่าง GriffithFemto/GriffithSilver
  // ที่เป็นร่าง EVO ของ Griffith แต่ชื่อไม่ลงท้ายด้วย EVO — ดู aeIsEvo)
  const evoRank = (g: AEUnitGroup) => (aeIsEvo(g.asset) ? 1 : 0);

  // trait ที่พบบ่อยสุดในกลุ่ม (เสมอกันเอาตัวเวลสูงสุด) — ใช้โชว์บนการ์ด + sort "Trait"
  const dominantTrait = (g: AEUnitGroup): string | null => {
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

  // ชื่อโชว์สำหรับค้นหา/เรียง (ยูนิตใช้ displayName จากเกม ถ้าไม่มีก็ pretty อัตโนมัติ)
  const groupLabel = (g: AEUnitGroup | AESkinGroup): string =>
    aeDisplayName(g.asset, (g as AEUnitGroup).name);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // ค้นได้ทั้งชื่อดิบในเกมและชื่อโชว์ ("guts" เจอทั้ง Guts และ GutsEVO)
    const list = q
      ? tabGroups.filter(
          (g) =>
            g.asset.toLowerCase().includes(q) ||
            groupLabel(g).toLowerCase().includes(q)
        )
      : [...tabGroups];
    if (isUnits) {
      const ulist = list as AEUnitGroup[];
      switch (sort) {
        case "level":
          ulist.sort((a, b) => b.maxLevel - a.maxLevel || b.items.length - a.items.length);
          break;
        case "count":
          ulist.sort((a, b) => b.items.length - a.items.length || b.maxLevel - a.maxLevel);
          break;
        case "trait":
          // เริ่ม Unbound ลงไปตาม tier (ไม่มี trait อยู่ล่างสุด) เสมอกันดูเวล/จำนวน/ชื่อ
          ulist.sort(
            (a, b) =>
              aeTraitRank(dominantTrait(a)) - aeTraitRank(dominantTrait(b)) ||
              b.maxLevel - a.maxLevel ||
              b.items.length - a.items.length ||
              a.asset.localeCompare(b.asset)
          );
          break;
        case "name":
          ulist.sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
          break;
        case "rarity":
        default:
          // EVO อยู่บล็อกแรกเสมอ (เรียง rarity ข้างใน) แล้วค่อยร่างธรรมดา —
          // Secret ธรรมดาจึงอยู่ต่ำกว่า Mythic EVO; ไม่รู้ rarity ตกไปล่างสุดของบล็อกตัวเอง
          ulist.sort(
            (a, b) =>
              evoRank(b) - evoRank(a) ||
              rarityRank(b.rarity) - rarityRank(a.rarity) ||
              b.maxLevel - a.maxLevel ||
              b.items.length - a.items.length ||
              a.asset.localeCompare(b.asset)
          );
          break;
      }
      return ulist;
    }
    const slist = list as AESkinGroup[];
    if (sort === "name") slist.sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
    else if (sort === "count") slist.sort((a, b) => b.items.length - a.items.length || a.asset.localeCompare(b.asset));
    else slist.sort(
      (a, b) =>
        rarityRank(b.rarity) - rarityRank(a.rarity) ||
        b.items.length - a.items.length ||
        a.asset.localeCompare(b.asset)
    );
    return slist;
  }, [tabGroups, query, sort, isUnits]);

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = visible.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const ownerCount = (g: AEUnitGroup | AESkinGroup) => new Set(g.items.map((i) => i.account)).size;

  function switchTab(t: VaultTab) {
    setTab(t);
    setPage(1);
    // sort เริ่มต้นของแต่ละ tab (rarity ทั้งคู่ — skins ไม่มี level)
    setSort("rarity");
  }

  return (
    <section>
      {/* Header: label + counts + controls */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <i className="fa-solid fa-boxes-stacked text-[10px]"></i>
            Unit Vault
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
            options={isUnits ? UNIT_SORT_OPTIONS : SKIN_SORT_OPTIONS}
            onChange={(v) => { setSort(v as VaultSort); setPage(1); }}
          />
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"></i>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={isUnits ? "Search units…" : "Search skins…"}
              className="h-9 w-44 rounded-lg border border-line bg-surface pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-accent focus:outline-none sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Units / Skins tabs */}
      <div className="mb-4 flex items-center gap-5 border-b border-line/60 text-sm font-bold">
        <button
          onClick={() => switchTab("units")}
          className={`flex items-center gap-1.5 pb-2 -mb-px transition-colors ${
            isUnits
              ? "text-white border-b-2 border-accent"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <i className="fa-solid fa-users text-xs"></i>
          Units
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
            {unitGroups.length}
          </span>
        </button>
        <button
          onClick={() => switchTab("skins")}
          className={`flex items-center gap-1.5 pb-2 -mb-px transition-colors ${
            !isUnits
              ? "text-white border-b-2 border-accent"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <i className="fa-solid fa-shirt text-xs"></i>
          Skins
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
            {skinGroups.length}
          </span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          {query
            ? `No items match "${query}".`
            : isUnits
              ? "No units recorded yet."
              : "No skins recorded yet — update the script in-game to start syncing."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {pagedItems.map((g) => {
              if (isUnits) {
                const ug = g as AEUnitGroup;
                const st = rarityStyle(ug.rarity);
                const topTrait = dominantTrait(ug);
                const label = groupLabel(ug);
                return (
                  <div
                    key={`unit-${ug.asset}`}
                    onClick={() => onSelectGroup?.(ug)}
                    className={`group relative flex flex-col items-center rounded-xl border bg-surface/80 p-3.5 transition-all shadow-sm hover:shadow-md hover:bg-surface ${onSelectGroup ? "cursor-pointer" : ""} ${st.border}`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <RarityBadge rarity={ug.rarity} />
                      <span className="min-w-[3ch] rounded-full bg-white/5 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-zinc-300">
                        {ug.items.length}
                      </span>
                    </div>
                    <div className="my-3 transition-transform group-hover:scale-105">
                      <AEUnitThumb asset={ug.asset} image={ug.image} displayName={ug.name} size="lg" />
                    </div>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                        <i className="fa-regular fa-eye"></i>
                        View
                      </span>
                    </div>
                    <div className="w-full border-t border-line/50 pt-2.5 text-center">
                      <div className={`truncate text-sm font-bold ${st.text}`} title={`${label} (${ug.asset})`}>
                        {label}
                      </div>
                      <div className="mt-0.5 text-xs font-bold tabular-nums text-zinc-400">
                        Lv{ug.maxLevel}
                      </div>
                      <div className="mt-0.5 flex h-5 items-center justify-center gap-1 text-[11px] font-bold">
                        {topTrait ? (
                          <>
                            <AETraitIcon trait={topTrait} className="h-5 w-5" />
                            <span className={`truncate ${aeTraitTextClass(topTrait)}`} style={aeTraitTextStyle(topTrait)} title={topTrait}>{topTrait}</span>
                          </>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              const sg = g as AESkinGroup;
              const sst = rarityStyle(sg.rarity);
              const oc = ownerCount(sg);
              return (
                <div
                  key={`skin-${sg.asset}`}
                  onClick={() => onSelectSkin?.(sg)}
                  className={`group relative flex flex-col items-center rounded-xl border bg-surface/80 p-3.5 transition-all shadow-sm hover:shadow-md hover:bg-surface ${onSelectSkin ? "cursor-pointer" : ""} ${sst.border}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <RarityBadge rarity={sg.rarity} />
                    <span className="min-w-[3ch] rounded-full bg-white/5 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-zinc-300">
                      {sg.items.length}
                    </span>
                  </div>
                  <div className="my-3 transition-transform group-hover:scale-105">
                    <SkinThumb asset={sg.asset} />
                  </div>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                      <i className="fa-regular fa-eye"></i>
                      View
                    </span>
                  </div>
                  <div className="w-full border-t border-line/50 pt-2.5 text-center">
                    <div className={`truncate text-sm font-bold ${sst.text}`} title={sg.asset}>
                      {sg.asset}
                    </div>
                    <div className="mt-0.5 text-xs font-bold tabular-nums text-zinc-400">
                      ×{sg.items.length}
                    </div>
                    <div className="mt-0.5 text-[10px] tabular-nums text-zinc-600">
                      {oc} owner{oc === 1 ? "" : "s"}
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
