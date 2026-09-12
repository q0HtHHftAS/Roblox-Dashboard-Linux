"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ส่ง pageview เข้า /api/collect ทุกครั้งที่เปลี่ยนหน้า (Q14 — ไม่ระบุตัวตน)
export function PageviewTracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      const body = JSON.stringify({ path: path || "/" });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/collect", blob);
      } else {
        fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // เงียบ
    }
  }, [path]);
  return null;
}
