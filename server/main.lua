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

---@param data { text: string }
RegisterNetEvent('fivem-graffiti:server:createGraffiti', function(data)
    local src = source
    local identifier = GetPlayerIdentifierByType(src --[[@as string]], config.identifierType)
    local activeGraffiti = db.countGraffiti(identifier)
    -- The command '/graffiti' already checks this, but keeping this just in case anything happens
    if not activeGraffiti >= config.maxGraffiti then
        return sendChatMessage(src, '^1ERROR: ^0You cannot have more than {0} active graffiti tags at a time.', { config.maxGraffiti })
    end

    local coords = GetEntityCoords(GetPlayerPed(src))
    if config.maxGraffiti > 1 then
        for _, v in pairs(createdGraffiti) do
            local distance = #(coords - v.coords)
            if not v.creator_id == identifier and distance < 2 then
                sendChatMessage(src, ('^1ERROR: ^0You cannot create a new graffiti tag within %s meters of your old one.'):format(distance))
            end
        end
    end

    local text = data.text
    if not text then
        return sendChatMessage(src, '^1ERROR: ^0You must insert text for your Graffiti tag.')
    end

    local bucket = GetPlayerRoutingBucket(src --[[@as string]])
    local coordsStr = json.encode(coords)
    local success, result = pcall(function()
        local rowsChanged = db.saveGraffiti(identifier, coordsStr, bucket, text)
        if not rowsChanged or (type(rowsChanged) == 'number' and rowsChanged == 0) then
            error('Failed to insert graffiti into the database')
            return sendChatMessage(src, '^1ERROR: ^0Failed to create graffiti tag.')
        end

        local id = rowsChanged.insertId
        if not id then return end

        createdGraffiti[id] = {
            id = id,
            creator_id = identifier,
            coords = coords,
            dimension = bucket,
            text = text,
            disable = false
        }

        TriggerClientEvent('fivem-graffiti:client:createGraffiti', -1, id, coords, bucket, text)
        sendChatMessage(src, '^4You have successfully created a Graffiti tag. Use ^0/clean ^4to remove it.')
        lib.print.info(("[Graffiti] Created ID '%s'."):format(id))
        lib.print.warn(src, ("**%s** ('%s') initiated the creation of a graffiti tag. **Text:** '%s', **Location:** '%s'."):format(identifier, text, coords))
        if config.logging then
            lib.logger(src, 'admin', ("**%s** ('%s') initiated the creation of a graffiti tag. Text: **'%s'**, Location: **'%s'**."):format(identifier, text, coords))
        end
    end)

    if success then return end

    error(('Error creating graffiti tag: %s'):format(result))
    sendChatMessage(src, '^1ERROR: ^0An error occurred while creating the graffiti tag.')
end)

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

lib.addCommand({ 'graffiti', 'grf' }, {
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
        return false, sendChatMessage(source, '^1ERROR: ^0You do not own a Spraycan!')
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

lib.addCommand({ 'nearbygraffitis', 'ng' }, {
    help = nil,
    params = false,
    restricted = restrictedGroup
}, function(source)
    if not hasStarted then return end

    local identifier = GetPlayerIdentifierByType(source --[[@as string]], config.identifierType)
    local coords = GetEntityCoords(GetPlayerPed(source))
    local ids = {}
    for id, data in pairs(createdGraffiti) do
        if identifier == data.creator_id and #(coords - data.coords) < 15 then
            ids[#ids + 1] = id
        end
    end

    if #ids == 0 then return sendChatMessage(source, '^1ERROR: ^0You are not near any active graffiti tags.') end

    TriggerClientEvent('fivem-graffiti:client:nearbyGraffiti', source, ids)
end)

CreateThread(function()
    Wait(2000)

    hasStarted = true
    TriggerClientEvent('fivem-graffiti:client:startedCheck', -1)
end)