# Roblox Dashboard (Linux)

โปรเจกต์รันบน Ubuntu ประกอบด้วย 2 ตัว: เว็บแดชบอร์ด Next.js + บอท Discord ติดตามอัปเดต Roblox ย้ายมาจาก Windows autostart ด้วย PM2 และเปิดเว็บออกอินเทอร์เน็ตผ่าน Tailscale Funnel

## โครงสร้าง

```
.
├── StealDashbord/          # เว็บ Next.js 16 (port 3000, pm2 ชื่อ steal-dash)
├── robloxupdatetracker/    # บอท Discord TypeScript (pm2 ชื่อ roblox-bot)
├── ecosystem.config.js     # config PM2 รวมทั้ง 2 ตัว
├── start-all.sh            # สตาร์ททั้งหมด
└── stop-all.sh             # หยุดทั้งหมด
```

## สิ่งที่ต้องมี

- Ubuntu 22.04+ / Node.js 22+ / npm / Python 3.12+ (มี pip + venv)
- `pm2` (`npm install -g pm2`), `sqlite3`, `build-essential`
- Tailscale (สำหรับเปิดเว็บออกเน็ต) + Discord Bot token

## ติดตั้งครั้งแรก

```bash
# 1. dependencies ของแต่ละโปรเจกต์
cd StealDashbord && npm install && cd ..
cd robloxupdatetracker && npm install && npm run build && cd ..

# 2. กู้/สร้าง database ของเว็บ (SQLite)
cp StealDashbord/prisma/dev.db.bak-20260911-admin StealDashbord/prisma/dev.db
cd StealDashbord && npx prisma generate && npx prisma db push && cd ..

# 3. ไฟล์ .env (ห้าม commit)
cp StealDashbord/.env.example StealDashbord/.env
cp robloxupdatetracker/.env.example robloxupdatetracker/.env
# แล้วแก้ค่า: AUTH_URL, NEXT_PUBLIC_SITE_URL, DISCORD_CLIENT_ID/SECRET, tokens
```

> หมายเหตุ: `node_modules/`, `.next/`, `dist/`, `.env`, `*.db` ถูก ignore ไว้แล้ว จะไม่ติดไปกับ commit

## รัน

```bash
./start-all.sh     # pm2 startOrReload + save
pm2 list           # ดูสถานะ
pm2 logs           # ดู log
./stop-all.sh      # หยุดทั้งหมด
```

## เปิดเว็บออกอินเทอร์เน็ต (Tailscale Funnel)

```bash
sudo tailscale up              # login ครั้งแรก
sudo tailscale funnel --bg 3000
# จะได้ https://<hostname>.<tailnet>.ts.net/
```

หลังได้ URL ต้องแก้ให้ตรงกัน 2 ที่แล้วรีสตาร์ทเว็บ:

1. `StealDashbord/.env` → `AUTH_URL` และ `NEXT_PUBLIC_SITE_URL`
2. Discord Developer Portal → OAuth2 → Redirects เพิ่ม `https://<url>/api/auth/callback/discord`

## หมายเหตุการย้ายจาก Windows

- ไฟล์ `.bat` ถูกแทนด้วย `.sh` แล้ว
- `ecosystem.config.js` ใช้ path แบบ Linux (`path.join(__dirname, ...)`)
- native module (`better-sqlite3`, `lightningcss`) ต้อง `npm install`/`rebuild` ใหม่บน Linux ห้ามก๊อป `node_modules` ข้าม OS
- Prisma client ต้อง `prisma generate` ใหม่บน Linux (binaryTargets `debian-openssl-3.0.x`)
