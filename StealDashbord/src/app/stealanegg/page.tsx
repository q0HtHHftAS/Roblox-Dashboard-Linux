"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PlayerData, PetData } from "@/shared/lib/types";
import { useLiveData } from "@/shared/hooks/useLiveData";
import { useDashboardFilters } from "@/shared/hooks/useDashboardFilters";

import { DashboardHeader } from "@/shared/DashboardHeader";
import { StatsOverview } from "@/games/stealanegg/StatsOverview";
import { FilterBar } from "@/games/stealanegg/FilterBar";
import { AccountTable, AccountsEmptyState } from "@/games/stealanegg/AccountTable";
import { InventorySection } from "@/games/stealanegg/InventorySection";

import { ScriptModal } from "@/shared/modals/ScriptModal";
import { ApiKeyModal } from "@/shared/modals/ApiKeyModal";
import { ShareModal } from "@/shared/modals/ShareModal";
import { AccountDetailModal } from "@/games/stealanegg/AccountDetailModal";
import { PetDetailModal } from "@/games/stealanegg/PetDetailModal";
import { Loading } from "@/shared/ui/Loading";

export default function StealAnEggPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Modals state
  const [showScript, setShowScript] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");

  // Inspect detail modals
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedItem, setSelectedItem] = useState<{
    category: string;
    rarity?: string;
    items: Array<{ pet: PetData; account: string; pc: string; lastSeen?: number; updatedAt?: number }>;
  } | null>(null);

  // ดึง API key แบบ on-demand ตอนเปิด modal เท่านั้น — ไม่ค้าง key ใน JS memory ตั้งแต่โหลดหน้า
  const ensureApiKey = useCallback(async () => {
    if (apiKey || status !== "authenticated") return;
    try {
      const res = await fetch("/api/user/api-key");
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } catch {}
  }, [apiKey, status]);

  // Live data hook
  const {
    players,
    setPlayers,
    serverTime,
    skew,
    reachable,
    failCount,
    totalUsers,
    refetch,
  } = useLiveData({ enabled: status === "authenticated" });

  // Faz2: กรองเฉพาะ payload ของเกมนี้ (AE payload ต้องไม่ปนมาหน้านี้)
  const eggPlayers = useMemo(
    () => players.filter((p) => (p.gameId ?? "stealanegg") === "stealanegg"),
    [players]
  );

  // Filters and sorting hook
  const {
    search,
    setSearch,
    pcFilter,
    setPcFilter,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    pcNames,
    filteredPlayers,
    counts,
  } = useDashboardFilters(eggPlayers, serverTime);

  // Footer "N All User" = จำนวน User ทั้งหมดที่เคย login เว็บ (มาจาก /api/live)

  // Clear offline accounts
  const handleClearOffline = async () => {
    try {
      const res = await fetch("/api/accounts/clear-offline", { method: "POST" });
      if (res.ok) {
        setPlayers((prev) =>
          prev.filter((p) => {
            const lastSeen = Number(p.lastSeen ?? p.lastUpdated ?? 0);
            return serverTime - lastSeen <= 90_000;
          })
        );
      }
    } catch (e) {
      console.error("Failed to clear offline accounts", e);
    }
  };

  // Delete single player
  const handleDeletePlayer = async (pcName: string, username: string) => {
    try {
      const res = await fetch(
        `/api/accounts/clear-offline?pcName=${encodeURIComponent(pcName)}&username=${encodeURIComponent(username)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPlayers((prev) => prev.filter((p) => !(p.pcName === pcName && p.username === username)));
      }
    } catch (e) {
      console.error("Failed to delete account", e);
    }
  };

  // Auth gate if unauthenticated
  if (status === "loading") {
    return <Loading variant="fullscreen" text="Checking session…" />;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center">
        <div className="animate-enter w-full max-w-sm space-y-6 rounded-2xl border border-line bg-surface p-8 shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent border border-accent/25">
            <i className="fa-solid fa-egg text-2xl"></i>
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Steal An Egg Dashboard</h2>
            <p className="mt-1.5 text-xs text-zinc-400">
              Sign in with Discord to access your multi-PC bots, live inventory, and profit stats.
            </p>
          </div>

          <button
            onClick={() => signIn("discord", { callbackUrl: "/stealanegg" })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] py-3 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/20 transition-[background-color,color,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#4752c4] active:scale-[0.99]"
          >
                  <i className="fa-brands fa-discord text-base"></i>
            Continue with Discord
          </button>

          <button
            onClick={() => router.push("/")}
            className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-[10px]"></i>
            Back to Game Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-foreground flex flex-col animate-enter">
      {/* Top Header — ของ user คนนี้เท่านั้น */}
      <DashboardHeader
        session={session}
        status={status}
        onlineCount={counts.online}
        totalCount={counts.total}
        gameName="Steal An Egg"
        gameIcon="fa-egg"
        gameLogo="/images/steal-an-egg/logo.png"
        onBackToHub={() => router.push("/")}
        onOpenScript={() => {
          void ensureApiKey();
          setShowScript(true);
        }}
        onOpenApiKey={() => {
          void ensureApiKey();
          setShowApiKey(true);
        }}
        onOpenShare={() => setShowShare(true)}
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

      {/* Main Dashboard Content */}
      <main className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {eggPlayers.length === 0 ? (
          <AccountsEmptyState
            logo="/images/steal-an-egg/logo.png"
            title="No Steal An Egg data yet"
            action={
              <button
                onClick={() => {
                  void ensureApiKey();
                  setShowScript(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-bg hover:bg-accent/85"
              >
                <i className="fa-solid fa-code"></i>
                Get Script
              </button>
            }
          />
        ) : (
          <div className="space-y-6 pb-6">
        {/* KPI Stats Overview */}
        <div className="animate-enter" style={{ animationDelay: "0ms" }}>
          <StatsOverview
            players={eggPlayers}
            onlineCount={counts.online}
            idleCount={counts.idle}
            offlineCount={counts.offline}
            pcCount={pcNames.length}
          />
        </div>

        {/* Global Inventory Vault */}
        <div className="animate-enter" style={{ animationDelay: "60ms" }}>
          <InventorySection
            players={eggPlayers}
            onSelectItem={setSelectedItem}
          />
        </div>

        <div className="border-t border-line/60" />

        {/* Accounts */}
        <section className="animate-enter" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <i className="fa-solid fa-users text-[10px]"></i>
            Accounts
          </div>
          <div className="space-y-3">
            <FilterBar
          search={search}
          onSearchChange={setSearch}
          pcFilter={pcFilter}
          onPcFilterChange={setPcFilter}
          pcNames={pcNames}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          counts={counts}
          onClearOffline={handleClearOffline}
        />

        {/* Multi-Account Monitor Table */}
        <AccountTable
          players={filteredPlayers}
          serverTime={serverTime}
          skew={skew}
          sortField={sortField}
          onSortFieldChange={setSortField}
          sortDir={sortDir}
          onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          rowsPerPage={rowsPerPage}
          onSelectPlayer={setSelectedPlayer}
          onDeletePlayer={handleDeletePlayer}
        />
          </div>
        </section>
          </div>
        )}

        </main>

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

      {/* Modals */}
      <ScriptModal
        isOpen={showScript}
        onClose={() => setShowScript(false)}
        apiKey={apiKey}
      />

      <ApiKeyModal
        isOpen={showApiKey}
        onClose={() => setShowApiKey(false)}
        apiKey={apiKey}
        onKeyRegenerated={setApiKey}
      />

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />

      <AccountDetailModal
        player={selectedPlayer}
        serverTime={serverTime}
        onClose={() => setSelectedPlayer(null)}
      />

      <PetDetailModal
        data={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
