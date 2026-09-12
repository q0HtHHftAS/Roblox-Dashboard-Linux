"use client";
import React, { useCallback, useEffect, useState } from "react";
import { EnrollScreen, GateDenied, VerifyScreen, useAdminStatus } from "@/shared/admin/Gate";
import { Loading } from "@/shared/ui/Loading";

interface AdminUser {
  id: string;
  discordId: string | null;
  name: string | null;
  image: string | null;
  isBlocked: boolean;
  totpEnabled: boolean;
  hasApiKey: boolean;
  shareEnabled: boolean;
  players: number;
  createdAt: string;
}

export default function AdminUsers() {
  const { status, refresh } = useAdminStatus();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [newKey, setNewKey] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch {
      // เงียบ
    }
  }, []);

  useEffect(() => {
    if (status === "ok") load();
  }, [status, load]);

  const act = async (id: string, op: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(id + op);
    setNewKey("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, op }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.apiKey) setNewKey(data.apiKey);
        load();
      } else {
        window.alert(data.error || "Action failed");
      }
    } catch {
      window.alert("Network error");
    } finally {
      setBusy("");
    }
  };

  if (status === "loading") return <Loading />;
  if (status === "denied") return <GateDenied />;
  if (status === "enroll") return <EnrollScreen onOk={() => refresh()} />;
  if (status === "verify") return <VerifyScreen onOk={() => refresh()} />;

  const shown = users.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (u.name ?? "").toLowerCase().includes(s) || (u.discordId ?? "").includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-white">Users ({total})</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นชื่อ / discord id…"
          className="ml-auto w-64 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-white focus:border-accent focus:outline-none"
        />
      </div>

      {newKey && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs font-bold text-emerald-300">API key ใหม่ (โชว์ครั้งเดียว — เอาไปวางในสคริปต์ทันที)</p>
          <code className="mt-1 block break-all rounded bg-black/40 p-2 font-mono text-xs text-white">{newKey}</code>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-zinc-500">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Discord ID</th>
              <th className="px-3 py-2 text-center">Accounts</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-t border-line2">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {u.image && <img src={u.image} alt="" className="h-6 w-6 rounded-full" />}
                    <span className="font-semibold text-white">{u.name ?? "(no name)"}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-zinc-400">{u.discordId ?? "-"}</td>
                <td className="px-3 py-2 text-center text-zinc-300">{u.players}</td>
                <td className="px-3 py-2 text-center">
                  {u.isBlocked ? (
                    <span className="rounded bg-rose-500/15 px-2 py-0.5 font-bold text-rose-400">blocked</span>
                  ) : (
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-400">active</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    {u.isBlocked ? (
                      <button
                        onClick={() => act(u.id, "unblock")}
                        disabled={!!busy}
                        className="rounded-lg bg-surface px-2.5 py-1 font-semibold text-emerald-300 hover:bg-line2 disabled:opacity-50"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => act(u.id, "block", `Block ${u.name ?? u.discordId}? จะห้ามทั้ง login และยิง ingest`)}
                        disabled={!!busy}
                        className="rounded-lg bg-surface px-2.5 py-1 font-semibold text-amber-300 hover:bg-line2 disabled:opacity-50"
                      >
                        Block
                      </button>
                    )}
                    <button
                      onClick={() => act(u.id, "resetKey", `Reset API key ของ ${u.name ?? u.discordId}? สคริปต์เดิมจะใช้ไม่ได้ทันที`)}
                      disabled={!!busy}
                      className="rounded-lg bg-surface px-2.5 py-1 font-semibold text-sky-300 hover:bg-line2 disabled:opacity-50"
                    >
                      Reset key
                    </button>
                    <button
                      onClick={() => act(u.id, "delete", `DELETE ${u.name ?? u.discordId} + ข้อมูลทั้งหมด? ย้อนกลับไม่ได้`)}
                      disabled={!!busy}
                      className="rounded-lg bg-surface px-2.5 py-1 font-semibold text-rose-400 hover:bg-line2 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                  ไม่พบ user
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
