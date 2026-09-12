"use client";
import { useState, useMemo } from "react";
import type { PlayerData, BotStatus } from "@/shared/lib/types";
import { getBotStatus } from "@/shared/lib/format";

export type SortField =
  | "money"
  | "moneyPerSec"
  | "speedPower"
  | "baseLevel"
  | "capacity"
  | "username"
  | "lastSeen"
  | "status"
  | "pc"
  | "petsRate"
  | "eggsRate"
  | "totalRate"
  | "aeLevel"
  | "aoExp"
  | "gems"
  | "traitReroll"
  | "unitsTotal";
export type SortDirection = "asc" | "desc";

function statusRank(lastSeen: unknown, serverTime: number): number {
  const st = getBotStatus(typeof lastSeen === "number" ? lastSeen : undefined, serverTime);
  return st === "online" ? 0 : st === "idle" ? 1 : 2;
}

function equippedSum(p: PlayerData): number {
  return (p.pets || []).reduce((s, pet) => s + (pet.ratePerSecond ?? 0), 0);
}

export function useDashboardFilters(
  players: PlayerData[],
  serverTime: number,
  initial?: { sortField?: SortField; sortDir?: SortDirection }
) {
  const [search, setSearch] = useState("");
  const [pcFilter, setPcFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BotStatus>("all");
  const [sortField, setSortField] = useState<SortField | null>(initial?.sortField ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(initial?.sortDir ?? "desc");

  // Get unique list of PC names
  const pcNames = useMemo(() => {
    const s = new Set<string>();
    for (const p of players) {
      if (p.pcName) s.add(p.pcName);
    }
    return Array.from(s).sort();
  }, [players]);

  // Filtered and sorted players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        // Search
        if (search) {
          const q = search.toLowerCase();
          const matchUser = p.username.toLowerCase().includes(q);
          const matchDisplay = p.displayName?.toLowerCase().includes(q);
          const matchPc = p.pcName?.toLowerCase().includes(q);
          if (!matchUser && !matchDisplay && !matchPc) return false;
        }
        // PC filter
        if (pcFilter !== "all" && p.pcName !== pcFilter) {
          return false;
        }
        // Status filter ("online" รวม idle — หน้า UI มีแค่ All/Online/Offline)
        if (statusFilter !== "all") {
          const status = getBotStatus(p.lastSeen, serverTime);
          if (statusFilter === "online") {
            if (status === "offline") return false;
          } else if (status !== statusFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // ยังไม่กด sort หัวไหนเลย = คงลำดับข้อมูลดิบตามที่ ingest มา
        if (!sortField) return 0;
        if (sortField === "username" || sortField === "pc") {
          const cmp = String(
            (sortField === "pc" ? a.pcName : a.username) || ""
          ).localeCompare(
            String((sortField === "pc" ? b.pcName : b.username) || "")
          );
          return sortDir === "asc" ? cmp : -cmp;
        }

        let valA: number;
        let valB: number;
        switch (sortField) {
          case "status":
            valA = statusRank(a.lastSeen, serverTime);
            valB = statusRank(b.lastSeen, serverTime);
            break;
          case "petsRate":
            valA = equippedSum(a);
            valB = equippedSum(b);
            break;
          case "eggsRate":
            valA = Number(a.eggsPerSec ?? 0);
            valB = Number(b.eggsPerSec ?? 0);
            break;
          case "totalRate":
            valA = equippedSum(a) + Number(a.eggsPerSec ?? 0);
            valB = equippedSum(b) + Number(b.eggsPerSec ?? 0);
            break;
          case "traitReroll":
            valA = Number(a.currencies?.TraitReroll ?? 0);
            valB = Number(b.currencies?.TraitReroll ?? 0);
            break;
          default:
            valA = Number(a[sortField] ?? 0);
            valB = Number(b[sortField] ?? 0);
            break;
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
      });
  }, [players, search, pcFilter, statusFilter, sortField, sortDir, serverTime]);

  // Summary counts
  const counts = useMemo(() => {
    let online = 0;
    let idle = 0;
    let offline = 0;
    for (const p of players) {
      const st = getBotStatus(p.lastSeen, serverTime);
      if (st === "online") online++;
      else if (st === "idle") idle++;
      else offline++;
    }
    return {
      total: players.length,
      online,
      idle,
      offline,
      live: online + idle,
      pcs: pcNames.length,
    };
  }, [players, pcNames, serverTime]);

  return {
    search,
    setSearch,
    pcFilter,
    setPcFilter,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    pcNames,
    filteredPlayers,
    counts,
  };
}
