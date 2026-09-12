"use client";
import React from "react";
import { aeTraitImageFor } from "@/games/animeexpeditions/aeTraitImageMap";

// ไอคอน trait ย้อมสีตาม tier มาแล้วตั้งแต่ไฟล์ PNG (สคริปต์ย้อมตาม gradient ของ wiki):
// Mythic = เขียว→ฟ้า→ม่วง, Legendary = ทอง, Rare = น้ำเงิน
export function AETraitIcon({
  trait,
  className,
}: {
  trait: string;
  className?: string;
}) {
  const src = aeTraitImageFor(trait);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      title={trait}
      className={`shrink-0 object-contain ${className ?? "h-4 w-4"}`}
    />
  );
}
