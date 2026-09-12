"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface DashboardHeaderProps {
  session: Session | null;
  status: "authenticated" | "loading" | "unauthenticated";
  onlineCount: number;
  totalCount: number;
  gameName?: string | null;
  gameIcon?: string;
  gameLogo?: string | null;
  isReadOnly?: boolean;
  ownerName?: string;
  onBackToHub?: () => void;
  onOpenScript?: () => void;
  onOpenApiKey?: () => void;
  onOpenShare?: () => void;
  hideOnline?: boolean;
}

// index รูป default ของ Discord จาก user id (สูตรเดียวกับ provider ฝั่ง server:
// discriminator "0" → (id >> 22) % 6) — URL นี้มีตัวตนเสมอ ใช้เป็นด่านกลาง
// ระหว่างรูปจริงกับตัวอักษร
function defaultAvatarIndex(discordId: string): number {
  try {
    return Number((BigInt(discordId) >> BigInt(22)) % BigInt(6));
  } catch {
    return 0;
  }
}

// รูปโปรไฟล์แบบลำดับขั้น: รูปจริง (session) → รูป default ของ Discord → ตัวอักษร
// ครอบเคส "เปลี่ยนรูป Discord แล้ว hash เก่า 404" โดยไม่ต้อง login ใหม่
function ChainedAvatar({
  src,
  discordId,
  username,
  imgClassName,
  fallbackClassName,
}: {
  src: string;
  discordId?: string;
  username: string;
  imgClassName: string;
  fallbackClassName: string;
}) {
  const [stage, setStage] = React.useState(0);
  const defaultUrl = discordId
    ? `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(discordId)}.png`
    : "";

  // src เปลี่ยน (login ใหม่ / session รีเฟรช) ให้เริ่มลองจากรูปจริงใหม่
  React.useEffect(() => {
    setStage(0);
  }, [src]);

  if (src && stage === 0) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setStage(defaultUrl ? 1 : 2)}
        className={imgClassName}
      />
    );
  }
  if (defaultUrl && stage === 1) {
    return (
      <img
        src={defaultUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setStage(2)}
        className={imgClassName}
      />
    );
  }
  return (
    <span className={fallbackClassName}>
      {username.charAt(0).toUpperCase()}
    </span>
  );
}

