"use client";
import { useState, useEffect } from "react";

// นาฬิกา client-side สำหรับนับถอยหลัง cooldown แบบ live (tick ทุก intervalMs)
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
  return now;
}
