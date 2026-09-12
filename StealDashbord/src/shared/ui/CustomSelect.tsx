"use client";
import React, { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  prefix?: string;
  className?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  prefix,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative inline-block text-xs ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 font-semibold text-zinc-200 hover:border-zinc-500 hover:bg-white/[0.04] transition-colors focus:outline-none"
      >
        {prefix && <span className="text-zinc-500 font-normal">{prefix}</span>}
        <span className="font-bold text-white">{selectedOption?.label}</span>
        <i
          className={`fa-solid fa-chevron-down text-[10px] text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180 text-white" : ""
          }`}
        ></i>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-line bg-[#14181d] p-1.5 shadow-2xl shadow-black/90 ring-1 ring-white/10 dropdown-in">
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
                    isSelected
                      ? "bg-accent/15 text-accent font-bold"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {option.icon && <i className={`fa-solid ${option.icon} text-xs text-zinc-400`}></i>}
                    {option.label}
                  </span>
                  {isSelected && (
                    <i className="fa-solid fa-check text-[10px] text-accent"></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
