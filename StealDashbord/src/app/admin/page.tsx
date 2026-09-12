"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { EnrollScreen, GateDenied, VerifyScreen, useAdminStatus } from "@/shared/admin/Gate";
import { Loading } from "@/shared/ui/Loading";

interface DayStat {
  date: string;
  pageviews: number;
  apiHits: number;
  routes: Record<string, number>;
}

interface PrevSnap {
  users: number;
  players: number;
  online: number;
}

interface LiveData {
  users: number;
  blocked: number;
  players: number;
  online: number;
  today: DayStat;
  prev: PrevSnap | null;
  byGame: Record<string, number>;
  serverTime: number;
}

// Realtime: live (เบา) ทุก 60 วิ, daily (หนัก 30 วัน) ทุก 10 นาที
const LIVE_MS = 60_000;
const DAILY_MS = 10 * 60_000;

const GAME_META: Record<string, { name: string; color: string }> = {
  stealanegg: { name: "Steal an Egg", color: "#6e7bf2" },
  animeexpeditions: { name: "Anime Expeditions", color: "#34d399" },
  animeorigin: { name: "Anime Origin", color: "#fbbf24" },
  bloxfruits: { name: "Blox Fruits", color: "#fb7185" },
};

function gameMeta(id: string): { name: string; color: string } {
  return GAME_META[id] ?? { name: id, color: "#71717a" };
}

function maxOf(daily: DayStat[]): number {
  return Math.max(1, ...daily.map((d) => Math.max(d.pageviews, d.apiHits)));
}

