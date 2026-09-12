"use client";
import React, { useState } from "react";
import type { BotStatus } from "@/shared/lib/types";
import { CustomSelect, type SelectOption } from "@/shared/ui/CustomSelect";

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  pcFilter: string;
  onPcFilterChange: (v: string) => void;
  pcNames: string[];
  statusFilter: "all" | BotStatus;
  onStatusFilterChange: (v: "all" | BotStatus) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (v: number) => void;
  counts: {
    total: number;
    online: number;
    idle: number;
    offline: number;
    live: number;
  };
  onClearOffline?: () => Promise<void>;
  isReadOnly?: boolean;
}

const ROW_OPTIONS: SelectOption[] = [
  { value: "10", label: "10 rows" },
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
];

export function FilterBar({
  search,
  onSearchChange,
  pcFilter,
  onPcFilterChange,
  pcNames,
  statusFilter,
  onStatusFilterChange,
  rowsPerPage,
  onRowsPerPageChange,
  counts,
  onClearOffline,
  isReadOnly = false,
}: FilterBarProps) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!onClearOffline || clearing) return;
    setClearing(true);
    try {
      await onClearOffline();
    } finally {
      setClearing(false);
    }
  };

  const pcOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All PCs" },
      ...pcNames.map((pc) => ({ value: pc, label: pc })),
    ];
  }, [pcNames]);

  const tabs: Array<{ value: "all" | BotStatus; label: string; icon: string; iconClass: string; activeIconClass: string; count: number }> = [
    { value: "all", label: "All", icon: "fa-layer-group", iconClass: "text-zinc-500", activeIconClass: "text-white", count: counts.total },
    { value: "online", label: "Online", icon: "fa-tower-broadcast", iconClass: "text-emerald-400", activeIconClass: "text-emerald-400", count: counts.live },
    { value: "offline", label: "Offline", icon: "fa-tower-broadcast", iconClass: "text-[#7d8590]", activeIconClass: "text-zinc-200", count: counts.offline },
  ];

  return (
    <div className="space-y-3">
      {/* Actions row */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {!isReadOnly && counts.offline > 0 && onClearOffline && (
          <button
            disabled={clearing}
            onClick={handleClear}
            title="Remove all accounts that have been offline for >90s"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
          >
            <i className="fa-solid fa-gear text-[11px]"></i>
            {clearing ? "Clearing…" : `Clear Off (${counts.offline})`}
          </button>
        )}
        <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search — separate with , for"
            className="h-9 w-56 rounded-lg border border-line bg-surface pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-accent focus:outline-none"
          />
        </div>
        <CustomSelect
          value={pcFilter}
          options={pcOptions}
          onChange={onPcFilterChange}
        />
        <CustomSelect
          value={String(rowsPerPage)}
          options={ROW_OPTIONS}
          onChange={(v) => onRowsPerPageChange(Number(v) || 25)}
        />
      </div>

      {/* Status tabs — pill แบบในรูป (พื้นเข้ม เลขเป็น text ล้วน ไม่มี badge แยก) */}
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        {tabs.map((t) => {
          const active = statusFilter === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onStatusFilterChange(t.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                active
                  ? "border-accent/60 bg-white/[0.05] text-white"
                  : "border-transparent bg-white/[0.05] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <i className={`fa-solid ${t.icon} text-[13px] ${active ? t.activeIconClass : t.iconClass}`}></i>
              {t.label}
              <span className="text-[13px] font-bold tabular-nums text-current opacity-60">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
