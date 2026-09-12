"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLiveData } from "@/shared/hooks/useLiveData";
import { useDashboardFilters } from "@/shared/hooks/useDashboardFilters";
import { getStatsByGame } from "@/shared/lib/types";

import { DashboardHeader } from "@/shared/DashboardHeader";
import { GameHub } from "@/shared/hub/GameHub";
import { ApiKeyModal } from "@/shared/modals/ApiKeyModal";
import { Loading } from "@/shared/ui/Loading";

export default function GameHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");

  // ดึง API key แบบ on-demand ตอนเปิด modal เท่านั้น — ไม่ค้าง key ใน JS memory ตั้งแต่โหลดหน้า
  const ensureApiKey = useCallback(async () => {
    if (apiKey || status !== "authenticated") return;
    try {
      const res = await fetch("/api/user/api-key");
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } catch {}
  }, [apiKey, status]);

  // Live data hook for real-time game cards statistics
  const {
    players,
    serverTime,
    reachable,
    failCount,
    globalByGame,
    totalUsers,
    refetch,
  } = useLiveData({ enabled: status === "authenticated" });

  const { counts } = useDashboardFilters(players, serverTime);

  // Faz2 multi-game: นับแยกตาม gameId (legacy ไม่มี gameId = stealanegg)
  // MY / ONLINE = ของ user คนนี้แยกตามเกม; TOTAL = ยอด global รวมทุก user แยกตามเกม
  // (global ยังไม่มา/เป็น 0 ใช้ยอดของตัวเองแทน — กันโชว์ 0/— ผิดตอน API วืด)
  const eggStats = useMemo(
    () => getStatsByGame(players, "stealanegg", serverTime),
    [players, serverTime]
  );
  const aeStats = useMemo(
    () => getStatsByGame(players, "animeexpeditions", serverTime),
    [players, serverTime]
  );
  const aoStats = useMemo(
    () => getStatsByGame(players, "animeorigin", serverTime),
    [players, serverTime]
  );
  const pickGlobalTotal = useCallback(
    (gameId: string, mine: number) => {
      const g = Number(globalByGame?.[gameId]?.total);
      return Number.isFinite(g) && g > 0 ? g : mine;
    },
    [globalByGame]
  );

  if (status === "loading") {
    return <Loading variant="fullscreen" text="Checking session…" />;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center">
        <div className="animate-enter w-full max-w-sm space-y-6 rounded-2xl border border-line bg-surface p-8 shadow-2xl">
          <img src="/images/shared/xsprob.png" alt="XSPROB" className="mx-auto h-16 w-16 rounded-2xl object-cover" />

          <div>
            <h2 className="text-xl font-black tracking-[0.2em] text-white">XSPROB</h2>
            <p className="mt-1.5 text-xs text-zinc-400" style={{ fontFamily: "var(--font-kanit)", fontWeight: 400 }}>
              เข้าสู่ระบบด้วย Discord เพื่อเข้าถึง Game Hub, บอทแบบเรียลไทม์ และสถิติคลังไอเทมของคุณ
            </p>
          </div>

          <button
            onClick={() => signIn("discord", { callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] py-3 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/20 transition-[background-color,color,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#4752c4] active:scale-[0.99]"
          >
            <i className="fa-brands fa-discord text-base"></i>
            Continue with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-foreground flex flex-col">
      {/* Top Navigation Header — ของ user คนนี้เท่านั้น */}
      <DashboardHeader
        session={session}
        status={status}
        onlineCount={counts.online}
        totalCount={counts.total}
        hideOnline
        onOpenApiKey={() => {
          void ensureApiKey();
          setShowApiKey(true);
        }}
      />

      {/* Reconnecting banner if server fails */}
      {!reachable && (
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Reconnecting to live server… ({failCount}/5)
            </span>
            <button
              onClick={refetch}
              className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-200 hover:bg-amber-500/30"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Game Hub with smooth entrance transition */}
      <div className="animate-enter flex-1">
        <GameHub
          stealEggAccountsCount={eggStats.myAccounts}
          stealEggOnlineCount={eggStats.onlineCount}
          stealEggTotalCount={pickGlobalTotal("stealanegg", eggStats.totalAccounts)}
          aeAccountsCount={aeStats.myAccounts}
          aeOnlineCount={aeStats.onlineCount}
          aeTotalCount={pickGlobalTotal("animeexpeditions", aeStats.totalAccounts)}
          aoAccountsCount={aoStats.myAccounts}
          aoOnlineCount={aoStats.onlineCount}
          aoTotalCount={pickGlobalTotal("animeorigin", aoStats.totalAccounts)}
          onSelectGame={(id) => {
            if (id === "stealanegg") {
              router.push("/stealanegg");
            } else if (id === "animeexpeditions") {
              router.push("/animeexpeditions");
            } else if (id === "animeorigin") {
              router.push("/animeorigin");
            }
          }}
        />
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-line/60 bg-[#0e1116] py-4 text-center text-[11px] tabular-nums text-zinc-500">
        © Dashboard
        <span className="mx-2 text-zinc-700">|</span>
        Made by{" "}
        <a
          href="https://github.com/q0HtHHftAS"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-zinc-200 hover:text-white hover:underline"
        >
          q0HtHHftAS
        </a>
        <span className="mx-2 text-zinc-700">|</span>
        {totalUsers.toLocaleString("en-US")} All User
      </footer>

      {/* Global API Key modal accessible from header */}
      <ApiKeyModal
        isOpen={showApiKey}
        onClose={() => setShowApiKey(false)}
        apiKey={apiKey}
        onKeyRegenerated={setApiKey}
      />
    </div>
  );
}
