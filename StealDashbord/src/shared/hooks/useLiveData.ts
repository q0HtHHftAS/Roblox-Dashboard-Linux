"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { PlayerData } from "@/shared/lib/types";

interface UseLiveDataOptions {
  shareToken?: string;
  enabled?: boolean;
}

export function useLiveData({ shareToken, enabled = true }: UseLiveDataOptions = {}) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [lastIngest, setLastIngest] = useState<number>(0);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [skew, setSkew] = useState<number>(0);
  const [reachable, setReachable] = useState<boolean>(true);
  const [failCount, setFailCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [ownerName, setOwnerName] = useState<string>("");
  const [globalTotal, setGlobalTotal] = useState<number>(0);
  const [globalOnline, setGlobalOnline] = useState<number>(0);
  // ยอด global รวมทุก user แยกตามเกม { [gameId]: { total, online } }
  const [globalByGame, setGlobalByGame] = useState<Record<string, { total: number; online: number }>>({});
  const [totalUsers, setTotalUsers] = useState<number>(0);
  // 404 จาก /api/share/[token] = ลิงก์โดน rotate/disabled แล้ว — ต้องล้างข้อมูล + ขึ้นจอ invalid
  // (แยกจาก failCount ที่เป็น network glitch ชั่วคราว)
  const [notFound, setNotFound] = useState<boolean>(false);

  const cacheKey = shareToken ? `steal-dash:share:${shareToken}` : "steal-dash:players";

  // Load from local storage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as PlayerData[];
        if (Array.isArray(cached) && cached.length > 0) {
          setPlayers(cached);
        }
      }
    } catch {}
  }, [cacheKey]);

  // Persist to local storage (ลบ key ทิ้งตอนว่าง — กัน acc ที่ลบไปแล้วฟื้นกลับมาจาก cache)
  useEffect(() => {
    try {
      if (players.length > 0) {
        window.localStorage.setItem(cacheKey, JSON.stringify(players));
      } else {
        window.localStorage.removeItem(cacheKey);
      }
    } catch {}
  }, [players, cacheKey]);

  const endpoint = shareToken ? `/api/share/${shareToken}` : "/api/live";

  const fetchLive = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(endpoint, { cache: "no-store", credentials: "include" });
      if (res.status === 401) {
        // Unauthenticated
        setReachable(true);
        setLoading(false);
        return;
      }
      if (shareToken && res.status === 404) {
        // Share link โดน rotate หรือปิดแล้ว — ลิงก์เก่าต้องใช้ไม่ได้ทันที:
        // ล้าง players + ลบ cache ของ token นี้ทิ้ง (กันโชว์ข้อมูลเก่าค้าง)
        setNotFound(true);
        setPlayers([]);
        try {
          window.localStorage.removeItem(cacheKey);
        } catch {}
        setReachable(true);
        setFailCount(0);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setFailCount((c) => Math.min(c + 1, 5));
        if (failCount >= 3) setReachable(false);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const st = Number(json.serverTime) || Date.now();
      setServerTime(st);
      setSkew(Date.now() - st);
      setReachable(true);
      setFailCount(0);
      setLoading(false);
      setNotFound(false);

      if (json.ownerName) setOwnerName(json.ownerName);
      if (Number.isFinite(json.lastIngest)) setLastIngest(json.lastIngest);
      if (Number.isFinite(json.globalTotal)) setGlobalTotal(json.globalTotal);
      if (Number.isFinite(json.globalOnline)) setGlobalOnline(json.globalOnline);
      if (json.globalByGame && typeof json.globalByGame === "object") setGlobalByGame(json.globalByGame);
      if (Number.isFinite(json.totalUsers)) setTotalUsers(json.totalUsers);

      if (Array.isArray(json.players)) {
        setPlayers(json.players);
      }
    } catch {
      setFailCount((c) => Math.min(c + 1, 5));
      if (failCount >= 2) setReachable(false);
      setLoading(false);
    }
  }, [endpoint, enabled, failCount, cacheKey, shareToken]);

  useEffect(() => {
    if (!enabled) return;
    fetchLive();
    const interval = setInterval(fetchLive, 4000);
    return () => clearInterval(interval);
  }, [fetchLive, enabled]);

  // เปลี่ยน token → รีเซ็ต invalid state (กันลิงก์ใหม่โดนแปะป้าย invalid ของลิงก์เก่า)
  useEffect(() => {
    setNotFound(false);
    setLoading(true);
  }, [endpoint]);

  return {
    players,
    setPlayers,
    lastIngest,
    serverTime,
    skew,
    reachable,
    failCount,
    loading,
    notFound,
    ownerName,
    globalTotal,
    globalOnline,
    globalByGame,
    totalUsers,
    refetch: fetchLive,
  };
}
