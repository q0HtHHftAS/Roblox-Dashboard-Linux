"use client";
import React, { useState } from "react";
import { aoTraitImagePath } from "@/games/animeorigin/aoUnitMeta";

// ไอคอน trait แบบ auto: ลองไฟล์ตาม convention
// `public/images/anime-origin/traits/<norm>.png` (เช่น immortal.png, strength1.png)
// ไม่มีไฟล์/โหลดพลาด = คืน null แล้ว caller โชว์แค่ชื่อ trait (ไม่พัง)
export function AOTraitIcon({
  trait,
  className,
}: {
  trait: string;
  className?: string;
}) {
  const src = aoTraitImagePath(trait);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      onError={() => setFailed(true)}
      alt=""
      loading="lazy"
      draggable={false}
      title={trait}
      className={`shrink-0 object-contain ${className ?? "h-4 w-4"}`}
    />
  );
}