export function DashboardHeader({
  session,
  status,
  onlineCount,
  totalCount,
  gameName,
  gameIcon,
  gameLogo,
  isReadOnly = false,
  ownerName,
  onBackToHub,
  onOpenScript,
  onOpenApiKey,
  onOpenShare,
  hideOnline = false,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const router = useRouter();
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const username = session?.user?.name || "User";
  const userHandle = username.toLowerCase().replace(/\s+/g, "");
  const discordId = (session?.user as any)?.discordId as string | undefined;
  const avatarUrl = session?.user?.image || "";

  // เมนู Admin โผล่เฉพาะ admin ที่ login แล้ว (Q13) — เช็คผ่าน status endpoint (404 = ไม่ใช่)
  const [isAdmin, setIsAdmin] = React.useState(false);
  React.useEffect(() => {
    if (status !== "authenticated") {
      setIsAdmin(false);
      return;
    }
    fetch("/api/admin/status")
      .then((r) => setIsAdmin(r.status !== 404))
      .catch(() => setIsAdmin(false));
  }, [status]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#14181d]">
      <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand & Game breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              title="Return to Game Hub"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </button>
          )}

          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              title="Back to Game Hub"
              onClick={() => {
                if (onBackToHub) onBackToHub();
                else router.push("/");
              }}
              className="inline-flex shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-accent"
            >
              XSPROB
            </button>
            {gameName && (
              <>
                <span className="hidden h-4 w-px shrink-0 bg-line sm:block"></span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  {gameLogo ? (
                    <img src={gameLogo} alt="" className="h-5 w-5 shrink-0 rounded-md object-cover" />
                  ) : (
                    <i className={`fa-solid ${gameIcon || "fa-gamepad"} text-accent text-xs shrink-0`}></i>
                  )}
                  <span className="hidden truncate min-[400px]:inline">{gameName}</span>
                </span>
              </>
            )}
            {isReadOnly && (
              <span className="rounded bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                VIEW-ONLY {ownerName ? `(${ownerName})` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              {onOpenScript && (
                <button
                  onClick={onOpenScript}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-bg transition-colors hover:bg-accent/85"
                >
                  <i className="fa-solid fa-code text-xs"></i>
                  <span className="hidden sm:inline">Get Script</span>
                </button>
              )}

              {onOpenShare && (
                <button
                  onClick={onOpenShare}
                  title="Share Live Dashboard"
                  className="hidden h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:grid"
                >
                  <i className="fa-solid fa-share-nodes text-xs"></i>
                </button>
              )}

              {onOpenApiKey && (
                <button
                  onClick={onOpenApiKey}
                  title="API Key Settings"
                  className="hidden h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:grid"
                >
                  <i className="fa-solid fa-key text-xs"></i>
                </button>
              )}

              {!hideOnline && (
                <span className="hidden h-5 w-px bg-line sm:block"></span>
              )}
            </>
          )}

          {/* Live Online Counter — hub (/): hideOnline=true ซ่อนทั้งเม็ด (หน้าเกมโชว์เฉพาะเกมนั้นเหมือนเดิม) */}
          {!hideOnline && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            {onlineCount} / {totalCount} Online
          </span>
          )}

          {/* User Auth Section with Custom Dropdown */}
          {!isReadOnly && (
            <div>
              {status === "authenticated" && session ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface/80 pl-1 pr-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500 hover:bg-surface transition-colors"
                  >
                    <ChainedAvatar
                      src={avatarUrl}
                      discordId={discordId}
                      username={username}
                      imgClassName="h-6 w-6 rounded-full object-cover"
                      fallbackClassName="grid h-6 w-6 place-items-center rounded-full bg-[#5865F2]/20 text-[#5865F2] text-xs font-bold"
                    />
                    <span className="max-w-[56px] truncate font-bold text-white sm:max-w-[110px]">
                      {username}
                    </span>
                    <i className={`fa-solid fa-chevron-down text-[10px] text-zinc-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}></i>
                  </button>

                  {/* Account Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-line bg-[#14181d] p-3 shadow-2xl shadow-black/90 ring-1 ring-white/10 dropdown-in">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        SIGNED IN
                      </div>

                      <div className="flex items-center gap-3 px-2 py-2">
                        <ChainedAvatar
                          src={avatarUrl}
                          discordId={discordId}
                          username={username}
                          imgClassName="h-11 w-11 rounded-full object-cover border border-white/10"
                          fallbackClassName="grid h-11 w-11 place-items-center rounded-full bg-[#5865F2]/20 text-[#5865F2] text-lg font-bold"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-white">
                            {username}
                          </div>
                          <div className="truncate text-xs text-zinc-400 font-medium">
                            @{userHandle}
                          </div>
                          {discordId && (
                            <div className="truncate text-[10px] text-zinc-500 font-mono mt-0.5">
                              ID: {discordId}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="my-2 h-px bg-line/80"></div>

                      {/* Quick action shortcuts */}
                      <div className="space-y-0.5">
                        {onOpenScript && (
                          <button
                            onClick={() => { setMenuOpen(false); onOpenScript(); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                          >
                            <i className="fa-solid fa-code text-xs text-accent"></i>
                            Get Roblox Script
                          </button>
                        )}
                        {onOpenApiKey && (
                          <button
                            onClick={() => { setMenuOpen(false); onOpenApiKey(); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                          >
                            <i className="fa-solid fa-key text-xs text-amber-400"></i>
                            API Key Settings
                          </button>
                        )}
                        {onOpenShare && (
                          <button
                            onClick={() => { setMenuOpen(false); onOpenShare(); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                          >
                            <i className="fa-solid fa-share-nodes text-xs text-sky-400"></i>
                            Share Dashboard
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => { setMenuOpen(false); router.push("/admin"); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                          >
                            <i className="fa-solid fa-shield-halved text-xs text-rose-400"></i>
                            Admin Panel
                          </button>
                        )}
                      </div>

                      <div className="my-2 h-px bg-line/80"></div>

                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : status === "unauthenticated" ? (
                <button
                  onClick={() => signIn("discord")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#5865F2] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#4752c4]"
                >
                  <i className="fa-brands fa-discord text-sm"></i>
                  Login
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
