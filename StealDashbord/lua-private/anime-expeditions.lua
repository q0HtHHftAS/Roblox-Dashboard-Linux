-- AnimeExpedition (map module, loaded by Xsprob.lua router) — Bridge Anime Expeditions -> Xsprob
-- Only LocalPlayer, multi-PC via PC_NAME, Replica-based collector, 15s throttle + 15s poll
-- (server ให้ 6 req/min ต่อ PC = ห่างกันอย่างน้อย 10s; เผื่อ margin + เผื่อรันซ้ำซ้อนเลยส่งทุก ~15s)

if not game:IsLoaded() then
  game.Loaded:Wait()
end

local PLACE_IDS = { [84515722934860] = true }
local GAME_IDS = { [7613921865] = true }
local MY_NAME = "Anime Expedition"

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local StarterGui = game:GetService("StarterGui")

local INGEST_URL = "https://kernelos-pc.tailba1ab3.ts.net/api/ingest"
local POLL_INTERVAL = 15
local DEBUG = false

local function log(...) if DEBUG then print("[Xsprob-AE]", ...) end end

local PC_NAME = "PC-001"
local API_KEY = ""
local USER_ID = ""
pcall(function()
  local cfg = getgenv and (getgenv().XsprobConfig or getgenv().StealDashbordConfig)
  if cfg then
    if cfg["PC_NAME"] and typeof(cfg["PC_NAME"]) == "string" and #cfg["PC_NAME"] >= 1 then
      PC_NAME = cfg["PC_NAME"]
    end
    if cfg["api_key"] and typeof(cfg["api_key"]) == "string" and #cfg["api_key"] > 10 then API_KEY = cfg["api_key"] end
    if cfg["user_id"] and typeof(cfg["user_id"]) == "string" and #cfg["user_id"] >= 5 then USER_ID = cfg["user_id"] end
    if cfg["ENDPOINT"] and typeof(cfg["ENDPOINT"]) == "string" and #cfg["ENDPOINT"] > 8 then INGEST_URL = cfg["ENDPOINT"] end
  end
end)
pcall(function()
  if PC_NAME == "PC-001" and _G.PC_NAME and #_G.PC_NAME >= 1 then PC_NAME = _G.PC_NAME end
  if API_KEY == "" and _G.API_KEY and typeof(_G.API_KEY) == "string" and #_G.API_KEY > 10 then API_KEY = _G.API_KEY end
  if USER_ID == "" and _G.USER_ID and typeof(_G.USER_ID) == "string" and #_G.USER_ID >= 5 then USER_ID = _G.USER_ID end
  if _G.ENDPOINT and typeof(_G.ENDPOINT) == "string" and #_G.ENDPOINT > 8 then INGEST_URL = _G.ENDPOINT end
end)

if not Players.LocalPlayer then Players:GetPropertyChangedSignal("LocalPlayer"):Wait() end
local LocalPlayer = Players.LocalPlayer

-- Self-check: wrong map = warn + kick after 3s (same policy as StealAnEgg module)
do
  local okMap = PLACE_IDS[game.PlaceId] or GAME_IDS[game.GameId]
  if not okMap then
    warn(("[Xsprob-AE] wrong map for %s (PlaceId %s, GameId %s)"):format(MY_NAME, tostring(game.PlaceId), tostring(game.GameId)))
    pcall(function()
      StarterGui:SetCore("SendNotification", { Title = "Xsprob - Unsupported map", Text = "ไฟล์นี้ของ Anime Expedition จะออกใน 3 วิ", Duration = 3 })
    end)
    task.wait(3)
    pcall(function()
      LocalPlayer:Kick(("❌ [Xsprob] ไฟล์นี้สำหรับ Anime Expedition\nPlaceId ปัจจุบัน: %s"):format(tostring(game.PlaceId)))
    end)
    return
  end
end

-- Wait for Replica data (PlayerData token). ReplicaClient loads async after join.
local Nodes = nil
pcall(function()
  Nodes = require(ReplicatedStorage:WaitForChild("Nodes", 30))
end)
if not Nodes or not Nodes.GET_PLAYER_REPLICA then
  warn("[Xsprob-AE] Nodes.GET_PLAYER_REPLICA not found — unsupported game version?")
  return
end

-- Information.Assets: registry กลางของเกม (มี Rarity/DisplayName ต่อ asset) — ดึง rarity ต่อ unit (payload-first)
local InfoAssets = nil
pcall(function()
  local Information = require(ReplicatedStorage.Shared.Information)
  if typeof(Information) == "table" and typeof(Information.Assets) == "table" then
    InfoAssets = Information.Assets
  end
end)
local UnitRarityCache = {}
local function unitRarity(asset)
  local hit = UnitRarityCache[asset]
  if hit ~= nil then return hit == false and nil or hit end
  local r = nil
  if InfoAssets then
    pcall(function()
      local def = InfoAssets[asset]
      if typeof(def) == "table" and typeof(def.Rarity) == "string" and #def.Rarity >= 1 then
        r = def.Rarity
      end
    end)
  end
  UnitRarityCache[asset] = r or false
  return r
