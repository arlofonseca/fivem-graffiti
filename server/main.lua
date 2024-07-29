if GetCurrentResourceName() ~= 'fivem-graffiti' then
    error("Please don\'t rename this resource, change the folder name (back) to \'fivem-graffiti\'.")
    return
end

if not LoadResourceFile('fivem-graffiti', 'web/dist/index.html') then
    error("UI has not been built, refer to the 'README.md' or download a release build.\n^3https://github.com/shifu614/fivem-graffiti/releases/latest^0")
    return
end
