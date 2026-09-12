"use client";
import React, { useCallback, useEffect, useState } from "react";
import { EnrollScreen, GateDenied, VerifyScreen, useAdminStatus } from "@/shared/admin/Gate";
import { Loading } from "@/shared/ui/Loading";

interface Row {
  id: string;
  actorDiscordId: string;
  action: string;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

const PAGE = 50;

export default function AdminAudit() {
  const { status, refresh } = useAdminStatus();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async (off: number) => {
    try {
      const res = await fetch(`/api/admin/audit?offset=${off}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setTotal(data.total);
      }
    } catch {
      // เงียบ
    }
  }, []);

  useEffect(() => {
    if (status === "ok") load(offset);
  }, [status, offset, load]);

  const clear = async () => {
    if (!window.confirm("Clear audit log ทั้งหมด? (retention ปกติ 90 วัน)")) return;
    try {
      const res = await fetch("/api/admin/audit", { method: "DELETE" });
      if (res.ok) {
        setOffset(0);
        load(0);
      }
    } catch {
      // เงียบ
    }
  };

  if (status === "loading") return <Loading />;
  if (status === "denied") return <GateDenied />;
  if (status === "enroll") return <EnrollScreen onOk={() => refresh()} />;
  if (status === "verify") return <VerifyScreen onOk={() => refresh()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-white">Audit Log ({total})</h1>
        <button
          onClick={clear}
          className="ml-auto rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-line2"
        >
          <i className="fa-solid fa-trash mr-1.5"></i>
          Clear all
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-zinc-500">
              <th className="px-3 py-2">เวลา</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Detail</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line2">
                <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                  {new Date(r.createdAt).toLocaleString("th-TH")}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-300">{r.actorDiscordId}</td>
                <td className="px-3 py-2 font-semibold text-white">{r.action}</td>
                <td className="max-w-[320px] truncate px-3 py-2 text-zinc-400">{r.detail ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-zinc-500">{r.ip ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                  ยังไม่มีบันทึก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          onClick={() => setOffset(Math.max(0, offset - PAGE))}
          disabled={offset === 0}
          className="rounded-lg bg-surface px-3 py-1.5 text-zinc-300 hover:bg-line2 disabled:opacity-40"
        >
          ← Newer
        </button>
        <span className="text-zinc-500">
          {offset + 1}–{Math.min(offset + PAGE, total)} / {total}
        </span>
        <button
          onClick={() => setOffset(offset + PAGE)}
          disabled={offset + PAGE >= total}
          className="rounded-lg bg-surface px-3 py-1.5 text-zinc-300 hover:bg-line2 disabled:opacity-40"
        >
          Older →
        </button>
      </div>
    </div>
  );
}
