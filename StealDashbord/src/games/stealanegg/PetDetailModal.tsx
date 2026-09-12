"use client";
import React, { useState, useMemo } from "react";
import { Modal } from "@/shared/ui/Modal";
import { formatRate, formatHatchTime, liveRemaining } from "@/shared/lib/format";
import { rarityStyle } from "@/shared/lib/rarity";
import { useCachedImage } from "@/games/stealanegg/useCachedImage";
import { useNow } from "@/shared/hooks/useNow";
import type { PetData } from "@/shared/lib/types";

interface PetDetailModalProps {
  data: {
    category: string;
    rarity?: string;
    items: Array<{ pet: PetData; account: string; pc: string; lastSeen?: number; updatedAt?: number }>;
  } | null;
  onClose: () => void;
}

type ItemRow = { pet: PetData; account: string; pc: string; lastSeen?: number; updatedAt?: number };
type ModalSort = "account" | "pc" | "status" | "mutation" | "rate" | "weight";
type ModalDir = "asc" | "desc";

const MUTATION_STYLES: Record<string, string> = {
  RAINBOW: "bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white border-transparent",
  GOLDEN: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  SILVER: "bg-zinc-700/60 text-zinc-200 border-zinc-600/60",
  SAKURA: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  MONSTROUS: "bg-red-500/15 text-red-300 border-red-500/30",
};

function mutationStyle(m?: string | null): string {
  if (!m) return "bg-zinc-800 text-zinc-400 border-zinc-700";
  return MUTATION_STYLES[String(m).toUpperCase()] ?? "bg-zinc-800 text-zinc-300 border-zinc-700";
}

function PetModalThumb({ icon, label, isEgg }: { icon?: string; label: string; isEgg?: boolean }) {
  const { loaded, onImgError } = useCachedImage(icon, label, isEgg);
  if (!loaded) {
    return <span className="grid h-16 w-16 place-items-center rounded-xl bg-surface border border-line text-xl font-black text-zinc-500">{label.charAt(0)}</span>;
  }
  return <img src={loaded} onError={onImgError} alt={label} className="h-16 w-16 object-contain drop-shadow-md" />;
}

