"use client";
import React, { useState, use, useMemo } from "react";
import { useLiveData } from "@/shared/hooks/useLiveData";
import { useDashboardFilters } from "@/shared/hooks/useDashboardFilters";
import { DashboardHeader } from "@/shared/DashboardHeader";
import { StatsOverview } from "@/games/stealanegg/StatsOverview";
import { FilterBar } from "@/games/stealanegg/FilterBar";
import { AccountTable } from "@/games/stealanegg/AccountTable";
import { InventorySection } from "@/games/stealanegg/InventorySection";
import { AccountDetailModal } from "@/games/stealanegg/AccountDetailModal";
import { PetDetailModal } from "@/games/stealanegg/PetDetailModal";
import { AEStatsOverview } from "@/games/animeexpeditions/AEStatsOverview";
import { AEUnitVault, type AEUnitGroup, type AESkinGroup } from "@/games/animeexpeditions/AEUnitVault";
import { AEAccountTable } from "@/games/animeexpeditions/AEAccountTable";
import { AEAccountDetailModal, AEUnitDetailModal, AESkinDetailModal } from "@/games/animeexpeditions/AEModals";
import { AOStatsOverview } from "@/games/animeorigin/AOStatsOverview";
import { AOUnitVault, type AOUnitGroup } from "@/games/animeorigin/AOUnitVault";
import { AOAccountTable } from "@/games/animeorigin/AOAccountTable";
import { AOAccountDetailModal, AOUnitDetailModal } from "@/games/animeorigin/AOModals";
import { Loading } from "@/shared/ui/Loading";
import type { PlayerData, PetData } from "@/shared/lib/types";

