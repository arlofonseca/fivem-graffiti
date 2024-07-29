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

RegisterCommand('testgraffiti', function(data)
    SetNuiFocus(true, true)
    sendReactMessage('setVisible', true)
    SendNUIMessage({ action = 'setVisible', data = data })
end, false)

RegisterNuiCallback('fivem-graffiti:nui:hideFrame', function(_, cb)
    cb(1)
    SetNuiFocus(false, false)
    sendReactMessage('setVisible', false)
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

CreateThread(function()
    Wait(1000)
    if hasStarted then return end

    hasStarted = lib.callback.await('fivem-graffiti:server:hasStarted', false)
end)
