"use client";
import React, { useMemo } from "react";
import type { PlayerData } from "@/shared/lib/types";
import { formatAbbreviated, getBotStatus } from "@/shared/lib/format";
import { Modal } from "@/shared/ui/Modal";
import { AEUnitThumb } from "./AEUnitThumb";
import { AETraitIcon } from "./AETraitIcon";
import { aeDisplayName } from "@/games/animeexpeditions/aeUnitMeta";
import type { AEUnitGroup, AESkinGroup } from "./AEUnitVault";
import { SkinThumb } from "./AEUnitVault";
import { RarityBadge } from "@/shared/ui/Badge";
import { aeTraitPillClass, aeTraitTextClass, aeTraitTextStyle } from "@/games/animeexpeditions/aeTraitImageMap";

export function AEAccountDetailModal({
  player,
  serverTime,
  onClose,
}: {
  player: PlayerData | null;
  serverTime: number;
  onClose: () => void;
}) {
  const units = useMemo(
    () => [...(player?.units || [])].sort((a, b) => (b.level ?? 0) - (a.level ?? 0)),
    [player]
  );
  const currencies = useMemo(() => {
    const list: Array<{ label: string; value: number; cls: string }> = [
      { label: "Gold", value: player?.money ?? 0, cls: "text-amber-300" },
      { label: "Gems", value: player?.gems ?? 0, cls: "text-sky-300" },
    ];
    const extra = player?.currencies || {};
    for (const k of Object.keys(extra).sort()) {
      list.push({ label: k, value: extra[k], cls: "text-zinc-200" });
    }
    return list;
  }, [player]);

  const status = getBotStatus(player?.lastSeen, serverTime);

  return (
    <Modal isOpen={!!player} onClose={onClose} title={player ? player.username : "Account"} maxWidth="max-w-2xl">
      {player && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-line bg-white/[0.03] px-2 py-1 font-semibold text-zinc-300">
              <i className="fa-solid fa-desktop mr-1 text-[10px] text-zinc-500"></i>
              {player.pcName}
            </span>
            <span className="rounded-md border border-violet-500/20 bg-violet-500/[0.07] px-2 py-1 font-bold tabular-nums text-violet-300">
              Lv{player.aeLevel ?? 0} · {formatAbbreviated(player.aeExp ?? 0)} EXP
            </span>
            <span className="rounded-md border border-line bg-white/[0.03] px-2 py-1 font-semibold capitalize text-zinc-400">
              {status}
            </span>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Currencies</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {currencies.map((c) => (
                <div key={c.label} className="rounded-lg border border-line bg-white/[0.02] px-3 py-2">
                  <div className="truncate text-[10px] font-bold uppercase tracking-wider text-zinc-500">{c.label}</div>
                  <div className={`text-sm font-black tabular-nums ${c.cls}`}>{formatAbbreviated(c.value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Units · {player.unitsTotal ?? units.length}
            </div>
            {units.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">No units recorded.</div>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {units.map((u) => (
                  <div key={u.uuid} className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5">
                    <AEUnitThumb asset={u.asset} image={u.image} displayName={u.displayName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-white" title={`${aeDisplayName(u.asset, u.displayName)} (${u.asset})`}>
                      {aeDisplayName(u.asset, u.displayName)}
                    </span>
                    {u.trait && (
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${aeTraitPillClass(u.trait)} ${aeTraitTextClass(u.trait)}`} style={aeTraitTextStyle(u.trait)} title={u.trait}>
                        <AETraitIcon trait={u.trait} className="h-3 w-3" />
                        {u.trait}
                      </span>
                    )}
                    {(u.ascension ?? 0) > 0 && (
                      <span className="shrink-0 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-300">
                        A{u.ascension}
                      </span>
                    )}
                    {u.locked && <i className="fa-solid fa-lock shrink-0 text-[10px] text-zinc-500"></i>}
                    <span className="shrink-0 text-xs font-bold tabular-nums text-violet-300">Lv{u.level}</span>
                    {(u.takedowns ?? 0) > 0 && (
                      <span className="hidden shrink-0 text-[10px] tabular-nums text-zinc-500 sm:inline">
                        {formatAbbreviated(u.takedowns ?? 0)} KOs
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AEUnitDetailModal({
  group,
  onClose,
}: {
  group: AEUnitGroup | null;
  onClose: () => void;
}) {
  const copies = useMemo(
    () => [...(group?.items || [])].sort((a, b) => (b.unit.level ?? 0) - (a.unit.level ?? 0)),
    [group]
  );
  const owners = useMemo(() => new Set((group?.items || []).map((i) => i.account)).size, [group]);

  return (
    <Modal isOpen={!!group} onClose={onClose} title={group ? aeDisplayName(group.asset, group.name) : "Unit"} maxWidth="max-w-xl">
      {group && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AEUnitThumb asset={group.asset} image={group.image} displayName={group.name} />
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                {aeDisplayName(group.asset, group.name)}
                <RarityBadge rarity={group.rarity} />
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-zinc-400">
                ×{group.items.length} copies · {owners} owner{owners === 1 ? "" : "s"} · best Lv{group.maxLevel}
              </div>
            </div>
          </div>
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {copies.map((c) => (
              <div key={`${c.account}-${c.unit.uuid}`} className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white" title={c.account}>
                  {c.account}
                  <span className="ml-1.5 font-semibold text-zinc-500">{c.pc}</span>
                </span>
                {c.unit.trait && (
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${aeTraitPillClass(c.unit.trait)} ${aeTraitTextClass(c.unit.trait)}`} style={aeTraitTextStyle(c.unit.trait)} title={c.unit.trait}>
                    <AETraitIcon trait={c.unit.trait} className="h-3 w-3" />
                    {c.unit.trait}
                  </span>
                )}
                {(c.unit.ascension ?? 0) > 0 && (
                  <span className="shrink-0 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-300">
                    A{c.unit.ascension}
                  </span>
                )}
                <span className="shrink-0 text-xs font-bold tabular-nums text-violet-300">Lv{c.unit.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AESkinDetailModal({
  group,
  onClose,
}: {
  group: AESkinGroup | null;
  onClose: () => void;
}) {
  const copies = useMemo(() => [...(group?.items || [])], [group]);
  const owners = useMemo(() => new Set((group?.items || []).map((i) => i.account)).size, [group]);

  return (
    <Modal isOpen={!!group} onClose={onClose} title={group ? group.asset : "Skin"} maxWidth="max-w-xl">
      {group && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SkinThumb asset={group.asset} />
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                {group.asset}
                <RarityBadge rarity={group.rarity} />
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-zinc-400">
                ×{group.items.length} copies · {owners} owner{owners === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {copies.map((c) => (
              <div key={`${c.account}-${c.skin.uuid}`} className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white" title={c.account}>
                  {c.account}
                  <span className="ml-1.5 font-semibold text-zinc-500">{c.pc}</span>
                </span>
                <i className="fa-solid fa-shirt shrink-0 text-[10px] text-zinc-500"></i>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
