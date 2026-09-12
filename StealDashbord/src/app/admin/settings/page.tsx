"use client";
import React, { useCallback, useEffect, useState } from "react";
import { EnrollScreen, GateDenied, VerifyScreen, useAdminStatus } from "@/shared/admin/Gate";
import { Loading } from "@/shared/ui/Loading";

const FIELDS = [
  { key: "siteName", label: "ชื่อเว็บ", kind: "text" },
  { key: "contactInfo", label: "ข้อมูลติดต่อ", kind: "text" },
  { key: "registrationEnabled", label: "รับสมาชิกใหม่ (Discord login)", kind: "bool" },
  { key: "shareDefaultEnabled", label: "เปิด share link ให้ user ใหม่เป็นค่าเริ่มต้น", kind: "bool" },
] as const;

export default function AdminSettings() {
  const { status, refresh } = useAdminStatus();
  const [values, setValues] = useState<Record<string, string>>({});
  const [readonly, setReadonly] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setValues(data.settings);
        setReadonly(data.readonly);
      }
    } catch {
      // เงียบ
    }
  }, []);

  useEffect(() => {
    if (status === "ok") load();
  }, [status, load]);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        const data = await res.json();
        setValues(data.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // เงียบ
    } finally {
      setBusy(false);
    }
  };

  const reset2fa = async () => {
    if (!window.confirm("Reset 2FA? รอบหน้าเข้า /admin จะต้องสแกน QR ใหม่")) return;
    try {
      const res = await fetch("/api/admin/totp/reset", { method: "POST" });
      if (res.ok) refresh();
    } catch {
      // เงียบ
    }
  };

  if (status === "loading") return <Loading />;
  if (status === "denied") return <GateDenied />;
  if (status === "enroll") return <EnrollScreen onOk={() => refresh()} />;
  if (status === "verify") return <VerifyScreen onOk={() => refresh()} />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-bold text-white">Settings</h1>

      <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-zinc-400">{f.label}</label>
            {f.kind === "bool" ? (
              <div className="mt-1.5 flex gap-2">
                {(["true", "false"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setValues((s) => ({ ...s, [f.key]: v }))}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
                      values[f.key] === v
                        ? "bg-accent text-white"
                        : "bg-bg text-zinc-400 hover:text-white"
                    }`}
                  >
                    {v === "true" ? "ON" : "OFF"}
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
              />
            )}
          </div>
        ))}
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/85 disabled:opacity-50"
        >
          {saved ? "Saved!" : busy ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-bold text-white">Server values (read-only)</h2>
        <p className="mt-1 text-[11px] text-zinc-500">ค่า env ต้องแก้ที่ไฟล์ + restart — แก้ผ่าน UI ไม่ได้</p>
        <table className="mt-2 w-full text-xs">
          <tbody>
            {Object.entries(readonly).map(([k, v]) => (
              <tr key={k} className="border-t border-line2">
                <td className="py-1.5 font-mono text-zinc-500">{k}</td>
                <td className="py-1.5 text-right font-mono text-zinc-300">{v || "(empty)"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
        <h2 className="text-sm font-bold text-rose-300">Danger zone</h2>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-xs text-zinc-400">ล้าง 2FA ของตัวเองแล้ว enroll ใหม่ (เช่น เปลี่ยนมือถือ)</p>
          <button
            onClick={reset2fa}
            className="ml-auto rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
          >
            Reset 2FA
          </button>
        </div>
      </div>
    </div>
  );
}
