"use client";
import React, { useState, useMemo } from "react";
import { Modal } from "@/shared/ui/Modal";

const LUA_KEYWORDS = new Set([
  "local", "function", "end", "if", "then", "else", "elseif",
  "for", "while", "do", "return", "break", "in", "and", "or",
  "not", "true", "false", "nil", "repeat", "until",
]);

const LUA_BUILTIN_VARS = new Set([
  "game", "getgenv", "workspace", "script", "_G", "_VERSION",
]);

const LUA_BUILTIN_FNS = new Set([
  "loadstring", "tostring", "tonumber", "pcall", "xpcall", "print",
  "warn", "pairs", "ipairs", "require", "select", "unpack",
]);

// Ordered tokenizer: comment -> string -> number -> identifier.
// Keywords / builtins / calls are classified after matching so that
// occurrences inside strings or comments are never highlighted.
const LUA_TOKEN_RE =
  /(--\[\[[\s\S]*?\]\]|--[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*)/g;

function highlightLua(code: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  LUA_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LUA_TOKEN_RE.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const tok = m[0];
    let cls: string | null = null;
    if (tok.startsWith("--")) {
      cls = "text-[#636d83] italic";
    } else if (tok.startsWith('"') || tok.startsWith("'")) {
      cls = "text-[#d19a66]";
    } else if (/^\d/.test(tok)) {
      cls = "text-[#d19a66]";
    } else if (LUA_KEYWORDS.has(tok)) {
      cls = "text-[#c678dd]";
    } else if (LUA_BUILTIN_VARS.has(tok)) {
      cls = "text-[#e06c75]";
    } else if (LUA_BUILTIN_FNS.has(tok)) {
      cls = "text-[#61afef]";
    } else if (/^\s*\(/.test(code.slice(LUA_TOKEN_RE.lastIndex))) {
      // identifier followed by `(` -> function / method call
      cls = "text-[#61afef]";
    }
    out.push(
      cls ? (
        <span key={k++} className={cls}>
          {tok}
        </span>
      ) : (
        tok
      )
    );
    last = m.index + tok.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  // null = คีย์ถูกเก็บแบบ hash — ต้องไป Regenerate ใน API Key Settings ก่อนถึงจะได้สคริปต์
  apiKey: string | null;
  discordId?: string;
  origin?: string;
}

export function ScriptModal({ isOpen, onClose, apiKey, discordId, origin = "" }: ScriptModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPc, setSelectedPc] = useState("PC-001");

  // Q7-A: baseUrl มาจาก origin/window.location.origin ตามโดเมนที่ user เปิดอยู่จริง
  // ถ้าไม่มีเลย (SSR) fallback ไป canonical แทน localhost — user นอกเครื่องจะได้สคริปต์ที่ใช้ได้เลย
  const CANONICAL_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://kernelos-pc.tailba1ab3.ts.net";
  const baseUrl =
    origin || (typeof window !== "undefined" ? window.location.origin : "") || CANONICAL_URL;
  const ingestUrl = `${baseUrl}/api/ingest`;
  // เตือนถ้าเว็บรันบน http (นอก localhost): api_key จะวิ่งเป็น cleartext ใครดักได้ยิงข้อมูลปลอมเข้า dashboard ได้
  const isInsecure =
    /^http:\/\//i.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(baseUrl);

  // สคริปต์โหลดผ่าน route ที่มี auth — ต้องแนบ ?key= ไปด้วยเสมอ (game:HttpGet ใส่ header ไม่ได้)
  // key หลุด = ใครก็โหลดสคริปต์ได้ + ยิง ingest ปลอมได้ → หลุดเมื่อไหร่กด Regenerate ทันที
  const luaScript = `getgenv().XsprobConfig = {
    PC_NAME = "${selectedPc || "PC-001"}",
    api_key = "${apiKey || "sd_YOUR_API_KEY"}",
    ENDPOINT = "${ingestUrl}",
}
loadstring(game:HttpGet("${baseUrl}/scripts/xsprob.lua?key=${apiKey || "sd_YOUR_API_KEY"}"))()`;

  const highlighted = useMemo(() => highlightLua(luaScript), [luaScript]);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(luaScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Get Roblox Script" maxWidth="max-w-xl">
      <div className="space-y-4">
        {!apiKey ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
            <p className="text-sm font-bold text-amber-300">No API key to embed yet</p>
            <p className="mt-1 text-xs text-balance leading-relaxed text-zinc-400">
              คีย์ของคุณถูกเก็บแบบซ่อนเพื่อความปลอดภัย — เปิด API Key Settings แล้วกด Regenerate
              (คีย์ใหม่จะโชว์ครั้งเดียว) หลังจากนั้นกลับมาก็อปสคริปต์ได้เลย
            </p>
          </div>
        ) : (
          <>
            {isInsecure && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                This page is on plain HTTP — your API key will travel unencrypted and anyone
                sniffing the network can forge bot data into your dashboard. Use the HTTPS
                address instead.
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-zinc-400">PC Identifier (pcName)</label>
              <input
                type="text"
                value={selectedPc}
                onChange={(e) => setSelectedPc(e.target.value)}
                placeholder="e.g. PC-001, Laptop, VPS-1"
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-white focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Give each device a unique name to track accounts separately per machine.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-zinc-400">Roblox Executor Script</span>
                <span className="text-[11px] font-mono text-zinc-500">scripts/xsprob.lua?key=…</span>
              </div>
              <div className="relative rounded-xl border border-line bg-[#0d1117] p-3.5 font-mono text-xs text-[#abb2bf]">
                <pre className="overflow-x-auto whitespace-pre leading-relaxed">{highlighted}</pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={copyScript}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent/85"
              >
                <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}></i>
                {copied ? "Copied!" : "Copy Script"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