end

-- Auto meta จาก Information.Assets: displayName + image (dashboard โชว์เอง ไม่ต้องอัปเดตสคริปต์ตามยูนิตใหม่)
-- field ชื่อในเกมอาจต่างกันเลยลองหลาย key แบบ defensive; ไม่เจอก็ส่ง nil (dashboard fallback เอง)
local UnitMetaCache = {}
local IMAGE_KEYS = { "Image", "Icon", "ImageId", "IconId", "Thumbnail", "ThumbnailId", "AssetId", "DecalId" }
local NAME_KEYS = { "DisplayName", "Title", "UnitName" }
local function unitMeta(asset)
  local hit = UnitMetaCache[asset]
  if hit ~= nil then return hit == false and nil or hit end
  local meta = nil
  if InfoAssets then
    pcall(function()
      local def = InfoAssets[asset]
      if typeof(def) ~= "table" then return end
      local dn = nil
      for _, k in ipairs(NAME_KEYS) do
        local v = def[k]
        if typeof(v) == "string" and #v >= 1 then dn = v:sub(1, 64); break end
      end
      local im = nil
      for _, k in ipairs(IMAGE_KEYS) do
        local v = def[k]
        if typeof(v) == "number" and v > 0 then im = tostring(math.floor(v)); break end
        if typeof(v) == "string" and #v >= 1 then
          local digits = v:match("(%d+)")
          if digits and #digits >= 4 then im = digits:sub(1, 20); break end
        end
      end
      if dn or im then meta = { displayName = dn, image = im } end
    end)
  end
  UnitMetaCache[asset] = meta or false
  return meta
end

local function itemAmount(data, key)
  local ok, v = pcall(function()
    local it = data.ItemData and data.ItemData[key]
    if it and typeof(it.Amount) == "number" then return it.Amount end
    return 0
  end)
  if ok and typeof(v) == "number" then return v end
  return 0
end

local TRACKED_CURRENCIES = {
  "EventCoin", "ExpeditionCoin", "SummerCurrency", "RaidToken",
  "SpiritCityToken", "Crown", "TraitReroll", "StatReroll", "StatLock",
  "EquipmentReroll", "EquipmentLock", "LuckPotion", "HillOfSwordsToken",
  "ExpeditionFuel",
}

local function collectLocal()
  local replica = Nodes.GET_PLAYER_REPLICA:InvokeSelf()
  local data = replica and replica.Data
  if not data then return nil end

  local username = LocalPlayer.Name
  local displayName = LocalPlayer.DisplayName
  local userId = LocalPlayer.UserId

  local gold = itemAmount(data, "Gold")
  local gems = itemAmount(data, "Gem")

  local currencies = {}
  for _, k in ipairs(TRACKED_CURRENCIES) do
    local a = itemAmount(data, k)
    if a > 0 then currencies[k] = a end
  end

  -- Equipped first: short uuid + slot order ไว้จัดลำดับ units (กันตัวที่ถืออยู่โดน cap ตัดทิ้ง)
  local equipped = {}
  local equippedSet = {}
  if typeof(data.HotbarData) == "table" then
    for i = 1, 6 do
      local key = data.HotbarData[tostring(i)]
      if typeof(key) == "string" and #key >= 1 then
        local eshort = tostring(key):match("#(.+)$") or tostring(key)
        eshort = eshort:sub(1, 64)
        table.insert(equipped, eshort)
        equippedSet[eshort] = i
      end
    end
  end

  -- Units: UnitData is dict keyed "Asset#uuid" — ส่งแค่ uuid หลัง # (ประหยัด payload)
  -- ตัด exp/worthiness ที่ dashboard ไม่ได้อ่านออก
  -- displayName/image = auto จาก Information.Assets (มีก็ส่ง ไม่มีก็ nil — dashboard fallback เอง)
  local units = {}
  local total = 0
  if typeof(data.UnitData) == "table" then
    for key, u in pairs(data.UnitData) do
      total += 1
      if typeof(u) == "table" and typeof(u.Asset) == "string" then
        local shortUuid = tostring(key):match("#(.+)$") or tostring(key)
        local assetName = tostring(u.Asset):sub(1, 64)
        local rr = unitRarity(assetName)
        local meta = unitMeta(assetName)
        table.insert(units, {
          uuid = shortUuid:sub(1, 64),
          asset = assetName,
          displayName = (meta and meta.displayName) or nil,
          image = (meta and meta.image) or nil,
          rarity = (typeof(rr) == "string" and rr:sub(1, 32)) or nil,
          level = (typeof(u.Level) == "number" and math.floor(u.Level)) or 1,
          trait = (typeof(u.Trait) == "string" and u.Trait:sub(1, 32)) or nil,
          ascension = (typeof(u.Ascension) == "number" and math.floor(u.Ascension)) or nil,
          locked = u.Locked == true and true or nil,
          takedowns = (typeof(u.TotalTakedowns) == "number" and math.floor(u.TotalTakedowns)) or nil,
        })
      end
    end
  end
  table.sort(units, function(a, b)
    local ea = equippedSet[a.uuid] or 999
    local eb = equippedSet[b.uuid] or 999
    if ea ~= eb then return ea < eb end
    return (a.level or 0) > (b.level or 0)
  end)
  while #units > 1000 do table.remove(units) end

  -- Skins: SkinData is dict keyed "Asset#uuid" ({ Asset, ObtainedAt, OwnerId })
  -- ส่งแค่ uuid หลัง # (obtainedAt ไม่ได้ใช้ที่ dashboard)
  local skins = {}
  local skinsCount = 0
  if typeof(data.SkinData) == "table" then
    for key, s in pairs(data.SkinData) do
      skinsCount += 1
      if typeof(s) == "table" and typeof(s.Asset) == "string" then
        local shortUuid = tostring(key):match("#(.+)$") or tostring(key)
        table.insert(skins, {
          uuid = shortUuid:sub(1, 64),
          asset = tostring(s.Asset):sub(1, 64),
        })
      end
    end
  end
  table.sort(skins, function(a, b) return (a.asset or "") < (b.asset or "") end)
  while #skins > 300 do table.remove(skins) end

  return {
    username = username,
    displayName = displayName,
    userId = userId,
    pcName = PC_NAME,
    gameId = "animeexpeditions",
    money = gold,
    gems = gems,
    aeLevel = (typeof(data.Level) == "number" and math.floor(data.Level)) or 0,
    aeExp = (typeof(data.Exp) == "number" and math.floor(data.Exp)) or 0,
    unitsTotal = total,
    units = units,
    equippedUnits = equipped,
    skinsTotal = skinsCount,
    skins = skins,
    currencies = currencies,
    isLocal = true,
    lastUpdated = DateTime.now().UnixTimestampMillis,
  }
