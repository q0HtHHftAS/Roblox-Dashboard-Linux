-- AnimeOrigin (map module, loaded by Xsprob.lua router) — Bridge Anime Origins -> Xsprob
-- Only LocalPlayer, multi-PC via PC_NAME, GlobalTables-based collector, 15s throttle + 15s poll
-- (server ให้ 6 req/min ต่อ PC = ห่างกันอย่างน้อย 10s; เผื่อ margin + เผื่อรันซ้ำซ้อนเลยส่งทุก ~15s)
-- Data layout verified live on placeVersion 14061 ([UPD1] Anime Origins):
--   require(ReplicatedStorage.Modules.GlobalTables).PlayerData
--   .Inventory.Currency: { Gold, Gems, TraitReroll, ... } (numbers)
--   .Inventory.Towers: { [uuid] = { Name, Exp, Stars, Trait, StorageTrait, Shiny, Locked, Kills, Worthiness } }
--   .EquippedTowers: { Tower1..Tower6 = uuid }
--   .Exp: player exp (no player Level in game)

if not game:IsLoaded() then
  game.Loaded:Wait()
end

local PLACE_IDS = { [129932912185311] = true, [116173040971120] = true }
local GAME_IDS = { [8946565814] = true }
local MY_NAME = "Anime Origin"

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local StarterGui = game:GetService("StarterGui")

local INGEST_URL = "https://kernelos-pc.tailba1ab3.ts.net/api/ingest"
local POLL_INTERVAL = 15
local DEBUG = false

local function log(...) if DEBUG then print("[Xsprob-AO]", ...) end end

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

-- Self-check: wrong map = warn + kick after 3s (same policy as StealAnEgg / AE modules)
do
  local okMap = PLACE_IDS[game.PlaceId] or GAME_IDS[game.GameId]
  if not okMap then
    warn(("[Xsprob-AO] wrong map for %s (PlaceId %s, GameId %s)"):format(MY_NAME, tostring(game.PlaceId), tostring(game.GameId)))
    pcall(function()
      StarterGui:SetCore("SendNotification", { Title = "Xsprob - Unsupported map", Text = "ไฟล์นี้ของ Anime Origin จะออกใน 3 วิ", Duration = 3 })
    end)
    task.wait(3)
    pcall(function()
      LocalPlayer:Kick(("❌ [Xsprob] ไฟล์นี้สำหรับ Anime Origin\nPlaceId ปัจจุบัน: %s"):format(tostring(game.PlaceId)))
    end)
    return
  end
end

-- Wait for GlobalTables + PlayerData (loads async after join).
local GlobalTables = nil
pcall(function()
  GlobalTables = require(ReplicatedStorage:WaitForChild("Modules", 30):WaitForChild("GlobalTables", 30))
end)
if typeof(GlobalTables) ~= "table" then
  warn("[Xsprob-AO] Modules.GlobalTables not found — unsupported game version?")
  return
end

-- TowerInfo (rarity/DisplayName registry) + CalculateStuff (real tower level from Exp) — optional, degrades gracefully
local TowerInfo = nil
local GetTowerLevel = nil
pcall(function()
  TowerInfo = require(ReplicatedStorage:WaitForChild("Modules", 10):WaitForChild("TowerInfo", 10))
  local CS = require(ReplicatedStorage.Modules.CalculateStuff)
  if typeof(CS) == "table" and typeof(CS.GetTowerLevelFromExp) == "function" then
    GetTowerLevel = CS.GetTowerLevelFromExp
  end
end)
local TowerRarityCache = {}
local function towerRarity(asset)
  local hit = TowerRarityCache[asset]
  if hit ~= nil then return hit == false and nil or hit end
  local r = nil
  if typeof(TowerInfo) == "table" then
    pcall(function()
      local def = TowerInfo[asset]
      if typeof(def) == "table" and typeof(def.Rarity) == "string" and #def.Rarity >= 1 then
        r = def.Rarity
      end
    end)
  end
  TowerRarityCache[asset] = r or false
  return r
end

