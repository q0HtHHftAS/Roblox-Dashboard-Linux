// images:optimize — ย่อ+บีบอัดรูป local ทั้งเว็บให้โหลดไว (Q3 วิธี A)
// วิธีใช้: npm run images:optimize
//   - ย่อ PNG เหลือกรอบ 160x160 (ไม่ขยายรูปเล็กอยู่แล้ว) + บีบอัด lossless ระดับ 9
//     (โชว์จริงแค่ 24-80px, 160px = เผื่อจอ retina 2x)
//   - ครอบคลุม: public/ae-units, public/ae-traits, public/ae-skins, public/pets,
//     public/images (logo/icons/cards) — ข้าม .svg/.gitkeep/ไฟล์อื่น
//   - สำรองต้นฉบับไว้ที่ archive/image-backup-<วันที่>/ ก่อนแตะไฟล์เสมอ
//   - รันซ้ำได้ (idempotent): ไฟล์ไหนเล็กอยู่แล้วจะแค่ recompress
//   - หลังรัน: bump ?v= ใน *_imageMap ให้เป็นเวอร์ชันใหม่ (กัน browser จำรูปเก่า) แล้ว build+restart
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_DIM = 160;
// รูป banner ใหญ่ (โชว์กว้าง 300px+ บน Hub) — ย่อแค่พอชัด ไม่ย่อเท่าไอคอน
const LARGE_DIM = 640;
const LARGE_RE = /card\.png$/i;
const DIRS = ["ae-units", "ae-traits", "ae-skins", "pets", "images"];
const BACKUP_DIR = path.join(ROOT, "archive", `image-backup-${new Date().toISOString().slice(0, 10)}`);

let done = 0;
let skipped = 0;
let beforeBytes = 0;
let afterBytes = 0;

function listPngs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listPngs(p));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".png")) out.push(p);
  }
  return out;
}

async function main() {
  const files = [];
  for (const d of DIRS) {
    const abs = path.join(ROOT, "public", d);
    if (fs.existsSync(abs)) files.push(...listPngs(abs));
  }
  console.log(`พบ PNG ${files.length} ไฟล์`);

  // สำรองต้นฉบับก่อน (ข้ามไฟล์ที่ backup ไว้แล้ว)
  for (const f of files) {
    const rel = path.relative(path.join(ROOT, "public"), f);
    const dest = path.join(BACKUP_DIR, rel);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(f, dest);
    }
  }
  console.log(`สำรองต้นฉบับไว้ที่ ${path.relative(ROOT, BACKUP_DIR)}`);

  // คืนรูป banner จากต้นฉบับก่อน (กันรอบก่อนย่อเล็กไป) แล้วค่อย optimize ใหม่ด้วยกฎปัจจุบัน
  for (const f of files) {
    if (!LARGE_RE.test(f)) continue;
    const rel = path.relative(path.join(ROOT, "public"), f);
    const orig = path.join(BACKUP_DIR, rel);
    // หา backup ต้นฉบับจากรอบไหนก็ได้ (ชื่อ dir มีวันที่)
    try {
      const archDir = path.join(ROOT, "archive");
      const cands = fs.readdirSync(archDir).filter((d) => d.startsWith("image-backup-")).sort().reverse();
      for (const c of cands) {
        const src = path.join(archDir, c, rel);
        if (fs.existsSync(src)) {
          const cur = fs.statSync(f).size;
          const old = fs.statSync(src).size;
          if (old > cur) {
            fs.copyFileSync(src, f);
            console.log(`คืนต้นฉบับ ${rel} (${Math.round(cur / 1024)}KB -> ${Math.round(old / 1024)}KB)`);
          }
          break;
        }
      }
    } catch {}
  }

  for (const f of files) {
    try {
      const before = fs.statSync(f).size;
      const limit = LARGE_RE.test(f) ? LARGE_DIM : MAX_DIM;
      const img = sharp(f, { animated: false });
      const meta = await img.metadata();
      const pipeline = sharp(f, { animated: false }).rotate();
      if ((meta.width || 0) > limit || (meta.height || 0) > limit) {
        pipeline.resize(limit, limit, { fit: "inside", withoutEnlargement: true });
      }
      const buf = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
      // กันไฟล์ใหญ่กว่าเดิม (รูปเล็กอยู่แล้วบางที recompress ไม่คุ้ม) — เขียนทับเฉพาะตอนเล็กลง/เท่าเดิม
      if (buf.length <= before) {
        fs.writeFileSync(f, buf);
        beforeBytes += before;
        afterBytes += buf.length;
        done++;
      } else {
        beforeBytes += before;
        afterBytes += before;
        skipped++;
      }
    } catch (e) {
      console.log(`- ข้าม ${path.relative(ROOT, f)}: ${String(e.message || e).slice(0, 100)}`);
      skipped++;
    }
  }
  const pct = beforeBytes > 0 ? Math.round((afterBytes / beforeBytes) * 100) : 100;
  console.log(`เสร็จ: เขียนทับ ${done} / ข้าม ${skipped}`);
  console.log(`ขนาดรวม ${(beforeBytes / 1048576).toFixed(2)}MB -> ${(afterBytes / 1048576).toFixed(2)}MB (เหลือ ${pct}%)`);
}

await main();
