"use client";
import { useState, useCallback } from "react";
import { PET_IMAGE_MAP, localImageForName } from "@/games/stealanegg/petImageMap";

// v=2: cache-buster สำหรับ browser 302 cache — ต้อง bump ทุกครั้งที่แก้ blocklist รูปแตกใน /api/thumb
// หมายเหตุ: เคยมี iconToUrl ที่คืน https:// ภายนอกตรง ๆ + THUMB_V cache-buster — ลบทิ้งแล้วเพราะไม่มี caller
// (ถ้าอนาคตต้องใช้อีก ให้ allowlist host ก่อน return กัน forged icon กลายเป็น <img src> เปิด)
export function assetIdOf(icon?: string): string | null {
  if (!icon) return null;
  const trimmed = icon.trim();
  const m = trimmed.match(/rbxassetid:\/\/(\d+)/i);
  if (m) return m[1];
  if (/^\d{4,}$/.test(trimmed)) return trimmed;
  return null;
}

// รูป local ที่ดึงจากในเกมมาเก็บไว้ใน public/pets/ (ดู src/lib/petImageMap.ts)
export function localImageFor(icon?: string): string | null {
  const id = assetIdOf(icon);
  return id ? (PET_IMAGE_MAP[id] ?? null) : null;
}

// local-only: ไม่ดึงรูปจากเกม/Roblox แล้ว — ใช้แค่ไฟล์ใน public/pets/
// (asset id -> PET_IMAGE_MAP, ถ้าไม่เจอใช้ชื่อ -> PET_IMAGE_BY_NAME)
// ถ้าไม่มีรูป local จะคืน loaded=null แล้ว component โชว์ตัวอักษรแทน
export function useCachedImage(icon?: string, name?: string | null, isEgg?: boolean) {
  const local = localImageFor(icon) ?? localImageForName(name, isEgg);
  // local เคยโหลดพลาด (ไฟล์หาย) -> โชว์ตัวอักษรแทน (รีเซ็ตเองเมื่อ local เปลี่ยน)
  const [skippedFor, setSkippedFor] = useState<string | null>(null);
  if (skippedFor !== null && skippedFor !== local) {
    setSkippedFor(null);
  }
  const loaded = local && skippedFor !== local ? local : null;

  const onImgError = useCallback(() => {
    if (local) setSkippedFor(local);
  }, [local]);

  return { loaded, onImgError };
}
