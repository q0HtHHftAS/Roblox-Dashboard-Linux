-- BloxFruits (map module, loaded by Xsprob.lua router) — STUB
-- เจอแมพแล้วแต่ collector ยังไม่เสร็จ: แจ้ง Coming soon แล้วหยุด ไม่ส่ง payload มั่ว ไม่ kick

if not game:IsLoaded() then
  game.Loaded:Wait()
end

-- 3 ทะเล (PlaceId) + UniverseId เดียวคลุมหมด
local PLACE_IDS = { [2753915549] = true, [4442272183] = true, [7449423635] = true }
local GAME_IDS = { [994732206] = true }

local Players = game:GetService("Players")
local StarterGui = game:GetService("StarterGui")
if not Players.LocalPlayer then
  Players:GetPropertyChangedSignal("LocalPlayer"):Wait()
end
local LocalPlayer = Players.LocalPlayer

if not (PLACE_IDS[game.PlaceId] or GAME_IDS[game.GameId]) then
  local msg = ("[Xsprob] ไฟล์ BloxFruits ถูกโหลดในแมพที่ไม่ใช่ (PlaceId %s, GameId %s)"):format(tostring(game.PlaceId), tostring(game.GameId))
  warn(msg)
  pcall(function()
    StarterGui:SetCore("SendNotification", { Title = "Xsprob - Unsupported map", Text = "ไฟล์นี้ของ Blox Fruits จะออกใน 3 วิ", Duration = 3 })
  end)
  task.wait(3)
  pcall(function()
    LocalPlayer:Kick(("❌ [Xsprob] ไฟล์นี้สำหรับ Blox Fruits\nPlaceId ปัจจุบัน: %s"):format(tostring(game.PlaceId)))
  end)
  return
end

warn("[Xsprob] เจอ Blox Fruits แล้ว — collector รอบหน้า ตอนนี้ยังไม่เก็บข้อมูล")
pcall(function()
  StarterGui:SetCore("SendNotification", { Title = "Xsprob - Coming soon", Text = "Blox Fruits จะรองรับรอบหน้า", Duration = 6 })
end)
print("[Xsprob] BloxFruits stub ok. PlaceId:", game.PlaceId)
return