function MutationCell({ mutations }: { mutations?: string[] }) {
  if (!mutations || mutations.length === 0) {
    return <span className="text-zinc-600">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${mutationStyle(mutations[0])}`}>
        {String(mutations[0])}
      </span>
      {mutations.length > 1 && (
        <span className="text-[10px] font-bold text-zinc-500">+{mutations.length - 1}</span>
      )}
    </span>
  );
}

function splitRate(text: string): [string, string] {
  return text.endsWith("/s") ? [text.slice(0, -2), "/s"] : [text, ""];
}

function MHead({
  k, icon, label, sortKey, sortDir, onToggle,
}: {
  k: ModalSort; icon: string; label: string;
  sortKey: ModalSort | null; sortDir: ModalDir;
  onToggle: (k: ModalSort) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="p-2.5 text-[10px] font-bold uppercase tracking-wider">
      <button
        onClick={() => onToggle(k)}
        className={`inline-flex items-center gap-1 transition-colors ${active ? "text-zinc-200" : "text-zinc-400 hover:text-zinc-200"}`}
      >
        <i className={`fa-solid ${icon} text-[10px]`}></i>
        {label}
        <i className={`fa-solid ${active ? (sortDir === "asc" ? "fa-sort-up" : "fa-sort-down") : "fa-sort"} text-[9px] ${active ? "text-accent" : "text-zinc-600"}`}></i>
      </button>
    </th>
  );
}

export function PetDetailModal({ data, onClose }: PetDetailModalProps) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState<ModalSort | null>(null);
  const [sortDir, setSortDir] = useState<ModalDir>("desc");
  const now = useNow(1000);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (it) => it.account.toLowerCase().includes(q) || it.pc.toLowerCase().includes(q)
    );
  }, [data, search]);

  const rows = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    const keyOf = (it: ItemRow): string | number => {
      switch (sortKey) {
        case "account":
          return it.account.toLowerCase();
        case "pc":
          return it.pc.toLowerCase();
        case "mutation":
          return (it.pet.mutations?.[0] ?? "").toLowerCase();
        case "rate":
          return it.pet.ratePerSecond ?? 0;
        case "weight":
          return it.pet.weight ?? Math.floor(1e4 * (it.pet.scale || 1));
        case "status": {
          const r = liveRemaining(it.pet.remaining, it.updatedAt, now);
          if (r != null) return r;
          return it.pet.isEquipped ? Number.MAX_SAFE_INTEGER : -1;
        }
      }
    };
    return [...filtered].sort((a, b) => {
      const ka = keyOf(a);
      const kb = keyOf(b);
      if (typeof ka === "string") return ka.localeCompare(String(kb)) * dir;
      return ((ka as number) - (kb as number)) * dir;
    });
  }, [filtered, sortKey, sortDir, now]);

  if (!data) return null;

  const firstPet = data.items[0]?.pet;
  const isEgg = !!firstPet?.isEgg;
  const accountCount = new Set(data.items.map((it) => `${it.account}/${it.pc}`)).size;

  const toggleSort = (k: ModalSort) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "account" || k === "pc" || k === "mutation" ? "asc" : "desc");
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(
        filtered.map((it) => `${it.account} (${it.pc})`).join("\n")
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Modal isOpen={!!data} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Header: thumb + title + type + stat pills */}
        <div className="flex items-center gap-4">
          <div className={`shrink-0 rounded-xl border-2 bg-surface p-1 ${rarityStyle(data.rarity).border}`}>
            <PetModalThumb icon={firstPet?.icon} label={data.category} isEgg={firstPet?.isEgg} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-2xl font-black text-white">{data.category}</h3>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                isEgg
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300"
              }`}>
                {isEgg ? "Eggs" : "Pets"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-lg border border-line bg-surface px-2.5 py-1">
                <span className="font-black text-white">{accountCount}</span> account{accountCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-lg border border-line bg-surface px-2.5 py-1">
                <span className="font-black text-white">{data.items.length}</span> {isEgg ? "Eggs" : "Pets"}
              </span>
            </div>
          </div>
        </div>

        {/* Search + Copy all */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-line bg-surface pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-accent focus:outline-none"
            />
          </div>
          <button
            onClick={copyAll}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-transparent px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 transition-colors"
          >
            <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-[11px]`}></i>
            {copied ? "Copied" : "Copy all"}
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-line bg-surface/90 backdrop-blur text-zinc-400">
              <tr>
                <th className="w-8 p-2.5"></th>
                <MHead k="account" icon="fa-user" label="Account" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                <MHead k="pc" icon="fa-desktop" label="PC" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                <MHead k="status" icon="fa-circle" label="Status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                <MHead k="mutation" icon="fa-dna" label="Mutation" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                <MHead k="rate" icon="fa-bolt" label="Rate" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                <MHead k="weight" icon="fa-weight-hanging" label="Weight" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 bg-black/20">
              {rows.map((it, idx) => {
                const [rv, rs] = splitRate(formatRate(it.pet.ratePerSecond));
                return (
                <tr key={`${it.account}-${it.pc}-${idx}`} className="hover:bg-white/[0.02]">
                  <td className="p-2.5 pl-3 text-[11px] text-zinc-600">{idx + 1}</td>
                  <td className="p-2.5">
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <i className="fa-solid fa-user text-[10px] text-zinc-500"></i>
                      {it.account}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="text-zinc-400 flex items-center gap-1.5 font-mono text-[11px]">
                      <i className="fa-solid fa-desktop text-[10px] text-zinc-500"></i>
                      {it.pc}
                    </div>
                  </td>
                  <td className="p-2.5">
                    {it.pet.remaining != null ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-sky-300">
                        <i className="fa-regular fa-clock text-[10px]"></i>
                        {formatHatchTime(liveRemaining(it.pet.remaining, it.updatedAt, now))}
                      </span>
                    ) : it.pet.isEquipped ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        EQUIPPED
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[10px]">In Bag</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <MutationCell mutations={it.pet.mutations} />
                  </td>
                  <td className="p-2.5 font-black tabular-nums text-amber-400">
                    {rv}
                    {rs && <span className="text-[10px] font-bold text-amber-400/60">{rs}</span>}
                  </td>
                  <td className="p-2.5 font-bold tabular-nums text-white">
                    {(it.pet.weight ?? Math.floor(Math.pow(it.pet.scale || 1, 3) * 60000)).toLocaleString()}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] tabular-nums text-zinc-500">
          Showing <span className="font-bold text-zinc-300">1–{rows.length}</span> of {data.items.length}
        </div>
      </div>
    </Modal>
  );
}
