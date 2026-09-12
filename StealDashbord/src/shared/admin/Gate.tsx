"use client";
import React, { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

export type GateStatus = "loading" | "denied" | "enroll" | "verify" | "ok";

export function useAdminStatus() {
  const [status, setStatus] = useState<GateStatus>("loading");
  const [codesLeft, setCodesLeft] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status");
      if (res.status === 404) {
        setStatus("denied");
        return "denied" as GateStatus;
      }
      const data = await res.json();
      setStatus(data.status);
      setCodesLeft(typeof data.codesLeft === "number" ? data.codesLeft : null);
      return data.status as GateStatus;
    } catch {
      setStatus("denied");
      return "denied" as GateStatus;
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { status, codesLeft, refresh };
}

export function GateDenied() {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-[#ef4444]">
        <i className="fa-solid fa-xmark text-2xl text-black"></i>
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">
        Authorization
        <br />
        failed
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        หน้านี้สำหรับแอดมินเท่านั้น กรุณา login ด้วย Discord ของแอดมิน
      </p>
      <button
        onClick={() => signIn("discord", { callbackUrl: "/admin" })}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-xs font-bold text-white hover:bg-[#4752c4]"
      >
        Login with Discord
      </button>
    </div>
  );
}

export function VerifyScreen({ onOk }: { onOk: (data: { reEnroll?: boolean }) => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();
      if (res.ok) {
        onOk(data);
      } else {
        setErr(data.error || "Invalid code");
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-accent">
        <i className="fa-solid fa-mobile-screen text-2xl text-white"></i>
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">Two-factor authentication</h1>
      <p className="mt-2 text-sm text-zinc-400">
        เปิดแอป Authenticator แล้วกรอกโค้ด 6 หลัก (หรือ backup code กรณีฉุกเฉิน)
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={16}
        placeholder="123 456"
        className="mt-5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-2xl font-mono tracking-[0.3em] text-white focus:border-accent focus:outline-none"
      />
      {err && <p className="mt-3 text-xs text-rose-400">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !code}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/85 disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Verify"}
      </button>
    </div>
  );
}

export function EnrollScreen({ onOk }: { onOk: () => void }) {
  const [step, setStep] = useState<"start" | "scan">("start");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/totp/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQr(data.qr);
        setSecret(data.secret);
        setCodes(data.backupCodes);
        setStep("scan");
      } else {
        setErr(data.error || "Setup failed");
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();
      if (res.ok) onOk();
      else setErr(data.error || "Invalid code");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (step === "start") {
    return (
      <div className="mx-auto mt-16 max-w-sm text-center">
        <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-accent">
          <i className="fa-solid fa-qrcode text-2xl text-white"></i>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">เปิดใช้ 2FA ครั้งแรก</h1>
        <p className="mt-2 text-sm text-zinc-400">
          สแกน QR ด้วย Microsoft/Google Authenticator แล้วกรอกโค้ดเพื่อยืนยัน
          QR นี้โชว์แค่ครั้งเดียว
        </p>
        {err && <p className="mt-3 text-xs text-rose-400">{err}</p>}
        <button
          onClick={start}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/85 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate QR code"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <h1 className="text-xl font-bold text-white">สแกนด้วยแอป Authenticator</h1>
      {qr && (
        <img src={qr} alt="TOTP QR" className="mx-auto mt-4 h-52 w-52 rounded-xl border border-line bg-white p-2" />
      )}
      <p className="mt-3 text-xs text-zinc-400">
        พิมพ์เอง: <code className="font-mono text-amber-300 break-all">{secret}</code>
      </p>
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
        <p className="text-xs font-bold text-amber-300">
          <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
          Backup codes — เซฟไว้ที่ปลอดภัย ใช้ได้ครั้งละ 1 โค้ด (มี 10 โค้ด)
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs text-zinc-200">
          {codes.map((c) => (
            <span key={c} className="rounded bg-black/30 px-2 py-1">{c}</span>
          ))}
        </div>
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        placeholder="โค้ด 6 หลักจากแอป"
        className="mt-4 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-xl font-mono tracking-[0.3em] text-white focus:border-accent focus:outline-none"
      />
      {err && <p className="mt-3 text-xs text-rose-400">{err}</p>}
      <button
        onClick={confirm}
        disabled={busy || !code}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/85 disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Confirm & enable 2FA"}
      </button>
    </div>
  );
}
