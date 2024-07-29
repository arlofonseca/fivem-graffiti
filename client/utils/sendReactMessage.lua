---@param action string
---@param data any
local function sendReactMessage(action, data)
    SendNUIMessage({ action = action, data = data })
end

return sendReactMessage
