"use client";
import React from "react";
import { Modal } from "@/shared/ui/Modal";
import type { GameItem } from "./GameCard";

interface ComingSoonModalProps {
  game: GameItem | null;
  onClose: () => void;
}

export function ComingSoonModal({ game, onClose }: ComingSoonModalProps) {
  if (!game) return null;

  return (
    <Modal isOpen={!!game} onClose={onClose} title={game.name}>
      <div className="flex flex-col items-center py-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 border border-accent/25 text-3xl text-accent mb-4">
          <i className={`fa-solid ${game.icon}`}></i>
        </div>
        <h4 className="text-lg font-bold text-white">{game.name} Dashboard</h4>
        <p className="mt-2 text-sm text-zinc-400 max-w-sm">
          Support for {game.name} is currently under active development. Lua bridge integration and custom metrics are coming in the next release.
        </p>

        <div className="mt-6 w-full rounded-xl border border-line bg-white/[0.02] p-4 text-left text-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span>Status</span>
            <span className="font-bold text-amber-400">{game.badge}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Primary Active Game</span>
            <span className="font-bold text-emerald-400">Steal An Egg</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-white/10 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
        >
          Back to Hub
        </button>
      </div>
    </Modal>
  );
}