end

local lastPush = 0
local MIN_PUSH_GAP = 15
-- โดน 429 (6 req/min ต่อ PC / 120 req/min ต่อ apiKey) = พักส่ง ~65 วิแล้วค่อยลองใหม่ กันยิงซ้ำจนโควตาไม่รีเซ็ต
local rateLimitedUntil = 0

local function push()
  if os.clock() < rateLimitedUntil then return end
  lastPush = os.clock()
  local okData, player = pcall(collectLocal)
  if not okData or not player then
    warn("[Xsprob-AE] collect fail", tostring(player))
    return
  end
  if API_KEY == "" or API_KEY:sub(1, 3) ~= "sd_" then
    warn("[Xsprob-AE] Missing api_key - get it from Get Script modal after Discord login. PC: " .. tostring(PC_NAME))
    return
  end
  local payload = HttpService:JSONEncode({ api_key = API_KEY, user_id = USER_ID, players = { player }, timestamp = DateTime.now().UnixTimestampMillis })
  log("payload", payload:sub(1, 400))
  local ok, res = pcall(request, {
    Url = INGEST_URL,
    Method = "POST",
    Headers = { ["Content-Type"] = "application/json" },
    Body = payload,
  })
  if ok and typeof(res) == "table" and res.Success then
    log("pushed", player.username, "Lv" .. tostring(player.aeLevel), "Gold" .. tostring(player.money), "Units" .. tostring(player.unitsTotal), "Skins" .. tostring(player.skinsTotal), "->", res.StatusCode)
  else
    local err = typeof(res) == "table" and (res.Body or res.StatusMessage) or tostring(res)
    err = tostring(err)
    local code = (typeof(res) == "table" and res.StatusCode) or 0
    if code == 429 or err:find("429") or err:lower():find("rate limited") then
      rateLimitedUntil = os.clock() + 65
      warn("[Xsprob-AE] rate limited (6 req/min ต่อ PC / 120 req/min ต่อ key) — พักส่ง ~60 วิแล้วลองใหม่")
    else
      warn("[Xsprob-AE] push failed: " .. err)
    end
  end
end

task.wait(2)
push()
log("Initial push done. LocalPlayer:", LocalPlayer.Name, "PC:", PC_NAME)

local function requestPush()
  if os.clock() - lastPush >= MIN_PUSH_GAP then
    push()
  end
end

task.spawn(function()
  while true do
    task.wait(POLL_INTERVAL)
    requestPush()
  end
end)

print("[Xsprob] Bridge running. PC:", PC_NAME, "Game: animeexpeditions PlaceId:", game.PlaceId, "POSTing to", INGEST_URL)
