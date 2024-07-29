---@param event string
---@param cb fun(playerId: number, ...: any): ...
local function registerCallback(event, cb)
    lib.callback.register(event, function(source, ...)
        return cb(source, ...)
    end)
end

return registerCallback
