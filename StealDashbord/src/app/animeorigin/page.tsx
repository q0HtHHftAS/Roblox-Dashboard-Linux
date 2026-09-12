"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PlayerData } from "@/shared/lib/types";
import { useLiveData } from "@/shared/hooks/useLiveData";
import { useDashboardFilters } from "@/shared/hooks/useDashboardFilters";

import { DashboardHeader } from "@/shared/DashboardHeader";
import { FilterBar } from "@/games/stealanegg/FilterBar";
import { AOStatsOverview } from "@/games/animeorigin/AOStatsOverview";
import { AOUnitVault, type AOUnitGroup } from "@/games/animeorigin/AOUnitVault";
import { AOAccountTable } from "@/games/animeorigin/AOAccountTable";
import { AOAccountDetailModal, AOUnitDetailModal } from "@/games/animeorigin/AOModals";

import { ScriptModal } from "@/shared/modals/ScriptModal";
import { ApiKeyModal } from "@/shared/modals/ApiKeyModal";
import { ShareModal } from "@/shared/modals/ShareModal";
import { Loading } from "@/shared/ui/Loading";

export default function AnimeOriginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [showScript, setShowScript] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AOUnitGroup | null>(null);

  const ensureApiKey = useCallback(async () => {
    if (apiKey || status !== "authenticated") return;
    try {
      const res = await fetch("/api/user/api-key");
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } catch {}
  }, [apiKey, status]);

  const { players, setPlayers, serverTime, skew, reachable, failCount, totalUsers, refetch } =
    useLiveData({ enabled: status === "authenticated" });

  // กรองเฉพาะ payload ของเกมนี้ (legacy ไม่มี gameId นับเป็น stealanegg ไม่ปนมา)
  const aoPlayers = useMemo(() => players.filter((p) => (p.gameId ?? "stealanegg") === "animeorigin"), [players]);

  const {
    search, setSearch, pcFilter, setPcFilter, statusFilter, setStatusFilter,
    sortField, setSortField, sortDir, setSortDir, pcNames, filteredPlayers, counts,
  } = useDashboardFilters(aoPlayers, serverTime);

  // เรียงตาม AO เป็นหลัก: Exp > Gold (ตั้งต้น ถ้า user ยังไม่แตะ sort)
  const sortedPlayers = useMemo(() => {
    if (sortField === "money" && sortDir === "desc") {
      return [...filteredPlayers].sort(
        (a, b) => (b.aoExp ?? 0) - (a.aoExp ?? 0) || (b.money ?? 0) - (a.money ?? 0)
      );
    }
    return filteredPlayers;
  }, [filteredPlayers, sortField, sortDir]);

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

  if (status === "loading") {
    return <Loading variant="fullscreen" text="Checking session…" />;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center">
        <div className="animate-enter w-full max-w-sm space-y-6 rounded-2xl border border-line bg-surface p-8 shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent border border-accent/25">
            <i className="fa-solid fa-dragon text-2xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Anime Origins Dashboard</h2>
            <p className="mt-1.5 text-xs text-zinc-400">Sign in with Discord to access your tower vault, trait rolls, and currency stats.</p>
          </div>
          <button
            onClick={() => signIn("discord", { callbackUrl: "/animeorigin" })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] py-3 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/20 transition-colors hover:bg-[#4752c4]"
          >
            <i className="fa-brands fa-discord text-base"></i>
            Continue with Discord
          </button>
          <button onClick={() => router.push("/")} className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left text-[10px]"></i>
            Back to Game Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-foreground flex flex-col animate-enter">
      <DashboardHeader
        session={session}
        status={status}
        onlineCount={counts.online}
        totalCount={counts.total}
        gameName="Anime Origins"
        gameIcon="fa-dragon"
        gameLogo="/images/anime-origin/logo.png"
        onBackToHub={() => router.push("/")}
        onOpenScript={() => { void ensureApiKey(); setShowScript(true); }}
        onOpenApiKey={() => { void ensureApiKey(); setShowApiKey(true); }}
        onOpenShare={() => setShowShare(true)}
      />

      {!reachable && (
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Reconnecting to live server… ({failCount}/5)
            </span>
            <button onClick={refetch} className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-200 hover:bg-amber-500/30">Retry</button>
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {aoPlayers.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center py-20 text-center">
            <img src="/images/anime-origin/logo.png" alt="Anime Origins" className="h-14 w-14 rounded-2xl border border-line object-cover" />
            <h4 className="mt-4 text-sm font-bold text-zinc-200">No Anime Origins data yet</h4>
            <p className="mt-1 text-xs text-zinc-500">Run the script in-game to start syncing your accounts.</p>
            <button
              onClick={() => { void ensureApiKey(); setShowScript(true); }}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-bg hover:bg-accent/85"
            >
              <i className="fa-solid fa-code"></i>
              Get Script
            </button>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            <div className="animate-enter" style={{ animationDelay: "0ms" }}>
              <AOStatsOverview players={aoPlayers} />
            </div>
            <div className="animate-enter" style={{ animationDelay: "60ms" }}>
              <AOUnitVault players={aoPlayers} onSelectGroup={setSelectedGroup} />
            </div>
            <div className="border-t border-line/60" />
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
                <AOAccountTable
                  players={sortedPlayers}
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
        <a href="https://github.com/q0HtHHftAS" target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-200 hover:text-white hover:underline">q0HtHHftAS</a>
        <span className="mx-2 text-zinc-700">|</span>
        {totalUsers.toLocaleString("en-US")} All User
      </footer>

      <ScriptModal isOpen={showScript} onClose={() => setShowScript(false)} apiKey={apiKey} />
      <ApiKeyModal isOpen={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} onKeyRegenerated={setApiKey} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} />

      <AOAccountDetailModal
        player={selectedPlayer}
        serverTime={serverTime}
        onClose={() => setSelectedPlayer(null)}
      />

      <AOUnitDetailModal
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}
