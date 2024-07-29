fx_version 'cerulean'
game 'gta5'

name 'fivem-graffiti'
author 'shifu614'
description '3D-Graffiti for FiveM.'
version '0.0.1'
repository 'https://github.com/shifu614/fivem-graffiti'
license 'GPL v3'

shared_script '@ox_lib/init.lua'

client_script 'client/main.lua'

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua',
}

ui_page 'web/dist/index.html'

files {
    'client/class/*.lua',
    'client/utils/*.lua',
    'config/client.lua',
    'web/dist/index.html',
    'web/dist/assets/*.js',
    'web/dist/assets/*.css',
}

dependencies {
    '/server:7290',
    '/onesync',
    'oxmysql',
    'ox_lib',
}

lua54 'yes'
use_experimental_fxv2_oal 'yes'
