"use client";
import React, { useMemo } from "react";
import { Modal } from "@/shared/ui/Modal";
import { formatAbbreviatedTrim } from "@/shared/lib/format";
import type { AOCurrencyEntry } from "./aoCurrencies";

interface AOCurrencyPickerProps {
  open: boolean;
  onClose: () => void;
  entries: AOCurrencyEntry[];
  trackedIds: string[];
  onToggle: (id: string) => void;
}

// Modal เลือก currency เข้า overview: แถวที่ track อยู่โชว์ × แดง (กดเอาออก) ที่เหลือโชว์ + เทา (กดเพิ่ม)
export function AOCurrencyPicker({ open, onClose, entries, trackedIds, onToggle }: AOCurrencyPickerProps) {
  const trackedPos = useMemo(() => new Map(trackedIds.map((id, i) => [id, i])), [trackedIds]);
  const rows = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ai = trackedPos.has(a.id) ? (trackedPos.get(a.id) as number) : Number.POSITIVE_INFINITY;
      const bi = trackedPos.has(b.id) ? (trackedPos.get(b.id) as number) : Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return a.label.localeCompare(b.label);
    });
  }, [entries, trackedPos]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Track currencies" maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((e) => {
          const tracked = trackedPos.has(e.id);
          return (
            <div
              key={e.id}
              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface/60 px-2.5 py-2"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg">
                {e.img ? (
                  <img src={e.img} alt={e.label} className="h-9 w-9 object-contain" loading="lazy" draggable={false} />
                ) : (
                  <i className="fa-solid fa-coins text-base text-zinc-400"></i>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-white" title={e.label}>
                  {e.label}
                </div>
                <div className="truncate text-[11px] font-semibold tabular-nums text-zinc-500">
                  {formatAbbreviatedTrim(e.total)} Owned
                </div>
              </div>
              <button
                onClick={() => onToggle(e.id)}
                title={tracked ? `Untrack ${e.label}` : `Track ${e.label}`}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-sm transition-colors ${
                  tracked
                    ? "border-red-500/40 bg-red-500/80 text-white hover:bg-red-500"
                    : "border-line bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                <i className={`fa-solid ${tracked ? "fa-xmark" : "fa-plus"}`}></i>
              </button>
            </div>
          );
        })}
      </div>
      {rows.length === 0 && (
        <p className="py-6 text-center text-xs text-zinc-500">No currency data yet — run the script in-game first.</p>
      )}
    </Modal>
  );
}