// ป้าย % เทียบเมื่อวาน — ไม่มีข้อมูลเมื่อวาน = ซ่อน (เริ่มมีหลัง deploy นี้ 1 วัน)
function Delta({ cur, prev }: { cur: number; prev: number | null | undefined }) {
  if (prev == null || prev <= 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        up ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
      }`}
    >
      {up ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

// โดนัทสัดส่วน accounts แยกตามเกม (SVG ล้วน)
function Donut({ data, total }: { data: { id: string; value: number }[]; total: number }) {
  const R = 60;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const s = { ...d, frac, offset: acc };
    acc += frac;
    return s;
  });
  return (
    <div className="flex items-center gap-5">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
        <circle cx="75" cy="75" r={R} fill="none" stroke="#272c34" strokeWidth="18" />
        {segs.map(
          (s) =>
            s.frac > 0 && (
              <circle
                key={s.id}
                cx="75"
                cy="75"
                r={R}
                fill="none"
                stroke={gameMeta(s.id).color}
                strokeWidth="18"
                strokeDasharray={`${s.frac * C} ${C}`}
                strokeDashoffset={-s.offset * C}
                transform="rotate(-90 75 75)"
                strokeLinecap="butt"
              />
            )
        )}
        <text x="75" y="72" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">
          {total.toLocaleString()}
        </text>
        <text x="75" y="90" textAnchor="middle" fill="#7c838f" fontSize="10">
          accounts
        </text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2 text-xs">
        {segs.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: gameMeta(s.id).color }} />
            <span className="truncate text-zinc-300">{gameMeta(s.id).name}</span>
            <span className="ml-auto shrink-0 font-bold text-white">
              {s.value.toLocaleString()}
              <span className="ml-1.5 font-normal text-zinc-500">{(s.frac * 100).toFixed(0)}%</span>
            </span>
          </div>
        ))}
        {segs.length === 0 && <p className="text-zinc-500">ยังไม่มีข้อมูล</p>}
      </div>
    </div>
  );
}

// กราฟเส้น traffic 30 วัน (SVG ล้วน: pageview + api hit)
function LineChart({ daily }: { daily: DayStat[] }) {
  const W = 600;
  const H = 190;
  const PAD_L = 34;
  const PAD_B = 18;
  const PAD_T = 8;
  const iw = W - PAD_L - 8;
  const ih = H - PAD_T - PAD_B;
  const m = maxOf(daily);
  const pt = (i: number, v: number): [number, number] => [
    PAD_L + (daily.length <= 1 ? iw / 2 : (i / (daily.length - 1)) * iw),
    PAD_T + ih - (v / m) * ih,
  ];
  const line = (pick: (d: DayStat) => number) =>
    daily.map((d, i) => pt(i, pick(d)).join(",")).join(" ");
  const area = (pick: (d: DayStat) => number) => {
    if (daily.length === 0) return "";
    const base = PAD_T + ih;
    const first = pt(0, pick(daily[0]));
    const last = pt(daily.length - 1, pick(daily[daily.length - 1]));
    return `M${first[0]},${base} L${line(pick).split(" ").join(" L")} L${last[0]},${base} Z`;
  };
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(m * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {ticks.map((t) => {
        const y = PAD_T + ih - (t / m) * ih;
        return (
          <g key={t}>
            <line x1={PAD_L} x2={W - 8} y1={y} y2={y} stroke="#272c34" strokeWidth="1" opacity="0.7" />
            <text x={PAD_L - 5} y={y + 3.5} textAnchor="end" fill="#636d83" fontSize="10">
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        );
      })}
      {daily.length > 0 && (
        <path d={area((d) => d.pageviews)} fill="#6e7bf2" opacity="0.12" />
      )}
      {daily.length > 1 && (
        <>
          <polyline points={line((d) => d.pageviews)} fill="none" stroke="#6e7bf2" strokeWidth="2" />
          <polyline points={line((d) => d.apiHits)} fill="none" stroke="#34d399" strokeWidth="2" />
        </>
      )}
      {daily.length === 1 && (
        <>
          <circle cx={pt(0, daily[0].pageviews)[0]} cy={pt(0, daily[0].pageviews)[1]} r="3.5" fill="#6e7bf2" />
          <circle cx={pt(0, daily[0].apiHits)[0]} cy={pt(0, daily[0].apiHits)[1]} r="3.5" fill="#34d399" />
        </>
      )}
      {daily.length > 1 && (
        <>
          <circle
            cx={pt(daily.length - 1, daily[daily.length - 1].pageviews)[0]}
            cy={pt(daily.length - 1, daily[daily.length - 1].pageviews)[1]}
            r="3.5"
            fill="#6e7bf2"
            stroke="#0b0d10"
            strokeWidth="1.5"
          />
        </>
      )}
      {[daily[0]?.date, daily[Math.floor(daily.length / 2)]?.date, daily[daily.length - 1]?.date].map(
        (label, i, arr) =>
          label && (
            <text
              key={`${label}-${i}`}
              x={i === 0 ? PAD_L : i === 1 ? PAD_L + iw / 2 : PAD_L + iw}
              y={H - 4}
              textAnchor={i === 0 ? "start" : i === 1 ? "middle" : "end"}
              fill="#636d83"
              fontSize="10"
            >
              {label.slice(arr.length > 1 && label === daily[daily.length - 1]?.date ? 5 : 0)}
            </text>
          )
      )}
    </svg>
  );
}

export default function AdminDashboard() {
  const { status, refresh } = useAdminStatus();
  const [daily, setDaily] = useState<DayStat[] | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [reEnroll, setReEnroll] = useState(false);

  // ของหนัก: daily 30 วัน (แถววันนี้ในนี้จะโดน live patch ทับทีหลัง)
  const loadDaily = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`stats ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.daily)) setDaily(data.daily);
    } catch {
      setError("โหลดกราฟ 30 วันไม่สำเร็จ — จะลองใหม่รอบหน้า");
    }
  }, []);

  // ของเบา: counts + แถววันนี้ + snapshot เมื่อวาน + แยกเกม
  const loadLive = useCallback(async (quiet = false) => {
    try {
      const res = await fetch("/api/admin/live", { cache: "no-store" });
      if (!res.ok) throw new Error(`live ${res.status}`);
      const data: LiveData = await res.json();
      setLive(data);
      setUpdatedAt(data.serverTime ?? Date.now());
      setError(null);
    } catch {
      if (!quiet) setError("อัพเดท realtime ไม่สำเร็จ — เลขที่เห็นอาจค้าง");
    }
  }, []);

  const refreshAll = useCallback(() => {
    void loadDaily();
    void loadLive();
  }, [loadDaily, loadLive]);

  useEffect(() => {
    if (status !== "ok") return;
    void loadDaily();
    void loadLive();
    try {
      if (localStorage.getItem("sd_reenroll") === "1") {
        setReEnroll(true);
        localStorage.removeItem("sd_reenroll");
      }
    } catch {
      // เงียบ
    }
    // poll live ทุก 60 วิ — ข้ามรอบตอน tab ซ่อน (ประหยัด DB + แบต)
    const liveTimer = setInterval(() => {
      if (!document.hidden) void loadLive(true);
    }, LIVE_MS);
    // daily หนัก — หน่วง 10 นาที
    const dailyTimer = setInterval(() => {
      void loadDaily();
    }, DAILY_MS);
    // กลับมาหน้าเดิม = ดึงทันที 1 ครั้ง (กันเลขค้างหลังซ่อน tab นาน)
    const onVisible = () => {
      if (!document.hidden) void loadLive(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(liveTimer);
      clearInterval(dailyTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, loadDaily, loadLive]);

  const onVerified = (data: { reEnroll?: boolean }) => {
    if (data.reEnroll) {
      try {
        localStorage.setItem("sd_reenroll", "1");
      } catch {
        // เงียบ
      }
    }
    refresh().then(() => refreshAll());
  };

  // กราฟ = daily ที่ cache ไว้ + แท่งสุดท้าย patch ด้วยเลข "วันนี้" สดจาก /live
  const chartDaily = useMemo<DayStat[]>(() => {
    if (!daily) return live ? [live.today] : [];
    if (!live) return daily;
    const last = daily[daily.length - 1];
    if (!last) return [live.today];
    if (last.date === live.today.date) return [...daily.slice(0, -1), live.today];
    if (last.date < live.today.date) return [...daily, live.today];
    return daily;
  }, [daily, live]);

  const topRoutes = useMemo(() => {
    const agg = new Map<string, number>();
    for (const d of chartDaily) {
      for (const [r, n] of Object.entries(d.routes)) agg.set(r, (agg.get(r) ?? 0) + n);
    }
    return [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [chartDaily]);

  // วันที่เลือกดู (default = แท่งล่าสุด) + top routes ของวันนั้น
  const selected = useMemo(() => {
    if (chartDaily.length === 0) return null;
    return chartDaily.find((d) => d.date === selDate) ?? chartDaily[chartDaily.length - 1];
  }, [chartDaily, selDate]);
  const selectedTopRoutes = useMemo(() => {
    if (!selected) return [] as [string, number][];
    return Object.entries(selected.routes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [selected]);

  const byGame = useMemo(() => {
    const entries = Object.entries(live?.byGame ?? {});
    const total = entries.reduce((s, [, n]) => s + n, 0);
    return {
      list: entries
        .map(([id, value]) => ({ id, value }))
        .sort((a, b) => b.value - a.value),
      total,
    };
  }, [live]);

  const lineSummary = useMemo(() => {
    const pv = chartDaily.reduce((s, d) => s + d.pageviews, 0);
    const api = chartDaily.reduce((s, d) => s + d.apiHits, 0);
    return {
      totalPv: pv,
      avgPv: chartDaily.length > 0 ? pv / chartDaily.length : 0,
      totalApi: api,
    };
  }, [chartDaily]);

  if (status === "loading") return <Loading />;
  if (status === "denied") return <GateDenied />;
  if (status === "enroll") return <EnrollScreen onOk={() => refresh().then(() => refreshAll())} />;
  if (status === "verify") return <VerifyScreen onOk={onVerified} />;

  const m = maxOf(chartDaily);
  const cards = [
    { label: "Users", value: live?.users ?? 0, prev: live?.prev?.users, icon: "fa-users", color: "text-sky-400", sub: "ทั้งหมดที่เคย login" },
    { label: "Accounts tracked", value: live?.players ?? 0, prev: live?.prev?.players, icon: "fa-gamepad", color: "text-emerald-400", sub: "ทุกเกมรวมกัน" },
    { label: "Online now", value: live?.online ?? 0, prev: live?.prev?.online, icon: "fa-signal", color: "text-amber-300", sub: "active ใน 90 วินาที" },
  ];

  return (
    <div className="space-y-4">
      {reEnroll && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          คุณ login ด้วย backup code — แนะนำให้ไป Settings → Reset 2FA แล้วสแกน QR ใหม่กับมือถือเครื่องปัจจุบัน
        </div>
      )}

      {/* แถบสถานะ realtime */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
          </span>
          {updatedAt
            ? `Live — อัพเดทล่าสุด ${new Date(updatedAt).toLocaleTimeString("th-TH", { hour12: false })}`
            : "กำลังโหลด…"}
        </span>
        <button
          onClick={refreshAll}
          className="rounded-lg border border-line bg-surface px-2.5 py-1 font-bold text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          <i className="fa-solid fa-rotate-right mr-1.5"></i>
          Refresh
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* การ์ด 3 ใบ + ป้าย % เทียบเมื่อวาน */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{c.label}</p>
              <Delta cur={c.value} prev={c.prev} />
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">{c.sub}</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <i className={`fa-solid ${c.icon} text-sm ${c.color}`}></i>
              </span>
              <p className="text-3xl font-bold text-white">{c.value.toLocaleString()}</p>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">vs เมื่อวาน</p>
          </div>
        ))}
      </div>

      {/* โดนัท + กราฟเส้น */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Overview — 30 วันย้อนหลัง</h2>
          <div className="flex gap-3 text-[11px] text-zinc-400">
            <span><i className="fa-solid fa-square mr-1 text-accent"></i>pageview</span>
            <span><i className="fa-solid fa-square mr-1 text-emerald-400"></i>api hit</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="mb-3 text-xs text-zinc-400">Accounts by Game</p>
            <Donut data={byGame.list} total={byGame.total} />
          </div>
          <div className="lg:col-span-3">
            <p className="mb-3 text-xs text-zinc-400">Traffic</p>
            <LineChart daily={chartDaily} />
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line2 pt-3 text-center">
              <div>
                <p className="text-[11px] text-zinc-500">Total pageviews</p>
                <p className="text-lg font-bold text-white">{Math.round(lineSummary.totalPv).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Daily avg</p>
                <p className="text-lg font-bold text-white">{lineSummary.avgPv.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Total API hits</p>
                <p className="text-lg font-bold text-white">{Math.round(lineSummary.totalApi).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* แท่ง traffic กดได้ + รายละเอียดรายวัน */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Traffic — รายวัน (กดแท่งดูรายละเอียด)</h2>
          <div className="flex gap-3 text-[11px] text-zinc-400">
            <span><i className="fa-solid fa-square mr-1 text-accent"></i>pageview</span>
            <span><i className="fa-solid fa-square mr-1 text-emerald-400"></i>api hit</span>
          </div>
        </div>
        <div className="mt-4 flex h-40 items-end gap-[3px]">
          {chartDaily.map((d) => {
            const isSel = selected?.date === d.date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelDate(d.date)}
                title={`${d.date}${d.date === live?.today.date ? " (วันนี้, live)" : ""}\nPV ${d.pageviews} / API ${d.apiHits}\nคลิกเพื่อดูรายละเอียด`}
                aria-pressed={isSel}
                className={`flex flex-1 cursor-pointer items-end gap-[2px] self-stretch rounded-sm transition hover:brightness-125 focus:outline-none ${isSel ? "ring-1 ring-white/50" : ""}`}
              >
                <div className={`flex-1 rounded-sm ${isSel ? "bg-accent" : "bg-accent/80"}`} style={{ height: `${(d.pageviews / m) * 100}%` }} />
                <div className={`flex-1 rounded-sm ${isSel ? "bg-emerald-400" : "bg-emerald-400/70"}`} style={{ height: `${(d.apiHits / m) * 100}%` }} />
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
          <span>{chartDaily[0]?.date}</span>
          <span>{chartDaily[chartDaily.length - 1]?.date}</span>
        </div>
        {selected && (
          <div className="mt-3 rounded-lg border border-line2 bg-black/20 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-white">
                {selected.date}
                {selected.date === live?.today.date && (
                  <span className="ml-2 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    live
                  </span>
                )}
              </p>
              <p className="text-zinc-400">
                Pageview <span className="font-bold text-white">{selected.pageviews.toLocaleString()}</span>
                <span className="mx-1.5 text-zinc-600">·</span>
                API hit <span className="font-bold text-white">{selected.apiHits.toLocaleString()}</span>
              </p>
            </div>
            {selectedTopRoutes.length > 0 ? (
              <div className="mt-2 space-y-1">
                {selectedTopRoutes.map(([r, n]) => (
                  <div key={r} className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-zinc-300">{r}</span>
                    <span className="shrink-0 font-bold text-white">{n.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-zinc-500">วันนี้ยังไม่มี API hit (เริ่มนับตั้งแต่ deploy นี้เป็นต้นไป)</p>
            )}
          </div>
        )}
      </div>

      {/* สัดส่วนเกม + Top routes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-white">Accounts by Game</h2>
          <div className="mt-3 space-y-3">
            {byGame.list.map((g) => {
              const frac = byGame.total > 0 ? g.value / byGame.total : 0;
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{gameMeta(g.id).name}</span>
                    <span className="font-bold text-white">
                      {g.value.toLocaleString()}
                      <span className="ml-1.5 font-normal text-zinc-500">{(frac * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${frac * 100}%`, background: gameMeta(g.id).color }}
                    />
                  </div>
                </div>
              );
            })}
            {byGame.list.length === 0 && <p className="text-xs text-zinc-500">ยังไม่มีข้อมูล</p>}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-white">Top API routes — 30 วัน</h2>
          {topRoutes.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">ยังไม่มีข้อมูล (เริ่มนับตั้งแต่ deploy นี้เป็นต้นไป)</p>
          ) : (
            <table className="mt-2 w-full text-xs">
              <tbody>
                {topRoutes.map(([r, n]) => (
                  <tr key={r} className="border-t border-line2">
                    <td className="py-1.5 font-mono text-zinc-300">{r}</td>
                    <td className="py-1.5 text-right font-bold text-white">{n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
