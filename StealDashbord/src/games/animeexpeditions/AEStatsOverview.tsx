"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerData } from "@/shared/lib/types";
import { formatAbbreviatedTrim } from "@/shared/lib/format";
import { AECurrencyPicker } from "./AECurrencyPicker";
import {
  AE_DEFAULT_CARDS,
  AE_OVERVIEW_CARDS_KEY,
  collectAECurrencies,
  defaultCardOrder,
  type AECurrencyEntry,
} from "./aeCurrencies";

function loadStoredOrder(): string[] | null {
  try {
    const raw = window.localStorage.getItem(AE_OVERVIEW_CARDS_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

const DRAG_THRESHOLD_PX = 4;

// เนื้อในการ์ด: มือถือเรียงแนวตั้ง (ไอคอนบน-ตัวเลขล่าง, กลาง) กันตัวหนังสือโดนบีบเหลือ "G...";
// จอ sm+ กลับเป็นแนวนอนเหมือนเดิม — ใช้ร่วมกันทั้งการ์ดจริงและ ghost ตอนลาก
function AEOverviewCardBody({ entry }: { entry: AECurrencyEntry }) {
  return (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg sm:h-12 sm:w-12">
        {entry.img ? (
          <img src={entry.img} alt={entry.label} className="h-8 w-8 object-contain sm:h-10 sm:w-10" loading="lazy" draggable={false} />
        ) : (
          <i className="fa-solid fa-coins text-base text-zinc-400 sm:text-lg"></i>
        )}
      </span>
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <div className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-[10px] sm:tracking-[0.15em]">
          {entry.label}
        </div>
        <div
          title={entry.total.toLocaleString("en-US")}
          className={`truncate text-base font-black tabular-nums sm:text-2xl ${entry.valueClass}`}
        >
          {formatAbbreviatedTrim(entry.total)}
        </div>
      </div>
    </>
  );
}

export function AEStatsOverview({ players }: { players: PlayerData[] }) {
  const entries = useMemo(() => collectAECurrencies(players), [players]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  // default ก่อน (กัน hydration mismatch) แล้วค่อยโหลดค่าที่เคยเลือกจาก localStorage;
  // ถ้าไม่เคยเลือก ใช้ defaultCardOrder ที่อิง key จริงในข้อมูล (กัน default หายแบบ TraitReroll)
  const [order, setOrder] = useState<string[]>(() => [...AE_DEFAULT_CARDS]);
  useEffect(() => {
    const stored = loadStoredOrder();
    if (stored) {
      setOrder(stored);
      return;
    }
    const liveKeys = entries.filter((e) => e.id.startsWith("cur:")).map((e) => e.id.slice(4));
    setOrder(defaultCardOrder(liveKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(AE_OVERVIEW_CARDS_KEY, JSON.stringify(order));
    } catch {}
  }, [order]);

  // ตัด id ที่ไม่มีในข้อมูลแล้วออก (key หายไปจาก live data)
  const visible = useMemo(() => order.filter((id) => byId.has(id)), [order, byId]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const toggle = (id: string) =>
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ---- ลาก reorder (pointer-based: เมาส์+ทัช, การ์ดลอยตาม pointer) ----
  const nodeMap = useRef(new Map<string, HTMLDivElement>());
  const pendingRef = useRef<{ id: string; sx: number; sy: number } | null>(null);
  const draggingRef = useRef<string | null>(null); // id ที่กำลังลาก (ref กัน stale closure)
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);

  // safety net กัน ghost ค้าง: จบ drag จาก window-level เสมอ (capture หลุด/blur/unmount ก็เคลียร์)
  const endDrag = useCallback(() => {
    pendingRef.current = null;
    draggingRef.current = null;
    setGhost(null);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pendingRef.current = { id, sx: e.clientX, sy: e.clientY };
  };

  // tracking ที่ window-level — ไม่พึ่ง setPointerCapture บนตัวการ์ด:
  // ต่อให้ capture หลุดกลางทาง (เช่น React ขยับ DOM ตอน reorder) pointermove ก็ยังมาถึง
  // เพราะ event จากตรงไหนก็ bubble ขึ้น window อยู่ดี = ลากแล้วเม้าส์ไม่หลุด
  //
  // กฎสลับที่แบบ "ทับใบไหน สลับกับใบนั้น": pointer ทับการ์ดใบอื่นใบไหน
  // การ์ดที่ลากอยู่ก็สลับตำแหน่งกับใบนั้นทันที — ไม่ต้องลากเลยไปข้างหน้า/ข้างหลังการ์ด
  // (เสถียร: สลับแล้ว pointer จะอยู่บนการ์ดตัวเอง ไม่เกิดการสลับซ้ำจนกว่าจะขยับไปทับใบอื่น)
  const handleWindowMove = useCallback((e: PointerEvent) => {
    const p = pendingRef.current;
    if (!p) return;
    const id = p.id;
    if (draggingRef.current !== id) {
      // ยังไม่เริ่มลาก — เช็ก threshold ก่อน (ขนาด ghost อ่านจาก nodeMap แทน currentTarget)
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < DRAG_THRESHOLD_PX) return;
      const r = nodeMap.current.get(id)?.getBoundingClientRect();
      draggingRef.current = id;
      setGhost({ id, x: e.clientX, y: e.clientY, w: r?.width ?? 180, h: r?.height ?? 70 });
      return;
    }
    setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
    const x = e.clientX;
    const y = e.clientY;
    setOrder((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      // หาการ์ดใบอื่นที่ pointer ทับอยู่ (ใบแรกตามลำดับ)
      let target = -1;
      for (let j = 0; j < prev.length; j++) {
        if (j === i) continue;
        const el = nodeMap.current.get(prev[j]);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          target = j;
          break;
        }
      }
      if (target < 0) return prev;
      const next = [...prev];
      next[i] = prev[target];
      next[target] = id;
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handleWindowMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("pointermove", handleWindowMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", endDrag);
    };
  }, [handleWindowMove, endDrag]);

  const ghostEntry = ghost ? byId.get(ghost.id) : undefined;

  return (
    <section>
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <i className="fa-solid fa-earth-americas text-[10px]"></i>
        Dashboard Overview
      </div>
      {/* auto-fit: เติมการ์ดเต็มแถวตามความกว้างจอเอง (จอใหญ่จุเยอะ จอเล็กห่อแถวอัตโนมัติ) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-3">
        {visible.map((id) => {
          const c = byId.get(id);
          if (!c) return null;
          const dragging = ghost?.id === id;
          return (
            <div
              key={c.id}
              ref={(el) => {
                if (el) nodeMap.current.set(c.id, el);
                else nodeMap.current.delete(c.id);
              }}
              onPointerDown={(e) => handlePointerDown(e, c.id)}
              onDragStart={(e) => e.preventDefault()}
              className={`flex min-w-0 cursor-grab touch-none select-none flex-col items-center gap-2 rounded-xl border border-line bg-surface/60 px-2 py-3 text-center active:cursor-grabbing sm:flex-row sm:gap-2.5 sm:px-4 sm:py-3.5 sm:text-left ${
                dragging ? "opacity-30" : ""
              }`}
            >
              <AEOverviewCardBody entry={c} />
            </div>
          );
        })}
        {visible.length === 0 ? (
          <button
            onClick={() => setPickerOpen(true)}
            className="col-span-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-5 text-xs font-bold text-zinc-500 hover:border-zinc-400 hover:text-white"
          >
            <i className="fa-solid fa-plus"></i>
            Track currencies
          </button>
        ) : (
          <button
            onClick={() => setPickerOpen(true)}
            title="Track currencies"
            className="flex min-w-0 items-center justify-center rounded-xl border border-dashed border-line px-3 py-3 text-zinc-500 hover:border-zinc-400 hover:text-white sm:py-3.5"
          >
            <i className="fa-solid fa-plus text-sm"></i>
          </button>
        )}
      </div>

      {ghost && ghostEntry && (
        <div
          className="pointer-events-none fixed z-[60] flex flex-col items-center gap-2 rounded-xl border border-line bg-[#14181d] px-2 py-3 text-center opacity-95 shadow-2xl shadow-black/70 sm:flex-row sm:gap-2.5 sm:px-3 sm:text-left"
          style={{
            left: ghost.x - ghost.w / 2,
            top: ghost.y - ghost.h / 2,
            width: ghost.w,
            transform: "rotate(2deg) scale(1.03)",
          }}
        >
          <AEOverviewCardBody entry={ghostEntry} />
        </div>
      )}

      <AECurrencyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        entries={entries}
        trackedIds={visible}
        onToggle={toggle}
      />
    </section>
  );
}
