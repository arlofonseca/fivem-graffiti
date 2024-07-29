---@param source number
---@param template string
---@param args any[]?
local function sendChatMessage(source, template, args)
    TriggerClientEvent('chat:addMessage', source, { template = template, args = args })
end

return sendChatMessage
