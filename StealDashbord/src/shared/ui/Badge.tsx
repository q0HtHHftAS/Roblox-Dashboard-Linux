"use client";
import React from "react";
import type { BotStatus } from "@/shared/lib/types";
import { StatusDot } from "./StatusDot";
import { rarityStyle } from "@/shared/lib/rarity";

interface BotStatusBadgeProps {
  status: BotStatus;
  label?: string;
}

export function BotStatusBadge({ status, label }: BotStatusBadgeProps) {
  const styles = {
    online: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    idle: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    offline: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  const defaultLabels = {
    online: "ONLINE",
    idle: "IDLE",
    offline: "OFFLINE",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wide ${styles[status]}`}
    >
      <StatusDot status={status} ping={status === "online"} />
      {label || defaultLabels[status]}
    </span>
  );
}

export function RarityBadge({ rarity }: { rarity?: string }) {
  if (!rarity) return null;
  const cls = rarityStyle(rarity).badge;

  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cls}`}>
      {rarity.toUpperCase()}
    </span>
  );
}
