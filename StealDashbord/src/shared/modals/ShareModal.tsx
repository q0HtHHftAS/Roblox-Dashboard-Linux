"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Switch } from "@/shared/ui/Switch";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareEnabled, setShareEnabled] = useState<boolean>(false);
  const [maskUsernames, setMaskUsernames] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/user/share")
      .then((res) => res.json())
      .then((data) => {
        setShareToken(data.shareToken);
        setShareEnabled(data.shareEnabled);
        setMaskUsernames(data.maskUsernames);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const updateShare = async (enabled: boolean, mask: boolean, regenerate = false) => {
    try {
      const res = await fetch("/api/user/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareEnabled: enabled,
          maskUsernames: mask,
          ...(regenerate ? { regenerateToken: true } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShareToken(data.shareToken);
        setShareEnabled(data.shareEnabled);
        setMaskUsernames(data.maskUsernames);
      }
    } catch {}
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareToken ? `${origin}/share/${shareToken}` : "";

  const copyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Public Read-Only Share Link" maxWidth="max-w-md">
      <div className="space-y-5">
        <p className="text-xs text-zinc-400">
          Share your real-time dashboard with friends or buyers. Viewers have read-only access and cannot see your API Key.
        </p>

        {loading ? (
          <div className="py-6 text-center text-xs text-zinc-500">Loading settings…</div>
        ) : (
          <>
            {/* Toggle Enable */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
              <div>
                <h4 className="text-xs font-bold text-white">Enable Public Link</h4>
                <p className="text-[11px] text-zinc-500">Anyone with the link can view live statistics.</p>
              </div>
              <Switch
                checked={shareEnabled}
                onChange={(val) => {
                  setShareEnabled(val);
                  updateShare(val, maskUsernames);
                }}
              />
            </div>

            {/* Toggle Masking */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
              <div>
                <h4 className="text-xs font-bold text-white">Mask Roblox Usernames</h4>
                <p className="text-[11px] text-zinc-500">Censors names to prevent witch-hunting (e.g. Ro****).</p>
              </div>
              <Switch
                checked={maskUsernames}
                onChange={(val) => {
                  setMaskUsernames(val);
                  updateShare(shareEnabled, val);
                }}
              />
            </div>

            {/* Share URL input */}
            {shareEnabled && shareUrl && (
              <div>
                <label className="text-xs font-semibold text-zinc-400">Shareable URL</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-emerald-400 select-all focus:outline-none"
                  />
                  <button
                    onClick={copyUrl}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent/85"
                  >
                    <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}></i>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={() => updateShare(shareEnabled, maskUsernames, true)}
                  title="Invalidate the current link and generate a new one"
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-amber-300 transition-colors"
                >
                  <i className="fa-solid fa-rotate text-[10px]"></i>
                  Rotate link (invalidate current URL)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
