# Roblox Dashboard (Linux)

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/80c15b4c-fd6d-4126-a98e-df63b098f270" />

This project runs on Ubuntu.
The project has two parts: the web dashboard that uses Next.js, and the Discord bot that tracks Roblox updates.
PM2 starts both parts on boot.
Tailscale Funnel exposes the web dashboard to the internet.

## Structure

The repository contains the folders and files below:

```
.
├── StealDashbord/          # Next.js 16 web (port 3000, pm2 name steal-dash)
├── robloxupdatetracker/    # Discord bot in TypeScript (pm2 name roblox-bot)
├── ecosystem.config.js     # PM2 configuration for both parts
├── start-all.sh            # starts all parts
└── stop-all.sh             # stops all parts
```

The StealDashbord folder holds the Next.js web dashboard that runs on port 3000 with the PM2 name steal-dash.
The robloxupdatetracker folder holds the Discord bot that uses TypeScript with the PM2 name roblox-bot.
The ecosystem.config.js file holds the PM2 configuration for both parts.

## Requirements

The host must have the items below:

- Run Ubuntu 22.04 or later with Node.js 22 or later, npm, and Python 3.12 or later with pip and venv.
- Install pm2, sqlite3, and build-essential on the host.
- Install Tailscale on the host.
- Get a Discord bot token.

To install pm2, run npm install -g pm2 on the host.
The host uses sqlite3 for the local database and build-essential to build native modules.
The host uses Tailscale to expose the web dashboard and uses the Discord bot token to run the bot.

## First Install

Complete the steps below on the Ubuntu host.
Do not commit the .env files to the repository. The files hold secrets.

1. Install dependencies for each project:

```bash
cd StealDashbord && npm install && cd ..
cd robloxupdatetracker && npm install && npm run build && cd ..
```

2. Restore the web database file for SQLite:

```bash
cp StealDashbord/prisma/dev.db.bak-20260911-admin StealDashbord/prisma/dev.db
cd StealDashbord && npx prisma generate && npx prisma db push && cd ..
```

3. Create the .env files for the bot and the web dashboard.
For the bot, copy the example file:

```bash
cp robloxupdatetracker/.env.example robloxupdatetracker/.env
```

For the web dashboard, create StealDashbord/.env with the entries below. The repository has no example file for the web dashboard because the file is ignored.

```text
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<random value from: openssl rand -base64 32>"
AUTH_TRUST_HOST=true
AUTH_URL="https://<hostname>.<tailnet>.ts.net"
NEXT_PUBLIC_SITE_URL="https://<hostname>.<tailnet>.ts.net"
DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET (same values as AUTH_DISCORD_ID / AUTH_DISCORD_SECRET)
ALLOWED_DISCORD_IDS / ALLOWED_DISCORD_GUILD_ID / DISCORD_BOT_TOKEN / ADMIN_DISCORD_IDS
```

The node_modules, .next, dist, .env, and .db files are ignored and will not go into the commit.

## Run

To start all parts, run the command below on the Ubuntu host:

```bash
./start-all.sh
```

The script uses pm2 startOrReload and saves the process list.
To see the status, run pm2 list on the host.
To see the logs, run pm2 logs on the host.
To stop all parts, run ./stop-all.sh on the host.

## Expose the Web Through Tailscale Funnel

To expose the web dashboard to the internet, complete the steps below.
The web dashboard runs on port 3000 on the Ubuntu host.

1. Log in to Tailscale one time:

```bash
sudo tailscale up
```

2. Start the funnel in the background:

```bash
sudo tailscale funnel --bg 3000
```

The command returns a public address in the form https://<hostname>.<tailnet>.ts.net/.
After you get the address, update the two locations below and restart the web dashboard.
Set AUTH_URL and NEXT_PUBLIC_SITE_URL in StealDashbord/.env to the public address.
Add https://<url>/api/auth/callback/discord to OAuth2 Redirects in the Discord Developer Portal.

## Notes About the Move From Windows

The Linux version differs from the Windows version in the ways below:

- Use .sh files in place of .bat files.
- Use Linux paths in ecosystem.config.js with path.join(__dirname, ...).
- Install or rebuild native modules such as better-sqlite3 and lightningcss on Linux. Do not copy node_modules across operating systems.
- Generate the Prisma client on Linux. The client uses binaryTargets debian-openssl-3.0.x.
