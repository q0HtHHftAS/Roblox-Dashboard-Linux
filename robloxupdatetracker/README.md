# Roblox Update Tracker

A Discord bot that monitors Roblox client versions and tracks the working/patched
status of Roblox executors. When a new update is detected, the bot sends an
embed to every channel configured for that Roblox release channel. When an
executor updates or gets patched, the bot renames its voice/text status channels
and (optionally) posts an alert embed.

This project bundles several features under one bot:

- **Roblox client monitoring** — polls `clientsettings.roblox.com` for the
  `LIVE` and `ZBeta` channels, detects new hashes, reverts, and "future" ZBeta
  releases.
- **Executor tracking** — polls the [WEAO](https://whatexpsare.online) API every
  minute and updates status channels + alert messages per executor.
- **Bot online voice channel** — a 24/7 voice channel the bot joins that
  displays the current Roblox version (or a custom name).
- **Protected rooms** — a "honeypot" channel that bans or times out anyone who
  posts in it.
- **Member-join notifications** — sends a mention + embed whenever a new
  member joins the server.

## Add to your server

If you do not want to host your own instance, the bot is also hosted and managed
by the author (intended to have 100% uptime):

> [Authorization Link](https://discord.com/oauth2/authorize?client_id=1526290601476231218)

## Features

- Monitors Roblox `LIVE` and `ZBeta` channels.
- Detects new versions, reverts, and future (ZBeta) releases.
- Sends Discord embeds with a one-click **Download** button (links to
  [RDD](https://rdd.weao.gg)).
- Tracks Roblox executors via the WEAO API — per-executor alerts, voice
  status channels, and chat (text) status channels.
- Bot "online" voice channel that mirrors the current Roblox version.
- Honeypot "protected rooms" that auto-ban or timeout anyone who types in them.
- Welcome notifications for new members (requires the Guild Members intent).
- Custom message templates per alert channel with `{hash}`, `{channel}`,
  `{version}`, and `{date}` placeholders.
- Discord slash commands for all configuration (no manual DB editing).
- Optional `ALLOWED_USER_IDS` allowlist to restrict bot usage to specific users.
- **Anti-spam rate limiting** — each user/command pair has a short cooldown
  (`COMMAND_COOLDOWN_MS`, default 5s; `?ver` is rate-limited too) so spamming
  cannot hit Discord's global rate limit or hammer the Roblox API.
- **Crash-safe error handling** — unhandled rejections, uncaught exceptions,
  Discord client errors and session invalidation are logged (console + file)
  and pushed to a developer webhook (`ERROR_WEBHOOK_URL`) with throttling so a
  burst of failures can never flood the channel.
- **DB caching** — hot reads (protected-room checks on every message, alert
  config, version/executor state on every monitoring tick) are served from an
  in-memory TTL cache with write-through invalidation, and prepared statements
  are memoized, cutting SQLite work on the hottest paths.

## Requirements

- **Node.js 20+**
- A Discord bot application (see Installation)
- For `joinalert`: enable the **Guild Members** intent in your bot settings
  and set `ENABLE_GUILD_MEMBERS_INTENT=true`.
- For `protectroom`: enable the **Ban Members** permission for the bot.
- For `ex voice` and `ex track voice`: enable **Manage Channels** + **Connect**
  on the bot in the target category.

## Installation

Clone the repository:

```bash
git clone https://github.com/q0HtHHftAS/Roblox-Update-Tracker.git
cd RobloxUpdateTracker
```

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your `.env`:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env`:

   | Variable | Required | Description |
   |---|---|---|
   | `DISCORD_BOT_TOKEN` | ✅ | Your bot token. |
   | `DISCORD_CLIENT_ID` | ✅ | Your bot application ID. |
   | `DISCORD_GUILD_ID` | ➖ | Comma-separated guild IDs for instant per-guild command registration. Leave empty to register globally. |

   > Guild data cleanup is **fully automatic and membership-based** — it does
   > not depend on `DISCORD_GUILD_ID` at all. On every boot, the bot wipes all
   > per-guild data (alerts, executor tracking, bot voice/chat channels, join
   > alerts, protect-room, verify, bot whitelist) for any guild it is **no
   > longer a member of** (kicked/left). So to remove a guild entirely, just
   > remove the bot from that guild — its data is cleaned up on the next boot.
   > As a safety guard this only runs when the bot is a member of at least one
   > guild at startup.
   | `ENABLE_GUILD_MEMBERS_INTENT` | ➖ | `true` to enable the Guild Members intent (required for `/joinalert`). |
   | `ALLOWED_USER_IDS` | ➖ | Comma-separated user IDs. If non-empty, only these users can run slash commands. |
   | `CLIENTSETTINGS_BASE` | ➖ | Roblox clientsettings base URL. Defaults to `https://clientsettings.roblox.com`. |
   | `COMMAND_COOLDOWN_MS` | ➖ | Anti-spam: minimum delay in ms between the same user using the same command (default `5000`). `0` disables it. |
   | `COOLDOWN_MESSAGE_TTL_MS` | ➖ | How long the cooldown warning message stays before the bot auto-deletes it (default `5000`). `0` keeps it forever. |
   | `ERROR_WEBHOOK_URL` | ➖ | Discord webhook URL where the bot posts an alert the moment an error/crash occurs. Empty = log-only mode. |
   | `LOG_TO_FILE` / `LOG_FILE` | ➖ | Append every log line to a text file. Defaults to `true` / `bot.log`. |

4. Register slash commands:

   ```bash
   npm run register-commands
   ```

   When `DISCORD_GUILD_ID` is set, commands are registered per-guild (instant).
   When empty, they are registered globally (may take up to an hour to propagate).

5. Build and start the bot:

   ```bash
   npm run build
   npm run start
   ```

   For development with auto-reload:

   ```bash
   npm run dev
   ```

   For production with `pm2`:

   ```bash
   npm run pm2:start
   pm2 save
   ```

   `pm2:start` uses `pm2 startOrReload ecosystem.config.js`, so running it
   again (e.g. after a deploy) will *reload* the existing bot instead of
   starting a duplicate instance. Run `pm2 save` once after any change to the
   process list so `pm2 resurrect` (used by the Windows startup script)
   restores exactly one instance. To fully stop the bot:

   ```bash
   pm2 delete roblox-bot
   ```

## Commands

All commands are Discord slash commands. Administrator-only commands are marked
with 🛡️.

### 🛡️ `/robloxalert add`

Enable Roblox update alerts. By default the alert goes to the current text
channel; pass `discord_channel` to send it somewhere else.

Options:

- `roblox_channel` *(required)* — `LIVE` or `ZBeta`.
- `discord_channel` *(optional)* — the Discord channel that receives the
  alerts (default: the current channel).
- `message` *(optional)* — custom message sent before the embed. Supports the
  placeholders `{hash}`, `{channel}`, `{version}`, `{date}`.

Example:

```
/robloxalert add roblox_channel:LIVE message:@everyone
```

### 🛡️ `/robloxalert remove`

Remove alerts for a Roblox channel. By default it targets the current
channel; pass `discord_channel` to remove from a specific one.

```
/robloxalert remove roblox_channel:LIVE
```

### `/robloxalert list`

List every alert configured in this server.

---

### `/ver`

Show the current `clientVersionUpload` hash for a Roblox channel.

Options:

- `channel` *(optional)* — `LIVE` (default) or `ZBeta`.

---

### 🛡️ `/ex track add`

Track a Roblox executor. There are three display modes:

- **Voice** — bot creates a voice channel inside the chosen category and renames
  it to `<display>` based on the executor's working status.
- **Chat** — same, but with a text channel.
- **Embed** — bot sends (or edits) a rich embed in the chosen channel showing the
  executor's status, version, and Roblox version. Auto-updated on a configurable
  interval (default 1 minute).
- **Alert** — bot sends an embed to the chosen channel every time the executor
  pushes a new version.

The executor's name from the WEAO API is used as the display name — no
separate `display_name` needed.

Options:

- `display` *(required)* — `voice`, `chat`, `embed`, or `alert`.
- `executor` *(required)* — name from the WEAO API (autocompleted).
- `channel` — text channel for `alert` / `embed` mode.
- `category` — category for `voice`/`chat` modes (where the bot creates the channel).
- `content` *(optional)* — message template for `alert` mode. Supports
  `{hash}`, `{channel}`, `{date}`.
- `interval` *(optional, embed mode)* — how often the embed auto-updates.
  Accepts durations like `30s`, `1m`, `5m`, `1h`. Minimum `10s`, maximum `1h`.
  Defaults to `1m`.

### 🛡️ `/ex track remove`

Remove tracking for a single executor (also deletes the auto-created channel).

Options:

- `display` *(required)* — `voice`, `chat`, `embed`, or `alert`.
- `executor` *(required)* — name from the WEAO API.
- `channel` *(optional, alert / embed mode)* — narrow removal to one channel.

### 🛡️ `/ex track edit`

Edit the `content` or embed `interval` of an existing tracker (alert / embed /
voice / chat). Only the options you provide are changed.

Options:

- `executor` *(required)* — name from the WEAO API.
- `content` *(optional)* — new message template for alert / embed mode.
- `interval` *(optional, embed mode)* — new auto-update interval.

### 🛡️ `/ex track list`

List every executor tracker configured in this server, grouped by mode.

### 🛡️ `/ex track refresh`

Force-refresh every executor status channel + chat channel immediately.

---

### 🛡️ `/ex voice add`

Configure the bot's "online" voice channel.

Options:

- `mode` *(required)* — `custom` (fixed name) or `roblox-version` (mirrors a
  Roblox channel's `clientVersionUpload`).
- `channel` *(optional)* — pick an existing voice channel for the bot to use.
- `category` *(optional)* — pick a category for the bot to create a new voice
  channel in.
- `display_name` *(optional, custom mode)* — the name to display.
- `roblox_channel` *(optional, roblox-version mode)* — `LIVE` (default) or `ZBeta`.

You must provide **either** `channel` **or** `category`.

The bot will join this voice channel 24/7. Joins that fail are rate-limited
to one attempt per 15 minutes per guild.

### 🛡️ `/ex voice remove`

Stop tracking + leave + delete the bot's voice channel for this server.

### 🛡️ `/ex voice list`

Show the current bot voice configuration for this server.

### 🛡️ `/ex voice refresh`

Force a single refresh of the bot voice channel name + connection.

---

### 💬 `/ex chat add`

Configure a text channel whose name mirrors a Roblox channel's version
(`clientVersionUpload`), like `/ex voice` but for chat channels.

Options:

- `mode` *(required)* — `custom` (fixed name) or `roblox-version` (mirrors a
  Roblox channel's `clientVersionUpload`).
- `channel` *(optional)* — pick an existing text channel for the bot to use.
- `category` *(optional)* — pick a category for the bot to create a new text
  channel in.
- `display_name` *(optional, custom mode)* — the name to display.
- `roblox_channel` *(optional, roblox-version mode)* — `LIVE` (default) or `ZBeta`.

You must provide **either** `channel` **or** `category`. The channel name is
refreshed on every monitoring tick (default every 60s) whenever the Roblox
version changes.

### 💬 `/ex chat remove`

Stop tracking + delete the bot's chat channel for this server.

### 💬 `/ex chat list`

Show the current bot chat configuration for this server.

### 💬 `/ex chat refresh`

Force a single refresh of the bot chat channel name.

---

### 🛡️ `/status add`

Add a message to the bot's rotating Discord presence. You can add **multiple**
messages — the bot cycles through them automatically, showing each one for its
configured interval.

Options:

- `text` *(required)* — presence text.
- `url` *(optional)* — stream URL. Defaults to `https://www.twitch.tv/roblox`.
- `custom` *(optional)* — custom status shown on the profile card (emoji allowed).
- `interval` *(optional)* — how long this message is shown before the bot
  switches to the next one. Accepts durations like `30s`, `1m`, `5m`, `1h`
  (minimum `5s`, default `1m`).

### 🛡️ `/status remove`

Clear every configured status message and remove the bot's presence entirely
(no status is shown until `/status add` is used again).

### 🛡️ `/status list`

Show every configured status message with its rotation interval and stream URL.

### 🛡️ `/status refresh`

Force the bot to re-apply its configured status immediately.

---

### 🛡️ `/protectroom setup`

Mark the current text channel as a "honeypot". The first message from any
non-Administrator member will:

1. Delete every message by that user posted in the last minute (across all
   channels).
2. Either **ban** the user or **timeout** them for a configurable duration
   (default `60` minutes).

Options:

- `action` *(required)* — `ban` or `timeout`.
- `timeout_minutes` *(optional, `timeout` only)* — duration in minutes
  (1–40320). Defaults to `60`.

Guild owners and Administrators are exempt.

### 🛡️ `/protectroom remove`

Remove the protection from the current channel.

### 🛡️ `/protectroom view`

Show the current channel's protection status.

---

### 🛡️ `/joinalert add`

Enable a welcome notification whenever a new member joins the server.

Options:

- `message` *(optional)* — custom text shown after the mention.

```
/joinalert add message:ยินดีต้อนรับสู่เซิร์ฟเวอร์!
```

Requires the **Guild Members** intent to be enabled in your bot settings and
`ENABLE_GUILD_MEMBERS_INTENT=true` in your `.env`.

### 🛡️ `/joinalert remove`

Disable the join notification for this server.

### 🛡️ `/joinalert list`

Show the configured join channel + message.

---

### ⚙️ `/config`

Show an embed summarising every configuration in this server. Also
auto-cleans DB rows pointing to channels that no longer exist.

### `/help`

Show every available slash command with a short description.

---

### 🛡️ `/test`

Send a sample alert to verify your setup. Useful after configuring channels.

Options:

- `type` *(required)* — `roblox-live`, `roblox-zbeta`, or `executor-alert`.

The embed uses the current real `clientVersionUpload` for the Roblox options,
and the first matching WEAO entry (or a sample) for the executor option.

---

## How it works

### Roblox update loop

- Every **10 seconds** the bot polls
  `clientsettings.roblox.com/v2/client-version/WindowsPlayer/channel/{LIVE,ZBeta}`.
  A channel that misses **6 checks in a row** backs off to one check per
  minute until it recovers (so a locked-down endpoint is not hammered).
- A new hash on `LIVE` triggers a red "Roblox Update Detected!" embed.
- A new hash on `ZBeta` triggers a yellow "future update" embed. When the
  same hash later appears on `LIVE`, it is marked as `released=1` in the DB.
- If the bot sees the previous `currentVersion` reappear, it sends an orange
  "Update Reverted" embed.
- Each embed includes a one-click **Download** button that links to
  `https://rdd.weao.gg/?channel=...&version=...`.

### Executor monitoring loop

- Every **60 seconds** the bot polls `https://whatexpsare.online/api/status/exploits`.
- For each executor the bot has `executorAlerts` for, it compares the
  `version` + `updateStatus` against `executorLastState` in the DB.
- If a new working version is detected, an embed is sent to every subscribed
  channel (changelog included when present).
- Voice and text status channels are renamed to `<display>` based on
  `updateStatus`.
- **Embed Status** channels are refreshed by a separate per-row scheduler.
  Each embed row has its own `intervalMs` (configurable via `/ex track add` or
  `/ex track edit`). A lightweight tick checks every 5 seconds which rows are
  due for a refresh, so each embed updates independently.

### Bot online voice

- When `/ex voice` is configured, the bot joins the chosen voice channel
  24/7 and renames it according to the chosen mode.
- Failed joins are rate-limited to one attempt per 15 minutes per guild, and
  voice `error` events destroy the connection (preventing process crashes).

### Protected rooms

- Every message is logged to `messageLog` (TTL 2 minutes, cleaned up every
  5 minutes).
- On a message in a protected channel, the bot looks up the user's last
  minute of messages, deletes them all, then bans or times out the user.
- Guild owners and Administrators are exempt.

## Configuration placeholders

The following placeholders can be used in custom messages:

| Placeholder | Replaced with |
|---|---|
| `{hash}` | The Roblox `clientVersionUpload` (or executor version). |
| `{channel}` | The Roblox channel name (`LIVE`, `ZBeta`). |
| `{version}` | The numeric Roblox version (when available). |
| `{date}` | A Discord timestamp `<t:...:f>` (or `<t:...:F>` for executor alerts). |

## Data storage

The bot stores its state in a local SQLite database (`data.db`, WAL mode). The
schema and migrations live in `src/lib/db.ts`. Every bot-managed channel is
self-healing — if the channel is deleted manually, the bot clears the
reference on the next pass. `knownVersions` is pruned on boot and every 6h
(rows older than 90 days, max 500 per channel); `channelState` also keeps the
numeric Roblox version next to each hash.

## Development

Run in development mode with auto-reload:

```bash
npm run dev
```

Lint/typecheck:

```bash
npm run build
```

Tests (`tests/`, run with the built-in Node test runner via `tsx`):

```bash
npm test
```

Useful paths:

- `src/index.ts` — bootstrap.
- `src/monitoring/` — update loops.
- `src/commands/` — slash command handlers.
- `src/lib/db.ts` — schema and migrations.

## Notes

- Pull requests and issues should be created on GitHub.
- Do **not** commit your `.env` file. The provided `.gitignore` already
  excludes it, but double-check before pushing.
- If you self-host and the bot fails to join the configured voice channel,
  check the logs — repeated join failures trigger a 15-minute cooldown per
  guild.

## License

[MIT](LICENSE)
