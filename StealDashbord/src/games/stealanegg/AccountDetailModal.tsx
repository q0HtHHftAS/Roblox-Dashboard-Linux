"use client";
import React from "react";
import { Modal } from "@/shared/ui/Modal";
import type { PlayerData } from "@/shared/lib/types";
import { formatMoneyAbbreviated, formatRate, formatHatchTime, liveRemaining, getBotStatus } from "@/shared/lib/format";
import { BotStatusBadge, RarityBadge } from "@/shared/ui/Badge";
import { useCachedImage } from "@/games/stealanegg/useCachedImage";
import { useNow } from "@/shared/hooks/useNow";

interface AccountDetailModalProps {
  player: PlayerData | null;
  serverTime: number;
  onClose: () => void;
}

function AccountPetThumb({ icon, label, isEgg }: { icon?: string; label: string; isEgg?: boolean }) {
  const { loaded, onImgError } = useCachedImage(icon, label, isEgg);
  if (!loaded) {
    return <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface border border-line text-xs font-bold text-zinc-500">{label.charAt(0)}</span>;
  }
  return <img src={loaded} onError={onImgError} alt={label} className="h-10 w-10 object-contain drop-shadow" />;
}

export function AccountDetailModal({ player, serverTime, onClose }: AccountDetailModalProps) {
  const now = useNow(1000);
  if (!player) return null;

  const status = getBotStatus(player.lastSeen, serverTime);
  const equipped = player.pets || [];
  const inventory = player.inventory || [];
  const backpack = inventory.filter((pet) => !pet.isEquipped);
  const eggs = player.eggsList || [];

  return (
    <Modal isOpen={!!player} onClose={onClose} title="Account Inspection" maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Header Profile */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 border border-accent/20 text-xl font-black text-accent">
              {player.username.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{player.username}</h3>
                <BotStatusBadge status={status} />
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-zinc-300">
                  {player.pcName || "PC-001"}
                </span>
                {player.plotId && <span>Plot: {player.plotId}</span>}
                {player.userId && (
                  <span className="text-zinc-500 font-mono">UID: {player.userId}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-black tabular-nums text-white">
              ${formatMoneyAbbreviated(player.money ?? 0)}
            </div>
            <div className="text-xs font-bold tabular-nums text-amber-400">
              {formatRate(player.moneyPerSec ?? 0)}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-line bg-black/20 p-3">
            <span className="text-zinc-500">Base Level</span>
            <div className="mt-1 text-sm font-bold tabular-nums text-white">Lv {player.baseLevel ?? 1}</div>
          </div>
          <div className="rounded-xl border border-line bg-black/20 p-3">
            <span className="text-zinc-500">Equipped Capacity</span>
            <div className="mt-1 text-sm font-bold tabular-nums text-white">
              {player.capacity ?? 0} / {player.maxCapacity ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-black/20 p-3">
            <span className="text-zinc-500">Speed Power</span>
            <div className="mt-1 text-sm font-bold text-sky-400">
              {formatMoneyAbbreviated(player.speedPower ?? 0)} sp
            </div>
          </div>
          <div className="rounded-xl border border-line bg-black/20 p-3">
            <span className="text-zinc-500">Eggs In Bag</span>
            <div className="mt-1 text-sm font-bold text-emerald-400">
              {player.eggsInBag ?? 0}
            </div>
          </div>
        </div>

        {/* Equipped Pets */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center justify-between">
            <span>Equipped Pets ({equipped.length})</span>
            <span className="text-[11px] text-zinc-500 lowercase font-normal">ranked by rate</span>
          </h4>

          {equipped.length === 0 ? (
            <div className="rounded-xl border border-line bg-black/20 py-6 text-center text-xs text-zinc-500">
              No pets equipped
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
              {equipped.map((pet, idx) => (
                <div
                  key={pet.uuid || idx}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/70 p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <AccountPetThumb icon={pet.icon} label={pet.name} isEgg={pet.isEgg} />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {pet.name}
                        <RarityBadge rarity={pet.rarity} />
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-zinc-500">
                        Weight: {(pet.weight ?? Math.floor(Math.pow(pet.scale || 1, 3) * 60000)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums text-amber-400">
                      {formatRate(pet.ratePerSecond)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eggs in incubation if any */}
        {eggs.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Eggs In Incubator ({eggs.length})
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto pr-1">
              {eggs.map((egg, idx) => (
                <div
                  key={egg.uuid || idx}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/70 p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <AccountPetThumb icon={egg.icon} label={egg.name} isEgg />
                    <span className="font-bold text-white">{egg.name}</span>
                  </div>
                  <span className="font-mono tabular-nums text-sky-400 font-bold">
                    {formatHatchTime(liveRemaining(egg.remaining, player.lastUpdated, now))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backpack (unequipped inventory) */}
        {backpack.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Backpack — Unequipped ({backpack.length})
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto pr-1">
              {backpack.map((pet, idx) => (
                <div
                  key={pet.uuid || idx}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/70 p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <AccountPetThumb icon={pet.icon} label={pet.name} isEgg={pet.isEgg} />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {pet.name}
                        <RarityBadge rarity={pet.rarity} />
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-zinc-500">
                        Weight: {(pet.weight ?? Math.floor(Math.pow(pet.scale || 1, 3) * 60000)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums text-amber-400">
                      {formatRate(pet.ratePerSecond)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
