// sync-ao-units.mjs — รายงานยูนิต Anime Origins ที่ dashboard ยังไม่มีข้อมูลให้ แบบ auto
// วิธีใช้: node scripts/sync-ao-units.mjs [--asset Name]
//   - อ่าน asset จริงจาก dev.db (gameId = animeorigin) — ยูนิตใหม่อัปเดตเกมมาก็โผล่เอง
//   - เช็กรูป local ตาม convention `public/images/anime-origin/units/<norm>.png`
//     (norm = ตัวเล็กตัดอักขระพิเศษ เช่น gutsevo.png) — ขาดไฟล์ไหนบอกชื่อไฟล์ให้เลย
//   - เช็ก rarity จาก payload (TowerInfo) — ตัวไหนไม่มี rarity บอกให้รู้
//   - สรุป trait ที่เจอในข้อมูลจริง (ช่วยตัดสินใจเพิ่ม tier/sี)
//
// เพิ่มข้อมูลยูนิตใหม่ = วางไฟล์ PNG ตามชื่อที่สคริปต์บอก อย่างเดียว ไม่ต้องแก้โค้ด
// (ชื่อ/สี/trait/rarity ที่เหลือระบบ auto ใน aoUnitMeta.ts จัดการเอง)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UNITS_DIR = path.join(ROOT, "public/images/anime-origin/units");
const TRAITS_DIR = path.join(ROOT, "public/images/anime-origin/traits");

const singleAsset = (() => {
  const i = process.argv.indexOf("--asset");
  return i >= 0 ? process.argv[i + 1] : null;
})();

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// asset + rarity + trait + displayName + image จาก dev.db (Player.data JSON, gameId animeorigin)
function liveData() {
  const units = new Map(); // asset -> { count, rarities:Set, traits:Set, hasDisplayName, hasImage }
  try {
    const py = execFileSync(
      "python3",
      [
        "-c",
        "import sqlite3,json;con=sqlite3.connect('file:prisma/dev.db?mode=ro',uri=True);" +
          "rows=con.execute('SELECT data FROM Player').fetchall();con.close()\nfor (d,) in rows:\n" +
          " try:\n  p=json.loads(d)\n except Exception:\n  continue\n" +
          " if (p.get('gameId') or 'stealanegg')!='animeorigin': continue\n" +
          " [print('\\t'.join([str(u.get('asset') or ''),str(u.get('rarity') or ''),str(u.get('trait') or ''),('1' if u.get('displayName') else '0'),('1' if u.get('image') else '0')])) for u in (p.get('units') or []) if u.get('asset')]",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 30000 }
    );
    for (const line of py.split("\n")) {
      const parts = line.split("\t");
      if (parts.length < 5 || !parts[0]) continue;
      const [asset, rarity, trait, hasDN, hasImg] = parts;
      let e = units.get(asset);
      if (!e) {
        e = { count: 0, rarities: new Set(), traits: new Set(), hasDisplayName: false, hasImage: false };
        units.set(asset, e);
      }
      e.count += 1;
      if (rarity) e.rarities.add(rarity);
      if (trait) e.traits.add(trait);
      if (hasDN === "1") e.hasDisplayName = true;
      if (hasImg === "1") e.hasImage = true;
    }
  } catch (e) {
    console.warn("[warn] อ่าน live assets จาก dev.db ไม่ได้: " + String(e.message || e).slice(0, 120));
  }
  return units;
}

function hasFile(dir, name) {
  try {
    return fs.existsSync(path.join(dir, name));
  } catch {
    return false;
  }
}

function main() {
  const units = liveData();
  if (units.size === 0) {
    console.log("ยังไม่มีข้อมูล animeorigin ใน dev.db (รันสคริปต์ในเกมก่อน)");
    return;
  }
  const targets = singleAsset ? [singleAsset].filter((a) => units.has(a)) : [...units.keys()].sort();
  if (singleAsset && !units.has(singleAsset)) {
    console.log(`ไม่พบ ${singleAsset} ในข้อมูล live`);
    return;
  }

  const missingImg = [];
  const missingRarity = [];
  const noGameImg = [];
  console.log(`Unique units: ${units.size}`);
  for (const asset of targets) {
    const e = units.get(asset);
    const file = norm(asset) + ".png";
    const imgOk = hasFile(UNITS_DIR, file);
    const rarityOk = e.rarities.size > 0;
    if (!imgOk && !e.hasImage) missingImg.push(`  - ${asset} (x${e.count}) -> public/images/anime-origin/units/${file}`);
    if (!imgOk && e.hasImage) noGameImg.push(`  ~ ${asset}: ใช้รูปจากเกมผ่าน /api/thumb อยู่ (วางไฟล์ local ทับได้)`);
    if (!rarityOk) missingRarity.push(`  - ${asset} (x${e.count}): payload ไม่มี rarity (เช็ก TowerInfo ในเกม / Lua towerRarity)`);
  }

  console.log(`\n[รูป] มี local ครบหรือใช้รูปจากเกม: ${targets.length - missingImg.length}/${targets.length}`);
  if (missingImg.length > 0) {
    console.log(`ขาดรูป ${missingImg.length} ตัว — วางไฟล์ตามนี้ (ไม่ต้องแก้โค้ด):`);
    console.log(missingImg.join("\n"));
  }
  if (noGameImg.length > 0) console.log(noGameImg.join("\n"));

  console.log(`\n[Rarity] มีจาก payload: ${targets.length - missingRarity.length}/${targets.length}`);
  if (missingRarity.length > 0) console.log(missingRarity.join("\n"));
  else console.log("(rarity ครบท — dashboard จำลง localStorage อัตโนมัติอยู่แล้ว)");

  // สรุป trait ที่เจอจริง — เอาไว้เช็กว่า tier auto ใน aoUnitMeta ครอบคลุมไหม
  const traits = new Map();
  for (const e of units.values()) for (const t of e.traits) traits.set(t, (traits.get(t) || 0) + 1);
  console.log(`\n[Trait] เจอ ${traits.size} แบบในข้อมูลจริง:`);
  for (const [t, n] of [...traits.entries()].sort((a, b) => b[1] - a[1])) {
    const icon = hasFile(TRAITS_DIR, norm(t) + ".png") ? "icon OK" : "ไม่มี icon (โชว์ชื่ออย่างเดียว)";
    console.log(`  - ${t} (x${n}) — ${icon}`);
  }
}

main();
