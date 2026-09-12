-- Xsprob.lua v4 — Main router: dispatch ไปไฟล์รายแมพ
-- วิธีใช้ (ปุ่ม Copy Script ในเว็บ): ตั้ง getgenv().XsprobConfig (PC_NAME/api_key/ENDPOINT)
-- แล้ว loadstring(game:HttpGet("https://kernelos-pc.tailba1ab3.ts.net/scripts/xsprob.lua"))()
-- config อยู่ใน getgenv ก้อนเดียวกัน ไฟล์รายแมพอ่านต่อเอง ไม่ต้องส่งต่อ

if not game:IsLoaded() then
  game.Loaded:Wait()
end
task.wait(math.random())

local BASE = "https://kernelos-pc.tailba1ab3.ts.net"
local SUPPORTED_NAMES = "Steal An Egg / Anime Expedition / Anime Origin / Blox Fruits"

-- ส่งต่อ ?key= ไปไฟล์รายแมพ (สคริปต์ต้องโหลดผ่าน URL แบบมี key เท่านั้น)
-- key อยู่ใน XsprobConfig ก้อนเดียวกับที่ตั้งก่อน loadstring อยู่แล้ว
local SCRIPT_KEY = ""
pcall(function()
  local g = getgenv and getgenv()
  local cfg = g and (g.XsprobConfig or g.StealDashbordConfig)
  if cfg and type(cfg.api_key) == "string" and #cfg.api_key > 10 then
    SCRIPT_KEY = cfg.api_key
  elseif _G and type(_G.API_KEY) == "string" and #_G.API_KEY > 10 then
    SCRIPT_KEY = _G.API_KEY
  end
end)

-- key คู่: PlaceId ก่อน ไม่เจอค่อยลอง UniverseId (game.GameId)
-- BF ใช้ GameId เดียว (994732206) คลุมทุกทะเล ไม่ต้องลิสต์ทุก sub-place (Q16)
local routes = {
  [107778070777162] = { "Steal An Egg", BASE .. "/scripts/steal-an-egg.lua" },
  [10563114921] = { "Steal An Egg", BASE .. "/scripts/steal-an-egg.lua" },
  [84515722934860] = { "Anime Expedition", BASE .. "/scripts/anime-expeditions.lua" },
  [7613921865] = { "Anime Expedition", BASE .. "/scripts/anime-expeditions.lua" },
  [129932912185311] = { "Anime Origin", BASE .. "/scripts/anime-origin.lua" },
  [116173040971120] = { "Anime Origin", BASE .. "/scripts/anime-origin.lua" },
  [8946565814] = { "Anime Origin", BASE .. "/scripts/anime-origin.lua" },
  [2753915549] = { "Blox Fruits", BASE .. "/scripts/blox-fruits.lua" },
  [994732206] = { "Blox Fruits", BASE .. "/scripts/blox-fruits.lua" },
}

local Players = game:GetService("Players")
local StarterGui = game:GetService("StarterGui")
if not Players.LocalPlayer then
  Players:GetPropertyChangedSignal("LocalPlayer"):Wait()
end
local LocalPlayer = Players.LocalPlayer

-- แมพไม่รู้จัก: แจ้งเตือน 3 วิแล้ว Kick (Q10/Q15 — รันแมพมั่วไม่ต้องรันต่อ)
local route = routes[game.PlaceId] or routes[game.GameId]
if not route then
  local msg = ("[Xsprob] แมพนี้ไม่รองรับ (PlaceId %s, GameId %s) — รองรับ: %s"):format(tostring(game.PlaceId), tostring(game.GameId), SUPPORTED_NAMES)
  warn(msg)
  pcall(function()
    StarterGui:SetCore("SendNotification", { Title = "Xsprob - Unsupported map", Text = "แมพนี้ไม่รองรับ จะออกใน 3 วิ (PlaceId " .. tostring(game.PlaceId) .. ")", Duration = 3 })
  end)
  task.wait(3)
  pcall(function()
    LocalPlayer:Kick(("❌ [Xsprob] แมพนี้ไม่รองรับ\nรองรับ: %s\nPlaceId: %s\nGameId: %s\nก๊อปเลขนี้แจ้งแอดมินได้เลย"):format(SUPPORTED_NAMES, tostring(game.PlaceId), tostring(game.GameId)))
  end)
  return
end

-- กันรันซ้ำ (รันสคริปต์เบิ้ล / re-teleport ในแมพเดิม)
local state = nil
pcall(function()
  if type(getgenv) == "function" then
    local g = getgenv()
    if type(g) == "table" then
      if type(g.XsprobLoaderState) ~= "table" then
        g.XsprobLoaderState = { loaded = {} }
      end
      state = g.XsprobLoaderState
    end
  end
end)
if state == nil then
  state = { loaded = {} }
end
if state.loaded[route[1]] then
  return
end
state.loaded[route[1]] = true

-- โหลดไฟล์รายแมพแล้วรันจริง (ไม่ใช่แค่ compile) — แนบ ?key= ไปด้วยเสมอ
local mapUrl = route[2]
if #SCRIPT_KEY > 10 then
  mapUrl = mapUrl .. "?key=" .. SCRIPT_KEY
end
local ok, src = pcall(game.HttpGet, game, mapUrl)
if not ok or type(src) ~= "string" or #src < 32 then
  warn(("[Xsprob] โหลด %s ไม่สำเร็จ: %s"):format(route[1], tostring(src)))
  state.loaded[route[1]] = nil
  return
end
local fn, loadErr = loadstring(src)
if type(fn) ~= "function" then
  warn(("[Xsprob] compile %s ไม่ผ่าน: %s"):format(route[1], tostring(loadErr)))
  state.loaded[route[1]] = nil
  return
end
local okRun, runErr = pcall(fn)
if not okRun then
  warn(("[Xsprob] รัน %s ไม่สำเร็จ: %s"):format(route[1], tostring(runErr)))
  state.loaded[route[1]] = nil
  return
end
print(("[Xsprob] router loaded %s (PlaceId %s, GameId %s)"):format(route[1], tostring(game.PlaceId), tostring(game.GameId)))
