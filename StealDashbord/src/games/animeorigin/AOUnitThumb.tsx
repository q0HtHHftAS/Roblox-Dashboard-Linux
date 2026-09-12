"use client";
import React, { useMemo, useState } from "react";
import {
  aoDisplayName,
  aoThumbUrl,
  aoUnitImagePath,
  prettyAOUnitName,
} from "@/games/animeorigin/aoUnitMeta";

// สี avatar fallback ผูกกับชื่อ asset (hash -> hue) — ยูนิตใหม่ที่ยังไม่มีรูป
// จะได้ tile สีเฉพาะตัว + ตัวย่อ 2 ตัวอักษร แทนที่จะเป็น "G" เทาๆ เหมือนกันหมด
function avatarHue(asset: string): number {
  let h = 0;
  for (let i = 0; i < asset.length; i++) h = (h * 31 + asset.charCodeAt(i)) >>> 0;
  return h % 360;
}

function avatarInitials(asset: string): string {
  const words = prettyAOUnitName(asset).split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  const a = words[0].charAt(0);
  const b = words.length > 1 ? words[1].charAt(0) : words[0].charAt(1) || "";
  return (a + b).toUpperCase();
}

// รูป tower แบบ auto:
//   1. image จาก payload (Lua อ่าน TowerInfo ในเกม) ผ่าน /api/thumb
//   2. ไฟล์ local ตาม convention `public/images/anime-origin/units/<norm>.png`
//      (วางไฟล์อย่างเดียว ไม่ต้องแก้โค้ด — ดู aoUnitMeta.ts)
//   3. fallback avatar สีเฉพาะตัว (ไม่มีทางเป็นช่องว่าง/พัง)
export function AOUnitThumb({
  asset,
  image,
  size = "md",
}: {
  asset: string;
  image?: string | null;
  size?: "md" | "sm" | "lg";
}) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    const thumb = aoThumbUrl(image);
    if (thumb) list.push(thumb);
    const local = aoUnitImagePath(asset);
    if (local) list.push(local);
    return list;
  }, [asset, image]);
  const key = `${asset}::${image ?? ""}`;

  // step = index ใน candidates ที่กำลังลอง; เกิน = หมดแล้วโชว์ avatar
  // (รีเซ็ตเองเมื่อ asset/image เปลี่ยน — pattern เดียวกับ useCachedImage)
  const [state, setState] = useState<{ key: string; step: number }>({ key, step: 0 });
  const step = state.key === key ? state.step : 0;
  if (state.key !== key) setState({ key, step: 0 });

  const box = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const src = step < candidates.length ? candidates[step] : null;

  if (!src) {
    const hue = avatarHue(asset || "?");
    return (
      <span
        title={aoDisplayName(asset)}
        style={{
          backgroundImage: `linear-gradient(135deg,hsl(${hue} 45% 22%),hsl(${(hue + 40) % 360} 50% 14%))`,
          borderColor: `hsl(${hue} 60% 45% / 0.35)`,
        }}
        className={`grid ${box} shrink-0 place-items-center rounded-lg border font-black text-white/90 ${
          size === "sm" ? "text-[8px] tracking-tight" : "text-lg tracking-wide"
        }`}
      >
        {avatarInitials(asset || "?")}
      </span>
    );
  }
  return (
    <img
      src={src}
      onError={() => setState((s) => ({ key, step: (s.key === key ? s.step : step) + 1 }))}
      alt={aoDisplayName(asset)}
      title={aoDisplayName(asset)}
      loading="lazy"
      draggable={false}
      className={`${box} shrink-0 rounded-lg border border-line bg-white/[0.03] object-contain p-0.5 drop-shadow`}
    />
  );
}
