local db = {}

---@class GraffitiDB
---@field id number
---@field creator_id string
---@field coords string
---@field dimension number
---@field text string

---@class Graffiti : GraffitiDB
---@field coords vector3

function db.createGraffitiTable()
    local success, err = pcall(MySQL.rawExecute.await, [[
        CREATE TABLE IF NOT EXISTS graffiti (
            id INT NOT NULL AUTO_INCREMENT,
            creator_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
            coords LONGTEXT NOT NULL,
            dimension INT DEFAULT 0,
            text LONGTEXT NOT NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    if success then return end

    error(err)
end

---@return GraffitiDB[]
function db.fetchGraffitiTable()
    local success, result = pcall(MySQL.query.await, 'SELECT * FROM graffiti')
    if not success then db.createGraffitiTable() return {} end

    return result
end

---@param identifier string
---@return number
function db.countGraffiti(identifier)
    local success, result = pcall(MySQL.query.await, 'SELECT * FROM graffiti WHERE creator_id = ?', { identifier })
    if not success then error(result) return 0 end

    return result and #result or 0
end

---@param creator_id string
---@param coords string
---@param dimension number
---@param text string
---@return unknown?
function db.saveGraffiti(creator_id, coords, dimension, text)
    local success, result = pcall(MySQL.rawExecute.await, 'INSERT INTO graffiti (creator_id, coords, dimension, text) VALUES (?, ?, ?, ?)', { creator_id, coords, dimension, text })
    if not success then return error(result) end

    return result
end

---@param graffitiId number
---@return unknown?
function db.deleteGraffiti(graffitiId)
    local success, result = pcall(MySQL.rawExecute.await, 'DELETE FROM graffiti WHERE id = ?', { graffitiId })
    if not success then return error(result) end

    return result
end

---@param source number?
---@return Graffiti[]?
function db.loadGraffiti(source)
    local src = source
    local success, result = pcall(function()
        local graffiti = db.fetchGraffitiTable()
        local newGraffiti = {}
        for i = 1, #graffiti do
            local cache = graffiti[i]
            local parsedCoords = json.decode(cache.coords)
            local data = {
                id = cache.id,
                creator_id = cache.creator_id,
                coords = vec3(parsedCoords.x, parsedCoords.y, parsedCoords.z),
                dimension = cache.dimension,
                text = cache.text,
                disable = false
            }

            newGraffiti[i] = data
            TriggerClientEvent('fivem-graffiti:client:createGraffiti', src or -1, data.id, data.coords, data.dimension, data.text)
        end

        lib.print.info(('Loaded %s Graffiti from the database.'):format(#newGraffiti))
        return newGraffiti
    end)

    if not success then return error(result) end

    return result
end

return db