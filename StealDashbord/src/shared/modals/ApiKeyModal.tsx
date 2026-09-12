"use client";
import React, { useState } from "react";
import { Modal } from "@/shared/ui/Modal";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  // null = คีย์ถูกเก็บแบบ hash ไว้Only — ต้องกด Regenerate ถึงจะได้คีย์ใหม่มาโชว์ครั้งเดียว
  apiKey: string | null;
  onKeyRegenerated: (newKey: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, apiKey, onKeyRegenerated }: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/api-key", { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate API key");
      const json = await res.json();
      onKeyRegenerated(json.apiKey);
      setConfirming(false);
    } catch (e: any) {
      setError(e.message || "Error regenerating key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Key Settings" maxWidth="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400">Current API Key</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={apiKey || "•••••••• (hidden — regenerate to reveal)"}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-zinc-300 select-all focus:outline-none"
            />
            <button
              onClick={copyKey}
              disabled={!apiKey}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}></i>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {apiKey
              ? "Keep this key confidential. Anyone with this key can send bot metrics to your dashboard."
              : "คีย์ถูกเก็บแบบซ่อนเพื่อความปลอดภัย — กด Regenerate ด้านล่างเพื่อออกคีย์ใหม่ (จะโชว์แค่ครั้งเดียว จดไว้ก่อนปิด)"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-line bg-white/[0.02] p-4">
          {!confirming ? (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Regenerate API Key</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Revoke this key and create a new one.
                </p>
              </div>
              <button
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
              >
                Regenerate
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-amber-300">
                Are you sure? All currently active Roblox scripts will be disconnected until you paste the new key into them.
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={loading}
                  onClick={handleRegenerate}
                  className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
                >
                  {loading ? "Regenerating…" : "Confirm & Invalidate Old Key"}
                </button>
                <button
                  disabled={loading}
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
