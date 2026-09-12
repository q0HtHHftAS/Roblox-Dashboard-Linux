// sync-ae-units.mjs — เติมรูป unit ที่ขาดใน Unit Vault จาก wiki (CC BY-SA 4.0)
// วิธีใช้: npm run sync:ae-units [--check] [--asset Name]
//  - เป้าหมาย = asset ที่ผู้เล่นถือจริง (อ่านจาก prisma/dev.db) แต่ยังไม่มีใน AE_UNIT_IMAGE_MAP
//             + SEED (asset ที่รู้ว่าขาดจากในเกม) + --asset ระบุเอง
//  - โหลด thumb 420px จาก wiki API -> public/ae-units/<asset-lower>.png -> patch map ให้
//  - ตัวที่ wiki ไม่มีรูป (ไฟล์ broken/ยังไม่อัปโหลด) จะรายงานท้ายสคริปต์ — dashboard ใช้ fallback ตัวอักษร
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_FILE = path.join(ROOT, "src/games/animeexpeditions/aeUnitImageMap.ts");
const OUT_DIR = path.join(ROOT, "public/ae-units");
const WIKI_API = "https://wiki.animeexpeditions.com/w/api.php";

// asset -> wiki file title (DisplayName ในเกม) สำหรับตัวที่รู้ว่าขาดจาก dump ในเกม (placeVersion 44934)
// key คือ Asset, value คือชื่อไฟล์บน wiki (ไม่ต้องมี "File:" นำหน้า)
const SEED_WIKI_TITLE = {
  Griffith: "Broken Falcon",
  GriffithFemto: "5th God Hand",
  GriffithSilver: "Silver Falcon",
  Guts: "Iron Wolf",
  GutsEVO: "Iron Wolf (Struggler)",
  SkullKnight: "Eclipse Hunter",
  SkullKnightEVO: "Eclipse Hunter (Savior)",
  KhunCube: "Cube",
  MegumiMahoraga: "Spirit General (Divine)",
  MegumiNue: "Winged Spirit (Divine)",
  MegumiWolf: "Spirit Wolf (Divine)",
  MiniCell: "Mini Bioinsect",
  YutaBatSpirit: "Bat Spirit",
  DamuUnit: "Damu",
  GooseUnit: "Goose",
  JaceUnit: "Jace",
  ExpeditionTurret: "Turret",
};

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const singleAsset = (() => {
  const i = process.argv.indexOf("--asset");
  return i >= 0 ? process.argv[i + 1] : null;
})();

function readMapKeys() {
  const src = fs.readFileSync(MAP_FILE, "utf8");
  const keys = new Set();
  for (const m of src.matchAll(/^  "([^"]+)":/gm)) keys.add(m[1]);
  return keys;
}

// asset ที่ผู้เล่นถือจริงจาก dev.db (ต้องมี python3 + sqlite3)
function liveAssets() {
  const out = new Set();
  try {
    const py = execFileSync(
      "python3",
      [
        "-c",
        "import sqlite3,json;con=sqlite3.connect('file:prisma/dev.db?mode=ro',uri=True);" +
          "rows=con.execute('SELECT data FROM Player').fetchall();con.close();" +
          "seen=set()\nfor (d,) in rows:\n" +
          " try:\n  p=json.loads(d)\n except Exception:\n  continue\n" +
          " if (p.get('gameId') or 'stealanegg')!='animeexpeditions': continue\n" +
          " [seen.add(u.get('asset')) for u in (p.get('units') or []) if u.get('asset')]\n" +
          "print('\\n'.join(sorted(seen)))",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 30000 }
    );
    for (const line of py.split("\n")) {
      const t = line.trim();
      if (t) out.add(t);
    }
  } catch (e) {
    console.warn("[warn] อ่าน live assets จาก dev.db ไม่ได้ (ข้าม): " + String(e.message || e).slice(0, 120));
  }
  return out;
}

