---@class Graffiti : OxClass
---@field disable boolean
---@field id number
---@field coords vector3
---@field dimension number
---@field text string
---@field generateGraffiti fun(self)
---@field destroy fun(self)

---@class Graffiti
local Graffiti = lib.class('Graffiti')

---@param data { id: number, coords: vector3, dimension: number, text: string}
---@diagnostic disable-next-line: invisible
function Graffiti:constructor(data)
    self.disable = false
    self.id = data.id
    self.coords = data.coords
    self.dimension = data.dimension
    self.text = data.text
    self.displayed = false

    ---@param resource string
    AddEventHandler('onResourceStop', function(resource)
        if resource == cache.resource then
            self:destroy()
        end
    end)
end

function Graffiti:generateGraffitiRaycast()
    if self.disable then return end

    ---@todo
end

function Graffiti:destroy()
    self.disable = true
end

return Graffiti
