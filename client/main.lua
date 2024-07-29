local Graffiti = require 'client.class.graffiti'
local config = require 'config.client'
local registerEvent = require 'client.utils.registerEvent'
local sendReactMessage = require 'client.utils.sendReactMessage'

---@type table<number, Graffiti>
local createdGraffiti = {}
local points = {}
local playerBucket = 0
local hasStarted = false

---@todo

---@param id number
local function deleteGraffiti(id)
    if points[id] then
        points[id]:remove()
        points[id] = nil
    end

    createdGraffiti[id]:destroy()
    createdGraffiti[id] = nil
end

registerEvent('fivem-graffiti:client:creationPanel', function()
    SetNuiFocus(true, true)
    sendReactMessage('fivem-graffiti:nui:openFrame', true)
end)

---@param id number
---@param coords vector3
---@param bucket number
---@param description string
registerEvent('fivem-graffiti:client:createGraffiti', function(id, coords, bucket, description)
    ---@diagnostic disable-next-line: undefined-field
    local graffiti = Graffiti:new({
        id = id,
        coords = coords,
        dimension = bucket,
        text = description,
    })

    createdGraffiti[id] = graffiti

    local point = lib.points.new({
        coords = coords,
        distance = config.graffitiDistance,
        nearby = function()
            if playerBucket ~= bucket then
                graffiti.displayed = false
                return
            end

            ---@todo
        end,
        onEnter = function()
            lib.print.info(("Entered range of graffiti '%s'."):format(id))
            if playerBucket ~= bucket then return end
            graffiti.displayed = true
        end,
        onExit = function()
            lib.print.info(("Left range of graffiti '%s'."):format(id))
            graffiti.displayed = false
        end
    })

    points[id] = point
end)

---@param id number
registerEvent('fivem-graffiti:client:deleteGraffiti', function(id)
    deleteGraffiti(id)
end)

---@param ids number[]
registerEvent('fivem-graffiti:client:deleteGraffitis', function(ids)
    for i = 1, #ids do
        deleteGraffiti(ids[i])
    end
end)

---@param graffitiIds number[]
registerEvent('fivem-graffiti:client:nearbyGraffiti', function(graffitiIds)
    for i = 1, #graffitiIds do
        local id = graffitiIds[i]
        local graffiti = createdGraffiti[id]
        TriggerEvent('chat:addMessage', {
            template = '^4--------- ^0Nearby Graffitis ^4---------',
        })
        TriggerEvent('chat:addMessage', {
            template = '^2[ADMIN]: ^3Graffiti #{0} ^0{1}',
            args = { id, graffiti.text }
        })
    end
end)

registerEvent('fivem-graffiti:client:startedCheck', function()
    if GetInvokingResource() then return end

    hasStarted = true
end)

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= 'fivem-graffiti' then return end

    TriggerServerEvent('fivem-graffiti:server:loadGraffiti')
end)

AddEventHandler('onClientResourceStop', function(resourceName)
    if resourceName ~= 'fivem-graffiti' then return end

    for k in pairs(createdGraffiti) do
        deleteGraffiti(k)
    end
end)

---@param data { text: string }
---@param cb function
RegisterNuiCallback('fivem-graffiti:nui:createGraffiti', function(data, cb)
    cb(1)
    if data then
        TriggerServerEvent('fivem-graffiti:server:createGraffiti', data)
    else
        lib.print.info('No data provided for creating a Graffiti Tag.')
    end
end)

RegisterNuiCallback('fivem-graffiti:nui:hideFrame', function(_, cb)
    cb(1)
    SetNuiFocus(false, false)
    sendReactMessage('setVisible', false)
end)

CreateThread(function()
    Wait(1000)
    if hasStarted then return end

    hasStarted = lib.callback.await('fivem-graffiti:server:hasStarted', false)
end)
