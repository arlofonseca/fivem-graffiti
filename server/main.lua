local config = require 'config.server'
local db = require 'server.db'
local registerCallback = require 'server.utils.registerCallback'
local sendChatMessage = require 'server.utils.sendChatMessage'

---@type table<number, Graffiti>
local createdGraffiti = {}
local hasStarted = false
local group = ('group.%s'):format(config.aceGroup)
local restrictedGroup = config.adminOnly and group or nil

if GetCurrentResourceName() ~= 'fivem-graffiti' then
    error("Please don\'t rename this resource, change the folder name (back) to \'fivem-graffiti\'.")
    return
end

if not LoadResourceFile('fivem-graffiti', 'web/dist/index.html') then
    error("UI has not been built, refer to the 'README.md' or download a release build.\n^3https://github.com/shifu614/fivem-graffiti/releases/latest^0")
    return
end

---@param source number
---@param args { graffitiId: number }
local function deleteGraffiti(source, args)
    local identifier = GetPlayerIdentifierByType(source --[[@as string]], config.identifierType)
    local graffitiId = args.graffitiId
    local success, result = pcall(function()
        local data = createdGraffiti[graffitiId]
        if not data then
            return sendChatMessage(source, '^1ERROR: ^0No graffiti found with the specified id.')
        end

        local rowsChanged = db.deleteGraffiti(graffitiId)
        if not rowsChanged or (type(rowsChanged) == 'number' and rowsChanged == 0) then
            error('Failed to delete graffiti from the database')
            return sendChatMessage(source, '^1ERROR: ^0Failed to delete graffiti.')
        end

        createdGraffiti[graffitiId] = nil
        TriggerClientEvent('fivem-graffiti:client:deleteGraffiti', source, graffitiId)
        sendChatMessage(source, '^4Graffiti was successfully deleted.')
        lib.print.info(("[Graffiti] Deleted ID '%s'."):format(graffitiId))
        lib.print.warn(source, ("**'%s'** has deleted graffiti **'%s'**."):format(identifier, graffitiId))
        if config.logging then
            lib.logger(source, 'admin', ("**'%s'** has deleted graffiti **'%s'**."):format(identifier, graffitiId))
        end
    end)

    if success then return end

    error(('Error deleting Graffiti %s'):format(result))
    sendChatMessage(source, ('^1ERROR: ^0An error occurred while deleting graffiti %s.'):format(graffitiId))
end

---@param source integer
---@return number
local function getSprayCan(source)
    return exports.ox_inventory:GetItem(source, 'spraycan', false, true) or 0
end

---@param source integer
---@param amount number
local function removeSprayCan(source, amount)
    exports.ox_inventory:RemoveItem(source, 'spraycan', amount)
end

registerCallback('fivem-graffiti:server:hasStarted', function()
    return hasStarted
end)

---@param source number
---@return number
registerCallback('fivem-graffiti:server:getRoutingBucket', function(source)
    return GetPlayerRoutingBucket(source --[[@as string]])
end)

---@return table<number, Graffiti>
registerCallback('fivem-graffiti:server:getGraffiti', function()
    return createdGraffiti
end)

RegisterNetEvent('fivem-graffiti:server:loadGraffiti', function()
    db.loadGraffiti(source)
end)

---@param graffitiId number
RegisterNetEvent('fivem-graffiti:server:deleteGraffiti', function(graffitiId)
    deleteGraffiti(source, { graffitiId = graffitiId })
end)

---@param source number
---@param graffitiId number
---@return boolean
registerCallback('fivem-graffiti:server:isGraffitiOwner', function(source, graffitiId)
    local identifier = GetPlayerIdentifierByType(source --[[@as string]], config.identifierType)
    local graffiti = createdGraffiti[graffitiId]
    return graffiti?.creator_id == identifier
end)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= 'fivem-graffiti' then return end

    Wait(100)

    local graffiti = db.loadGraffiti()
    if not graffiti then return end

    for i = 1, #graffiti do
        local data = graffiti[i]
        createdGraffiti[data.id] = data
    end
end)

lib.addCommand({ 'graffiti' }, {
    help = nil,
    params = false,
    restricted = false,
}, function(source)
    if not hasStarted then return end

    local src = source
    if not src then return false end

    local identifier = GetPlayerIdentifierByType(source --[[@as string]], config.identifierType)
    local activeGraffiti = db.countGraffiti(identifier)
    if activeGraffiti >= config.maxGraffiti then
        return sendChatMessage(source, '^1ERROR: ^0You cannot have more than {0} graffiti tags at a time.', { config.maxGraffiti })
    end

    ---@todo
    ---probably better to fetch and remove the item when a player actually completes the pre-creation process,
    ---instead of removing it when they simply open the creation panel.
    local item = getSprayCan(src)
    if item < 1 then
        return false, sendChatMessage(source, '^1ERROR: ^0You do not have a spray can.')
    end

    if true then
        removeSprayCan(src, 1)
    end

    TriggerClientEvent('fivem-graffiti:client:creationPanel', source, false)

    return true
end)

lib.addCommand({ 'removegraffiti', 'rg' }, {
    help = nil,
    params = {
        {
            name = 'graffitiId',
            help = 'The id of the graffiti',
            type = 'number',
            optional = false
        }
    },
    restricted = restrictedGroup,
}, deleteGraffiti)

CreateThread(function()
    Wait(2000)

    hasStarted = true
    TriggerClientEvent('fivem-graffiti:client:startedCheck', -1)
end)