-- Auto meta จาก TowerInfo: displayName + image (dashboard โชว์เอง ไม่ต้องอัปเดตสคริปต์ตามยูนิตใหม่)
-- field ชื่อในเกมอาจต่างกันเลยลองหลาย key แบบ defensive; ไม่เจอก็ส่ง nil (dashboard fallback เอง)
local TowerMetaCache = {}
local IMAGE_KEYS = { "Image", "Icon", "ImageId", "IconId", "Thumbnail", "ThumbnailId", "AssetId", "DecalId" }
local NAME_KEYS = { "DisplayName", "Title", "UnitName" }
local function towerMeta(asset)
  local hit = TowerMetaCache[asset]
  if hit ~= nil then return hit == false and nil or hit end
  local meta = nil
  if typeof(TowerInfo) == "table" then
    pcall(function()
      local def = TowerInfo[asset]
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
  TowerMetaCache[asset] = meta or false
  return meta
end

local function getPlayerData()
  local ok, pd = pcall(function()
    return GlobalTables.PlayerData
  end)
  if ok and typeof(pd) == "table" then return pd end
  return nil
end

local function num(v)
  return (typeof(v) == "number" and v == v) and v or 0
end

local function collectLocal()
  local data = getPlayerData()
  if not data then return nil end

  local username = LocalPlayer.Name
  local displayName = LocalPlayer.DisplayName
  local userId = LocalPlayer.UserId

  local inv = (typeof(data.Inventory) == "table" and data.Inventory) or {}
  local cur = (typeof(inv.Currency) == "table" and inv.Currency) or {}
  local gold = num(cur.Gold)
  local gems = num(cur.Gems)

  local currencies = {}
  for k, v in pairs(cur) do
    if k ~= "Gold" and k ~= "Gems" and typeof(v) == "number" and v == v and v > 0 then
      currencies[tostring(k)] = v
    end
  end

  -- Equipped first: Tower1..Tower6 uuid order ไว้จัดลำดับ units (กันตัวที่ถืออยู่โดน cap ตัดทิ้ง)
  local equipped = {}
  local equippedSet = {}
  if typeof(data.EquippedTowers) == "table" then
    for i = 1, 6 do
      local key = data.EquippedTowers["Tower" .. tostring(i)]
      if typeof(key) == "string" and #key >= 1 then
        local eshort = tostring(key):sub(1, 64)
        table.insert(equipped, eshort)
        equippedSet[eshort] = i
      end
    end
  end

  -- Towers: dict keyed by uuid — ส่งแค่ uuid ตรงๆ (ประหยัด payload)
  -- asset = Name (e.g. Yuta_Evolved), level = real tower level (GetTowerLevelFromExp),
  -- ascension = Stars, rarity = TowerInfo registry, trait = Trait (fallback StorageTrait)
  -- displayName/image = auto จาก TowerInfo (มีก็ส่ง ไม่มีก็ nil — dashboard fallback เอง ยูนิตใหม่ไม่ต้องแก้สคริปต์)
  local units = {}
  local total = 0
  if typeof(inv.Towers) == "table" then
    for key, t in pairs(inv.Towers) do
      total += 1
      if typeof(t) == "table" and typeof(t.Name) == "string" then
        local uuid = tostring(key):sub(1, 64)
        local asset = tostring(t.Name):sub(1, 64)
        local rr = towerRarity(asset)
        local meta = towerMeta(asset)
        local trait = nil
        if typeof(t.Trait) == "string" and #t.Trait >= 1 then
          trait = t.Trait:sub(1, 32)
        elseif typeof(t.StorageTrait) == "string" and #t.StorageTrait >= 1 then
          trait = t.StorageTrait:sub(1, 32)
        end
        local towerExp = (typeof(t.Exp) == "number" and t.Exp == t.Exp) and t.Exp or 0
        local towerLevel = 1
        if GetTowerLevel then
          local okLvl, lv = pcall(GetTowerLevel, towerExp, rr)
          if okLvl and typeof(lv) == "number" then towerLevel = math.floor(lv) end
        end
        table.insert(units, {
          uuid = uuid,
          asset = asset,
          displayName = (meta and meta.displayName) or nil,
          image = (meta and meta.image) or nil,
          rarity = (typeof(rr) == "string" and rr:sub(1, 32)) or nil,
          level = towerLevel,
          exp = math.floor(towerExp),
          trait = trait,
          ascension = (typeof(t.Stars) == "number" and math.floor(t.Stars)) or nil,
          locked = t.Locked == true and true or nil,
          shiny = t.Shiny == true and true or nil,
          takedowns = (typeof(t.Kills) == "number" and math.floor(t.Kills)) or nil,
          worthiness = (typeof(t.Worthiness) == "number" and math.floor(t.Worthiness)) or nil,
        })
      end
    end
  end
  table.sort(units, function(a, b)
    local ea = equippedSet[a.uuid] or 999
    local eb = equippedSet[b.uuid] or 999
    if ea ~= eb then return ea < eb end
    if (a.level or 0) ~= (b.level or 0) then return (a.level or 0) > (b.level or 0) end
    return (a.exp or 0) > (b.exp or 0)
  end)
  while #units > 1000 do table.remove(units) end

  local playerExp = num(data.Exp)

  return {
    username = username,
    displayName = displayName,
    userId = userId,
    pcName = PC_NAME,
    gameId = "animeorigin",
    money = gold,
    gems = gems,
    aeLevel = 0,
    aeExp = math.floor(playerExp),
    aoExp = math.floor(playerExp),
    unitsTotal = total,
    units = units,
    equippedUnits = equipped,
    skinsTotal = 0,
    skins = {},
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
    warn("[Xsprob-AO] collect fail", tostring(player))
    return
  end
  if API_KEY == "" or API_KEY:sub(1, 3) ~= "sd_" then
    warn("[Xsprob-AO] Missing api_key - get it from Get Script modal after Discord login. PC: " .. tostring(PC_NAME))
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
    log("pushed", player.username, "Exp" .. tostring(player.aoExp), "Gold" .. tostring(player.money), "Towers" .. tostring(player.unitsTotal), "->", res.StatusCode)
  else
    local err = typeof(res) == "table" and (res.Body or res.StatusMessage) or tostring(res)
    err = tostring(err)
    local code = (typeof(res) == "table" and res.StatusCode) or 0
    if code == 429 or err:find("429") or err:lower():find("rate limited") then
      rateLimitedUntil = os.clock() + 65
      warn("[Xsprob-AO] rate limited (6 req/min ต่อ PC / 120 req/min ต่อ key) — พักส่ง ~60 วิแล้วลองใหม่")
    else
      warn("[Xsprob-AO] push failed: " .. err)
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

print("[Xsprob] Bridge running. PC:", PC_NAME, "Game: animeorigin PlaceId:", game.PlaceId, "POSTing to", INGEST_URL)