async function wikiThumbUrl(fileTitle) {
  // fileTitle เช่น "Iron Wolf (Struggler)" (ไม่ต้องมี File:); คืน thumb 420px หรือ null
  const title = "File:" + fileTitle.replace(/ /g, "_") + ".png";
  const url =
    WIKI_API +
    "?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Csize&iiurlwidth=420&titles=" +
    encodeURIComponent(title);
  const j = await (await fetch(url)).json();
  const page = j?.query?.pages?.[0];
  if (!page || page.missing) return null;
  const info = page?.imageinfo?.[0];
  return info?.thumburl || info?.url || null;
}

async function downloadPng(url) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) return null;
  return buf;
}

function patchMap(additions) {
  // additions: [{ asset, file, title }] — insert เรียงตาม key แล้วเขียน block ใหม่
  const src = fs.readFileSync(MAP_FILE, "utf8");
  const openIdx = src.indexOf("= {");
  const closeIdx = src.lastIndexOf("};");
  if (openIdx < 0 || closeIdx < 0) throw new Error("map block ไม่ตรง pattern ที่คาดไว้");
  const rows = [];
  for (const m of src.slice(openIdx, closeIdx).matchAll(/^\s*"([^"]+)":\s*"([^"]+)",?(.*)$/gm)) {
    rows.push({ asset: m[1], value: m[2], comment: (m[3] || "").trim() });
  }
  const have = new Set(rows.map((r) => r.asset));
  for (const a of additions) {
    if (!have.has(a.asset)) {
      rows.push({ asset: a.asset, value: `/ae-units/${a.file}`, comment: `// ${a.title}` });
      have.add(a.asset);
    }
  }
  rows.sort((a, b) => a.asset.localeCompare(b.asset));
  const body = rows.map((r) => `  "${r.asset}": "${r.value}",${r.comment ? " " + r.comment : ""}`).join("\n");
  const next = src.slice(0, openIdx) + "= {\n" + body + "\n" + src.slice(closeIdx);
  fs.writeFileSync(MAP_FILE, next);
  return additions.length;
}

async function main() {
  const have = readMapKeys();
  const targets = new Map(); // asset -> wikiTitle
  if (singleAsset) targets.set(singleAsset, SEED_WIKI_TITLE[singleAsset] ?? singleAsset);
  else {
    for (const a of liveAssets()) {
      if (!have.has(a)) targets.set(a, SEED_WIKI_TITLE[a] ?? a);
    }
    for (const [a, t] of Object.entries(SEED_WIKI_TITLE)) {
      if (!have.has(a)) targets.set(a, t);
    }
  }
  if (targets.size === 0) {
    console.log("ครบแล้ว — ไม่มี unit ที่ขาดรูป");
    return;
  }
  console.log(`ขาดรูป ${targets.size} ตัว: ${[...targets.keys()].join(", ")}`);
  const added = [];
  const missing = [];
  for (const [asset, title] of targets) {
    let url = null;
    try {
      url = await wikiThumbUrl(title);
      if (!url && title !== asset) url = await wikiThumbUrl(asset); // fallback: ลองชื่อ asset ตรงๆ
    } catch (e) {
      console.log(`- ${asset}: wiki API error (${String(e).slice(0, 80)})`);
      missing.push(asset + " (api error)");
      continue;
    }
    if (!url) {
      console.log(`- ${asset}: wiki ไม่มีไฟล์ (File:${title}.png) — ใช้ fallback ตัวอักษร`);
      missing.push(asset);
      continue;
    }
    if (CHECK_ONLY) {
      console.log(`- ${asset}: มีรูปแล้ว (check-only, ยังไม่โหลด)`);
      continue;
    }
    const file = asset.toLowerCase() + ".png";
    const buf = await downloadPng(url);
    if (!buf) {
      console.log(`- ${asset}: โหลดมาไม่ใช่ PNG — ข้าม`);
      missing.push(asset + " (not png)");
      continue;
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, file), buf);
    added.push({ asset, file, title });
    console.log(`+ ${asset} <- ${title} (${buf.length} bytes)`);
  }
  if (added.length > 0 && !CHECK_ONLY) {
    const n = patchMap(added);
    console.log(`patch map แล้ว +${n} entries — อย่าลืม tsc/build/restart`);
  }
  if (missing.length > 0) console.log(`ยังขาด (${missing.length}): ${missing.join(", ")}`);
}

await main();