type ShareGameTab = "stealanegg" | "animeexpeditions" | "animeorigin";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const {
    players,
    serverTime,
    skew,
    reachable,
    failCount,
    loading,
    notFound,
    ownerName,
    refetch,
  } = useLiveData({ shareToken: token });

  // Faz2: แยกมุมมองตามเกม — กัน account AE ปนเข้าวิว Steal An Egg
  const hasEgg = useMemo(() => players.some((p) => (p.gameId ?? "stealanegg") === "stealanegg"), [players]);
  const hasAE = useMemo(() => players.some((p) => (p.gameId ?? "stealanegg") === "animeexpeditions"), [players]);
  const hasAO = useMemo(() => players.some((p) => (p.gameId ?? "stealanegg") === "animeorigin"), [players]);
  const [tabOverride, setTabOverride] = useState<ShareGameTab | null>(null);
  const tab: ShareGameTab = tabOverride ?? (hasEgg ? "stealanegg" : hasAE ? "animeexpeditions" : "animeorigin");
  const tabPlayers = useMemo(
    () => players.filter((p) => (p.gameId ?? "stealanegg") === tab),
    [players, tab]
  );

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
  } = useDashboardFilters(tabPlayers, serverTime);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [selectedAEPlayer, setSelectedAEPlayer] = useState<PlayerData | null>(null);
  const [selectedAEGroup, setSelectedAEGroup] = useState<AEUnitGroup | null>(null);
  const [selectedAESkin, setSelectedAESkin] = useState<AESkinGroup | null>(null);
  const [selectedAOPlayer, setSelectedAOPlayer] = useState<PlayerData | null>(null);
  const [selectedAOGroup, setSelectedAOGroup] = useState<AOUnitGroup | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedItem, setSelectedItem] = useState<{
    category: string;
    rarity?: string;
    items: Array<{ pet: PetData; account: string; pc: string; lastSeen?: number; updatedAt?: number }>;
  } | null>(null);

  const isAE = tab === "animeexpeditions";
  const isAO = tab === "animeorigin";

  // ลิงก์โดน rotate หรือเจ้าของปิดแชร์แล้ว — ไม่โชว์ dashboard/cache เก่า
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-foreground flex flex-col">
        <DashboardHeader
          session={null}
          status="unauthenticated"
          onlineCount={0}
          totalCount={0}
          isReadOnly={true}
        />
        <main className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
          <img src="/images/shared/xsprob.png" alt="XSPROB" className="h-16 w-16 rounded-2xl object-cover" />
          <h1 className="mt-4 text-xl font-black text-white">This share link is invalid</h1>
          <p className="mt-1.5 max-w-sm text-xs text-zinc-400">
            The owner rotated or disabled this link. Ask them for the new URL — the old one will never work again.
          </p>
        </main>
        <footer className="border-t border-line/60 pt-4 pb-6 text-center text-[11px] tabular-nums text-zinc-600">
          © XSPROB Dashboard
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-foreground flex flex-col">
      <DashboardHeader
        session={null}
        status="unauthenticated"
        onlineCount={counts.online}
        totalCount={counts.total}
        gameName={isAO ? "Anime Origins" : isAE ? "Anime Expeditions" : "Steal An Egg"}
        gameIcon={isAO ? "fa-dragon" : isAE ? "fa-compass" : "fa-egg"}
        gameLogo={isAO ? "/images/anime-origin/logo.png" : isAE ? "/images/anime-expeditions/logo.png" : "/images/steal-an-egg/logo.png"}
        isReadOnly={true}
        ownerName={ownerName}
      />

      {/* Connection warning bar if server unreachable */}
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

      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>{ownerName ? `${ownerName}'s Dashboard` : "Live Bot Dashboard"}</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                LIVE
              </span>
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isAO
                ? "Shared read-only view of Anime Origins towers and currency."
                : isAE
                ? "Shared read-only view of Anime Expeditions teams and unit vault."
                : "Shared read-only view of running Steal An Egg farm bots and inventory."}
            </p>
          </div>
          {(hasEgg || hasAE || hasAO) && (
            <div className="flex items-center gap-2">
              {(
                [
                  ...(hasEgg ? [{ key: "stealanegg", label: "Steal An Egg", icon: "fa-egg" } as const] : []),
                  ...(hasAE ? [{ key: "animeexpeditions", label: "Anime Expeditions", icon: "fa-compass" } as const] : []),
                  ...(hasAO ? [{ key: "animeorigin", label: "Anime Origins", icon: "fa-dragon" } as const] : []),
                ]
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTabOverride(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                    tab === t.key
                      ? "border-accent bg-accent text-bg"
                      : "border-line bg-surface text-zinc-400 hover:text-white"
                  }`}
                >
                  <i className={`fa-solid ${t.icon} text-[10px]`}></i>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <Loading text="Loading shared dashboard…" />
        ) : isAE ? (
          <>
            <AEStatsOverview players={tabPlayers} />
            <AEUnitVault players={tabPlayers} onSelectGroup={setSelectedAEGroup} onSelectSkin={setSelectedAESkin} />
            <div className="border-t border-line/60" />
            <section>
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
                  isReadOnly={true}
                />
                <AEAccountTable
                  players={filteredPlayers}
                  serverTime={serverTime}
                  skew={skew}
                  sortField={sortField}
                  onSortFieldChange={setSortField}
                  sortDir={sortDir}
                  onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  rowsPerPage={rowsPerPage}
                  onSelectPlayer={setSelectedAEPlayer}
                  isReadOnly={true}
                />
              </div>
            </section>
          </>
        ) : isAO ? (
          <>
            <AOStatsOverview players={tabPlayers} />
            <AOUnitVault players={tabPlayers} onSelectGroup={setSelectedAOGroup} />
            <div className="border-t border-line/60" />
            <section>
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
                  isReadOnly={true}
                />
                <AOAccountTable
                  players={filteredPlayers}
                  serverTime={serverTime}
                  skew={skew}
                  sortField={sortField}
                  onSortFieldChange={setSortField}
                  sortDir={sortDir}
                  onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  rowsPerPage={rowsPerPage}
                  onSelectPlayer={setSelectedAOPlayer}
                  isReadOnly={true}
                />
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Overview Stats */}
            <StatsOverview
              players={tabPlayers}
              onlineCount={counts.online}
              idleCount={counts.idle}
              offlineCount={counts.offline}
              pcCount={pcNames.length}
            />

            {/* Inventory Aggregation */}
            <InventorySection
              players={tabPlayers}
              onSelectItem={setSelectedItem}
            />

            <div className="border-t border-line/60" />

            {/* Accounts */}
            <section>
              <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                <i className="fa-solid fa-users text-[10px]"></i>
                Accounts
              </div>
              <div className="space-y-3">
                {/* Filter Controls */}
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
                  isReadOnly={true}
                />

                {/* Account Table */}
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
                  isReadOnly={true}
                />
              </div>
            </section>
          </>
        )}

        <footer className="border-t border-line/60 pt-4 text-center text-[11px] tabular-nums text-zinc-600">
          © XSPROB Dashboard · {counts.total} accounts · {counts.online} online
        </footer>
      </main>

      {/* Inspection Modals */}
      <AccountDetailModal
        player={selectedPlayer}
        serverTime={serverTime}
        onClose={() => setSelectedPlayer(null)}
      />

      <PetDetailModal
        data={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      <AEAccountDetailModal
        player={selectedAEPlayer}
        serverTime={serverTime}
        onClose={() => setSelectedAEPlayer(null)}
      />

      <AEUnitDetailModal
        group={selectedAEGroup}
        onClose={() => setSelectedAEGroup(null)}
      />

      <AESkinDetailModal
        group={selectedAESkin}
        onClose={() => setSelectedAESkin(null)}
      />

      <AOAccountDetailModal
        player={selectedAOPlayer}
        serverTime={serverTime}
        onClose={() => setSelectedAOPlayer(null)}
      />

      <AOUnitDetailModal
        group={selectedAOGroup}
        onClose={() => setSelectedAOGroup(null)}
      />
    </div>
  );
}
