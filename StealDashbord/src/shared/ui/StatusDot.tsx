"use client";
import React from "react";
import type { BotStatus } from "@/shared/lib/types";

interface StatusDotProps {
  status: BotStatus;
  ping?: boolean;
}

export function StatusDot({ status, ping = true }: StatusDotProps) {
  if (status === "online") {
    return (
      <span
        className={`inline-block h-2 w-2 rounded-full bg-emerald-400 ${
          ping ? "live-dot shadow-[0_0_6px_rgba(52,211,153,0.6)]" : ""
        }`}
      />
    );
  }

  if (status === "idle") {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-amber-400 opacity-80" />
    );
  }

  return (
    <span className="inline-block h-2 w-2 rounded-full bg-rose-500 opacity-60" />
  );
}
