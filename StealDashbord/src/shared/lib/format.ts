export function formatAbbreviated(n: number): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const units: [number, string][] = [
    [1e30, "No"],
    [1e27, "Oc"],
    [1e24, "Sp"],
    [1e21, "Sx"],
    [1e18, "Qi"],
    [1e15, "Qa"],
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [val, suffix] of units) {
    if (abs >= val) {
      const v = abs / val;
      // mimic picture: 485.60T (2 decimals), 14.428/s (3 decimals for small rates)
      // use 2 decimals for >= 100, else 2-3
      if (v >= 100) return `${sign}${v.toFixed(2)}${suffix}`;
      if (v >= 10) return `${sign}${v.toFixed(2)}${suffix}`;
      return `${sign}${v.toFixed(2)}${suffix}`;
    }
  }
  if (abs >= 100) return `${sign}${abs.toFixed(0)}`;
  if (abs >= 10) return `${sign}${abs.toFixed(1)}`;
  return `${sign}${abs.toFixed(2)}`;
}

export function formatMoneyAbbreviated(n: number): string {
  return formatAbbreviated(n);
}

// ตัวย่อแบบ formatAbbreviated แต่ตัดเลข 0 ท้ายทิ้ง ("16.0" -> "16", "6.00" -> "6", "152.53K" คงเดิม)
export function formatAbbreviatedTrim(n: number): string {
  const s = formatAbbreviated(n);
  return s.replace(/^([+-]?[\d,]+)(\.\d+)?([A-Za-z]*)$/, (_m, int: string, dec: string = "", suf: string) => {
    if (dec) dec = dec.replace(/0+$/, "");
    if (dec === ".") dec = "";
    return int + dec + suf;
  });
}

export function formatRate(n: number): string {
  // for per second display like +14.428/s
  if (!isFinite(n)) return "0/s";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${formatAbbreviated(n)}/s`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(3)}M/s`.replace(/\.?0+M/, "M");
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K/s`;
  return `${n.toFixed(2)}/s`;
}

export function formatMoneyFull(n: number): string {
  if (!isFinite(n)) return "$0";
  return "$" + Math.floor(n).toLocaleString("en-US");
}

// จำนวนนับที่เป็นจำนวนเต็ม (เช่น TraitReroll) — โชว์เลขเต็ม ไม่มี .0/.00 ต่อท้าย
export function formatCount(n: number): string {
  if (!isFinite(n)) return "0";
  if (Number.isInteger(n)) return Math.floor(n).toLocaleString("en-US");
  return formatAbbreviated(n);
}

export function formatMoneyWithSuffix(n: number): string {
  return formatAbbreviated(n);
}

export function formatSpeedPower(n: number): string {
  return formatAbbreviated(n);
}

export function formatHatchTime(sec?: number | null): string {
  if (sec == null || !isFinite(sec) || sec <= 0) return "Ready";
  // ต่ำกว่า 1 นาทีนับเป็นวินาที (tick ทุกวิจาก useNow)
  if (sec < 60) return `${Math.floor(sec)}s`;
  // ที่เหลือโชว์เป็นชั่วโมงรวมนาที (เช่น 26h 54m)
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// เวลาฟักคงเหลือแบบ live: remaining คือค่าตอน baseline (ms epoch, เช่น player.lastUpdated)
// คืน null ถ้าไม่มีข้อมูล cooldown ตั้งแต่ต้น
export function liveRemaining(remaining?: number | null, baseline?: number | null, now: number = Date.now()): number | null {
  if (remaining == null || !isFinite(remaining)) return null;
  if (!baseline) return remaining;
  return remaining - Math.max(0, (now - baseline) / 1000);
}

export function maskUsername(name: string): string {
  if (!name) return "****";
  if (name.length <= 2) return name;
  return name.slice(0, 2) + "****";
}

export function getBotStatus(lastSeen?: number, serverTime: number = Date.now()): "online" | "idle" | "offline" {
  if (!lastSeen) return "offline";
  const diffSec = (serverTime - lastSeen) / 1000;
  if (diffSec < 45) return "online";
  if (diffSec <= 90) return "idle";
  return "offline";
}

