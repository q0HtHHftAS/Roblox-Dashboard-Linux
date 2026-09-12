-- StealAnEgg (map module, loaded by Xsprob.lua router) — Bridge Steal An Egg -> Xsprob
-- Only LocalPlayer, multi-PC via PC_NAME, EGGS + Treadmill Lv, FieldSignal + 15s poll (ส่งห่างกันอย่างน้อย 15s + backoff เมื่อโดน 429)

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local HttpService = game:GetService("HttpService")
local StarterGui = game:GetService("StarterGui")

-- Self-check: ไฟล์นี้ของ Steal An Egg เท่านั้น อยู่ผิดแมพ = แจ้ง 3 วิแล้ว Kick
-- (router คัดมาให้แล้วชั้นนึง อันนี้กันคนเอาไฟล์ไปรันตรง ๆ ผิดแมพ;
--  เช็คก่อนรอ __LOADED เพราะ attribute นี้มีแค่ใน Steal An Egg — รอในแมพอื่น = ค้างตลอดกาล)
local MY_PLACE_IDS = {
  [107778070777162] = true,
}
local MY_GAME_IDS = {
  [10563114921] = true,
}
local MY_NAME = "Steal An Egg"

-- Q7-A fallback: ถ้าไม่ได้ตั้ง ENDPOINT ผ่าน XsprobConfig ให้ยิงเข้า canonical โดยตรง
-- (localhost เอาไว้เฉพาะตอน dev — ตั้ง ENDPOINT=http://localhost:3000/api/ingest เอง)
local INGEST_URL = "https://kernelos-pc.tailba1ab3.ts.net/api/ingest"
local POLL_INTERVAL = 15
local DEBUG = false

local function log(...) if DEBUG then print("[Xsprob]", ...) end end

-- PC_NAME + user_id/api_key from Get Script modal (multi-user Q2/Q7) — supports Xsprob + legacy
local PC_NAME = "PC-001"
local API_KEY = ""
local USER_ID = ""
pcall(function()
  local cfg = getgenv and (getgenv().XsprobConfig or getgenv().StealDashbordConfig)
  if cfg then
    if cfg["PC_NAME"] and typeof(cfg["PC_NAME"])=="string" and #cfg["PC_NAME"]>=4 then
      PC_NAME = cfg["PC_NAME"]
    elseif getgenv and getgenv().DuckyConfig and getgenv().DuckyConfig["PC_NAME"] then
      PC_NAME = getgenv().DuckyConfig["PC_NAME"]
    end
    if cfg["api_key"] and typeof(cfg["api_key"])=="string" and #cfg["api_key"]>10 then API_KEY = cfg["api_key"] end
    if cfg["user_id"] and typeof(cfg["user_id"])=="string" and #cfg["user_id"]>=5 then USER_ID = cfg["user_id"] end
    if cfg["ENDPOINT"] and typeof(cfg["ENDPOINT"])=="string" and #cfg["ENDPOINT"]>8 then INGEST_URL = cfg["ENDPOINT"] end
  end
end)
-- also allow _G
pcall(function()
  if PC_NAME=="PC-001" and _G.PC_NAME and #_G.PC_NAME>=4 then PC_NAME=_G.PC_NAME end
  if API_KEY=="" and _G.API_KEY and typeof(_G.API_KEY)=="string" and #_G.API_KEY>10 then API_KEY=_G.API_KEY end
  if USER_ID=="" and _G.USER_ID and typeof(_G.USER_ID)=="string" and #_G.USER_ID>=5 then USER_ID=_G.USER_ID end
  if _G.ENDPOINT and typeof(_G.ENDPOINT)=="string" and #_G.ENDPOINT>8 then INGEST_URL=_G.ENDPOINT end
end)

-- Security: api_key จะถูกส่งไปที่ INGEST_URL — เตือนถ้าไม่ใช่ HTTPS/localhost หรือไม่ใช่ปลายทางหลัก
-- (กันเผลอวางสคริปต์ที่คนอื่นแก้ ENDPOINT เป็นเซิร์ฟเวอร์เขา: key จะหลุดไปที่นั่น)
do
  local canonical = "https://kernelos-pc.tailba1ab3.ts.net/api/ingest"
  local isHttps = INGEST_URL:sub(1, 8) == "https://"
  local isLocal = INGEST_URL:find("^http://localhost") ~= nil or INGEST_URL:find("^http://127%.0%.0%.1") ~= nil
  if not isHttps and not isLocal then
    warn("[Xsprob] SECURITY: ENDPOINT is not HTTPS (" .. tostring(INGEST_URL) .. ") - api_key will travel in cleartext!")
  elseif INGEST_URL ~= canonical and not isLocal then
    warn("[Xsprob] NOTE: pushing to custom ENDPOINT " .. tostring(INGEST_URL))
  end
end

if not Players.LocalPlayer then Players:GetPropertyChangedSignal("LocalPlayer"):Wait() end
local LocalPlayer = Players.LocalPlayer

-- Self-check: ไฟล์นี้ของ Steal An Egg เท่านั้น — ผิดแมพ = แจ้ง 3 วิแล้ว Kick (ไม่ silent)
do
  local okMap = MY_PLACE_IDS[game.PlaceId] or MY_GAME_IDS[game.GameId]
  if okMap then
    log("Map OK:", MY_NAME, "PlaceId:", game.PlaceId)
  else
    local msg = ("[Xsprob-StealAnEgg] ไฟล์นี้สำหรับ %s เท่านั้น (PlaceId %s, GameId %s)"):format(MY_NAME, tostring(game.PlaceId), tostring(game.GameId))
    warn(msg)
    pcall(function()
      StarterGui:SetCore("SendNotification", { Title = "Xsprob - Unsupported map", Text = "ไฟล์นี้ของ " .. MY_NAME .. " จะออกใน 3 วิ (PlaceId " .. tostring(game.PlaceId) .. ")", Duration = 3 })
    end)
    task.wait(3)
    pcall(function()
      LocalPlayer:Kick(("❌ [Xsprob] ไฟล์นี้สำหรับ %s เท่านั้น\nPlaceId ปัจจุบัน: %s\nGameId ปัจจุบัน: %s\nก๊อปเลขนี้แจ้งแอดมินได้เลย"):format(MY_NAME, tostring(game.PlaceId), tostring(game.GameId)))
    end)
    return
  end
end

if not LocalPlayer:GetAttribute("__LOADED") then
  log("Waiting for __LOADED... PC:", PC_NAME)
  repeat task.wait(0.5) until LocalPlayer:GetAttribute("__LOADED")
end

local Save, AssetEarnings, Bases, TreadmillUtil, EggRecords, Assets
local function safeRequire(path)
  local ok, m = pcall(require, path)
  if ok then return m end
  return nil
end

-- น้ำหนักจริงของเกม = floor(Scale^3 * 60000) (体积 ~ scale^3; cross-check กับ dashboard อื่น
-- เช่น ไข่ Rainbow scale 6.0336 -> floor(6.0336^3*60000) = 13,178,796 ตรงเป๊ะ)
local function petWeight(scale)
  local sc = typeof(scale)=="number" and scale or 1
  return math.floor(sc*sc*sc*60000)
end

Save = safeRequire(ReplicatedStorage.Shared.Save)
AssetEarnings = safeRequire(ReplicatedStorage.Shared.Util.AssetEarnings)
Bases = safeRequire(ReplicatedStorage.Data.Bases)
TreadmillUtil = safeRequire(ReplicatedStorage.Shared.Util.TreadmillUtil)
EggRecords = safeRequire(ReplicatedStorage.Shared.Util.EggRecords)
Assets = safeRequire(ReplicatedStorage.Data.Assets)

if not Save then warn(("[Xsprob] Save not found (PlaceId %s — เกมอาจอัปเดตโครงสร้างแล้ว)"):format(tostring(game.PlaceId))); return end

local function getPlotIdForPlayer(username, displayName)
  for _, plot in ipairs(Workspace.Plots:GetChildren()) do
    local ok, txt = pcall(function()
      return plot.PlotSign.PlayerPlotSign.Frame.PlayerName.Text
    end)
    if ok and txt and txt ~= "" then
      if txt == username or txt == displayName then return plot.Name end
      if string.find(username, txt, 1, true) or string.find(txt, username, 1, true) then return plot.Name end
      if displayName and (string.find(displayName, txt, 1, true) or string.find(txt, displayName, 1, true)) then return plot.Name end
    end
  end
  return nil
end

local function getBaseLevel(plotId)
  if not plotId then return 0 end
  local plot = Workspace.Plots:FindFirstChild(plotId)
  if plot then return plot:GetAttribute("BaseUpgradeLevel") or 0 end
  return 0
end

local function getMaxCapacity(baseLevel)
  if Bases and Bases.GetAssetEquipCapacity then
    local ok, v = pcall(Bases.GetAssetEquipCapacity, baseLevel)
    if ok and typeof(v)=="number" then return v end
  end
  local fallback = { [0]=7, [1]=7, [2]=9, [3]=10, [4]=11, [5]=12, [6]=13, [7]=14, [8]=15, [9]=16, [10]=17, [11]=18 }
  return fallback[baseLevel] or 18
end

local function getNextCost(baseLevel)
  if Bases and Bases.BASES then
    local nxt = Bases.BASES[baseLevel + 2]
    if nxt and nxt.Cost then return nxt.Cost end
  end
  return nil
end

local function collectLocal()
  local plr = LocalPlayer
  local username = plr.Name
  local displayName = plr.DisplayName
  local userId = plr.UserId
  local plotId = getPlotIdForPlayer(username, displayName)
  local data = Save.ReadUnguarded()
  local money = typeof(data.Money)=="number" and data.Money or 0
  local speedPower = typeof(data.SpeedPower)=="number" and data.SpeedPower or 0
  local baseLevel = typeof(data.BaseUpgradeLevel)=="number" and data.BaseUpgradeLevel or getBaseLevel(plotId)
  local treadmillLevel = typeof(data.TreadmillUpgradeLevel)=="number" and data.TreadmillUpgradeLevel or 0

  local moneyPerSec = 0
  local ls = plr:FindFirstChild("leaderstats")
  if ls and ls:FindFirstChild("Money/s") then
    moneyPerSec = ls["Money/s"].Value
  else
    if AssetEarnings and data.EquippedAssets and data.Inventory then
      for _, uuid in ipairs(data.EquippedAssets) do
        local inv = data.Inventory[uuid]
        if inv then
          local ok, rate = pcall(AssetEarnings.RatePerSecond, inv)
          if ok and typeof(rate)=="number" then moneyPerSec += rate end
        end
      end
    end
  end

  local walkSpeed = 16
  pcall(function()
    if plr.Character and plr.Character:FindFirstChildOfClass("Humanoid") then
      walkSpeed = plr.Character:FindFirstChildOfClass("Humanoid").WalkSpeed
    elseif TreadmillUtil and TreadmillUtil.SpeedPowerToWalkSpeed then
      walkSpeed = TreadmillUtil.SpeedPowerToWalkSpeed(speedPower)
    end
  end)

  local capacity = data.EquippedAssets and #data.EquippedAssets or 0
  local maxCapacity = getMaxCapacity(baseLevel)
  local nextCost = getNextCost(baseLevel)

  local pets = {}
  if data.EquippedAssets and data.Inventory and AssetEarnings then
    for _, uuid in ipairs(data.EquippedAssets) do
      local inv = data.Inventory[uuid]
      if inv then
        local rate = 0
        pcall(function() rate = AssetEarnings.RatePerSecond(inv) end)
        if rate==0 and AssetEarnings.LiveRatePerSecond then
          pcall(function() rate = AssetEarnings.LiveRatePerSecond(inv, data.Gamepasses, data.Products, plr) end)
        end
        local icon
        pcall(function()
          if Assets and Assets.Directory and Assets.Directory[inv.Category] and Assets.Directory[inv.Category].Icon then
            icon = Assets.Directory[inv.Category].Icon
          end
          if not icon then
            local cfg = safeRequire(ReplicatedStorage.Data.Assets.Configs[inv.Category])
            if cfg and cfg.Icon then icon = cfg.Icon end
          end
        end)
        table.insert(pets, {
          uuid = uuid,
          name = inv.Category or "Unknown",
          category = inv.Category or "Unknown",
          ratePerSecond = rate or 0,
          scale = typeof(inv.Scale)=="number" and inv.Scale or 1,
          weight = petWeight(inv.Scale),
          mutations = inv.Mutations or {},
          icon = icon,
        })
      end
    end
    table.sort(pets, function(a,b) return (a.ratePerSecond or 0) > (b.ratePerSecond or 0) end)
  end

  -- Full Inventory for aggregation (v3) - all pets
  local inventory = {}
  if data.Inventory and AssetEarnings then
    local equippedSet = {}
    if data.EquippedAssets then for _,u in ipairs(data.EquippedAssets) do equippedSet[u]=true end end
    for uuid, inv in pairs(data.Inventory) do
      local rate = 0
      pcall(function() rate = AssetEarnings.RatePerSecond(inv) end)
      if rate==0 and AssetEarnings.LiveRatePerSecond then
        pcall(function() rate = AssetEarnings.LiveRatePerSecond(inv, data.Gamepasses, data.Products, plr) end)
      end
      if rate==0 and AssetEarnings.MutationOnlyRatePerSecond then
        pcall(function() rate = AssetEarnings.MutationOnlyRatePerSecond(inv) end)
      end
      local rarity, rarityNumber, icon
      pcall(function()
        if Assets and Assets.Directory and Assets.Directory[inv.Category] and Assets.Directory[inv.Category].Rarity then
          local r = Assets.Directory[inv.Category].Rarity
          rarity = r.DisplayName or r._id or "Unknown"
          rarityNumber = r.RarityNumber
        end
        if Assets and Assets.Directory and Assets.Directory[inv.Category] and Assets.Directory[inv.Category].Icon then
          icon = Assets.Directory[inv.Category].Icon
        end
        if not icon then
          local cfg = safeRequire(ReplicatedStorage.Data.Assets.Configs[inv.Category])
          if cfg and cfg.Icon then icon = cfg.Icon end
        end
      end)
      table.insert(inventory, {
        uuid = uuid,
        name = inv.Category or "Unknown",
        category = inv.Category or "Unknown",
        ratePerSecond = rate or 0,
        scale = typeof(inv.Scale)=="number" and inv.Scale or 1,
        mutations = inv.Mutations or {},
        rarity = rarity or "Unknown",
        rarityNumber = rarityNumber or 99,
        weight = petWeight(inv.Scale),
        isEquipped = equippedSet[uuid] or false,
        icon = icon,
      })
    end
    table.sort(inventory, function(a,b) return (a.ratePerSecond or 0) > (b.ratePerSecond or 0) end)
  end

  -- Eggs list for aggregation
  local eggsList = {}
  if data.EggInventory then
    for uuid, egg in pairs(data.EggInventory) do
      -- Decode egg first (Placement.LocalCFrame is table in Save, but EggRecords expects CFrame)
      -- decoded รูปแบบเดียวกันทั้ง rate calc และ remaining calc ด้านล่าง
      local decodedEgg = egg
      pcall(function()
        if EggRecords and EggRecords.Decode then
          local ok, dec = pcall(EggRecords.Decode, egg)
          if ok and dec and dec.Placement then decodedEgg = dec end
        end
      end)
      local rate = 0
      if EggRecords and AssetEarnings then
        local ok, item = pcall(EggRecords.ToAssetItemData, decodedEgg)
        if ok and item then
          local ok2, r = pcall(AssetEarnings.MutationOnlyRatePerSecond, item)
          if ok2 and typeof(r)=="number" then rate = r end
        end
      end
      local rarity, rarityNumber, icon
      pcall(function()
        if Assets and Assets.Directory and Assets.Directory[egg.AssetCategory] and Assets.Directory[egg.AssetCategory].Rarity then
          local r = Assets.Directory[egg.AssetCategory].Rarity
          rarity = r.DisplayName or r._id or "Unknown"
          rarityNumber = r.RarityNumber
        end
        if Assets and Assets.Directory and Assets.Directory[egg.AssetCategory] and Assets.Directory[egg.AssetCategory].Egg and Assets.Directory[egg.AssetCategory].Egg.Icon then
          icon = Assets.Directory[egg.AssetCategory].Egg.Icon
        end
        if not icon then
          local mod = ReplicatedStorage.Data.Assets.Configs:FindFirstChild(egg.AssetCategory)
          if mod then
            local ok2, cfg2 = pcall(require, mod)
            if ok2 and cfg2 and cfg2.Egg and cfg2.Egg.Icon then icon = cfg2.Egg.Icon end
          end
        end
      end)
       local remaining
       local mult = decodedEgg.GrowthSpeedMultiplier
       if type(mult) ~= "number" or mult <= 0 then mult = 1 end
       local nightCredit = 0
       pcall(function()
         if EggRecords and EggRecords.CurrentNightCredit and decodedEgg.Placement then
           local nc = EggRecords.CurrentNightCredit(decodedEgg, workspace:GetServerTimeNow(), mult)
           if type(nc) == "number" then nightCredit = nc end
         end
       end)
       pcall(function()
         if decodedEgg.Placement and EggRecords and EggRecords.GrowthSecondsRemaining then
           local rem = EggRecords.GrowthSecondsRemaining(decodedEgg, workspace:GetServerTimeNow(), mult, nightCredit, LocalPlayer)
           if rem ~= nil then
             if EggRecords.WallSecondsRemaining then
               local ok2, wall = pcall(EggRecords.WallSecondsRemaining, decodedEgg, workspace:GetServerTimeNow(), mult, nightCredit)
               if ok2 and type(wall) == "number" then
                 remaining = wall
               else
                 remaining = rem / mult
               end
             else
               remaining = rem / mult
             end
           end
         end
       end)
       -- fallback manual calc if still nil
       if remaining == nil and decodedEgg.Placement then
         pcall(function()
           local dur = EggRecords.GrowthDuration(decodedEgg)
           local elapsed = workspace:GetServerTimeNow() - decodedEgg.Placement.PlacedAt
           local credit = decodedEgg.Placement.GrowthCreditSeconds or 0
           local totalCredit = credit + (nightCredit or 0)
           remaining = math.max(0, (dur - totalCredit) / mult - elapsed)
         end)
       end
      table.insert(eggsList, {
        uuid = uuid,
        name = egg.AssetCategory or "Unknown",
        category = egg.AssetCategory or "Unknown",
        ratePerSecond = rate or 0,
        scale = typeof(egg.AssetScale)=="number" and egg.AssetScale or 1,
        mutations = egg.Mutations or {},
        rarity = rarity or "Unknown",
        rarityNumber = rarityNumber or 99,
        weight = petWeight(egg.AssetScale),
        isEgg = true,
        remaining = remaining,
        isEquipped = egg.Placement ~= nil,
        icon = icon,
      })
    end
    table.sort(eggsList, function(a,b) return (a.ratePerSecond or 0) > (b.ratePerSecond or 0) end)
  end

  -- EGGS: count + sum potential rate (Q4)
  local eggsInBag = 0
  local eggsTotal = 0
  local eggsPerSec = 0
  if data.EggInventory then
    for _, egg in pairs(data.EggInventory) do
      eggsTotal += 1
      local inBag = egg.Placement == nil
      if inBag then eggsInBag += 1 end
      -- sum for All in bag vs total? use InBag for display, but calculate sum for InBag
      if inBag and EggRecords and AssetEarnings then
        local ok, item = pcall(EggRecords.ToAssetItemData, egg)
        if ok and item then
          local ok2, rate = pcall(AssetEarnings.MutationOnlyRatePerSecond, item)
          if ok2 and typeof(rate)=="number" then eggsPerSec += rate end
        end
      end
    end
    -- if no eggs in bag but has placed, still show total; fallback to total sum
    if eggsInBag==0 and eggsTotal>0 and eggsPerSec==0 and EggRecords and AssetEarnings then
      for _, egg in pairs(data.EggInventory) do
        local dec2 = egg
        pcall(function()
          if EggRecords and EggRecords.Decode then
            local okd, dd = pcall(EggRecords.Decode, egg)
            if okd and dd and dd.Placement then dec2 = dd end
          end
        end)
        local ok, item = pcall(EggRecords.ToAssetItemData, dec2)
        if ok and item then
          local ok2, rate = pcall(AssetEarnings.MutationOnlyRatePerSecond, item)
          if ok2 and typeof(rate)=="number" then eggsPerSec += rate end
        end
      end
    end
  end

  return {
    username = username,
    displayName = displayName,
    userId = userId,
    pcName = PC_NAME,
    gameId = "stealanegg",
    money = money,
    moneyPerSec = moneyPerSec,
    speedPower = speedPower,
    walkSpeed = walkSpeed,
    baseLevel = baseLevel,
    treadmillLevel = treadmillLevel,
    capacity = capacity,
    maxCapacity = maxCapacity,
    nextCost = nextCost,
    petsInBase = capacity,
    pets = pets,
    inventory = inventory,
    eggsInBag = eggsInBag,
    eggsTotal = eggsTotal,
    eggsPerSec = eggsPerSec,
    eggsList = eggsList,
    isLocal = true,
    plotId = plotId,
    lastUpdated = DateTime.now().UnixTimestampMillis,
  }
end

-- Throttle กันโดน rate limit (server ให้ 6 req/min): ส่งห่างกันอย่างน้อย MIN_PUSH_GAP วินาที
-- FieldSignal (โดยเฉพาะ Money) ยิงถี่มากตอนฟาร์ม ถ้าส่งทุกครั้งจะโดน 429 รัว ๆ
local lastPush = 0
local MIN_PUSH_GAP = 15
-- โดน 429 (6 req/min ต่อ PC / 120 req/min ต่อ apiKey) = พักส่ง ~65 วิแล้วค่อยลองใหม่ กันยิงซ้ำจนโควตาไม่รีเซ็ต
local rateLimitedUntil = 0

local function push()
  if os.clock() < rateLimitedUntil then return end
  lastPush = os.clock()
  local okData, player = pcall(collectLocal)
  if not okData or not player then
    warn("[Xsprob] collect fail", player)
    return
  end
  if API_KEY == "" or API_KEY:sub(1,3) ~= "sd_" then
    warn("[Xsprob] Missing api_key - get it from Get Script modal after Discord login. PC:", PC_NAME)
    return -- ไม่ส่ง request เปล่า (server ตอบ 401 อยู่ดี) ประหยัดโควตา rate limit
  end
  local payload = HttpService:JSONEncode({ api_key = API_KEY, user_id = USER_ID, players = {player}, timestamp = DateTime.now().UnixTimestampMillis })
  log("payload sample", payload:sub(1,600))
  local ok, res = pcall(request, {
    Url = INGEST_URL,
    Method = "POST",
    Headers = { ["Content-Type"]="application/json" },
    Body = payload,
  })
  if ok and type(res)=="table" and res.Success then
    log("pushed", player.username, "PC:", PC_NAME, "Money", math.floor(player.money), "M/s", math.floor(player.moneyPerSec), "Eggs", player.eggsInBag, "->", res.StatusCode)
  else
    local err = typeof(res)=="table" and (res.Body or res.StatusMessage) or tostring(res)
    err = tostring(err)
    local code = (typeof(res)=="table" and res.StatusCode) or 0
    if code == 429 or err:find("429") or err:lower():find("rate limited") then
      rateLimitedUntil = os.clock() + 65
      warn("[Xsprob] rate limited (6 req/min ต่อ PC / 120 req/min ต่อ key) — พักส่ง ~60 วิแล้วลองใหม่")
    else
      warn("[Xsprob] push failed:", err)
    end
    -- หมายเหตุ: ไม่มี fallback HttpPost แล้ว — HttpService เรียกจาก client ไม่ได้อยู่ดี (server-side only)
  end
end

task.wait(2)
push()
log("Initial push done. LocalPlayer:", LocalPlayer.Name, "PC:", PC_NAME, "Plot:", tostring(getPlotIdForPlayer(LocalPlayer.Name, LocalPlayer.DisplayName)))

local function requestPush()
  -- จุดคอขวดเดียวของการส่ง: ยังไม่ครบ MIN_PUSH_GAP ก็ข้ามไป รอบถัดไปค่อยส่ง
  if os.clock() - lastPush >= MIN_PUSH_GAP then
    push()
  end
end

if Save.FieldSignal then
  pcall(function() Save.FieldSignal("Money"):Connect(requestPush) end)
  pcall(function() Save.FieldSignal("SpeedPower"):Connect(requestPush) end)
  pcall(function() Save.FieldSignal("BaseUpgradeLevel"):Connect(requestPush) end)
  pcall(function() Save.FieldSignal("TreadmillUpgradeLevel"):Connect(requestPush) end)
  pcall(function() Save.FieldSignal("EquippedAssets"):Connect(requestPush) end)
  pcall(function() Save.FieldSignal("Inventory"):Connect(requestPush) end)
  pcall(function() Save.FieldSignal("EggInventory"):Connect(requestPush) end)
end

task.spawn(function()
  while true do
    task.wait(POLL_INTERVAL)
    requestPush()
  end
end)

print("[Xsprob] Bridge v3 running. PC:", PC_NAME, "Game: stealanegg PlaceId:", game.PlaceId, "POSTing to", INGEST_URL, "throttled", MIN_PUSH_GAP .. "s+")
