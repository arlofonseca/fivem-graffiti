fx_version 'cerulean'
game 'gta5'

name 'fivem-graffiti'
author 'arlofonseca'
description '3D-Graffiti for FiveM.'
version '0.0.2'
repository 'https://github.com/arlofonseca/fivem-graffiti'
license 'MIT'

client_scripts {
	'dist/client/**/*',
}

server_scripts {
	'dist/server/**/*',
}

files {
	'config.json',
}

dependencies {
	'/server:7290',
	'/onesync',
	'oxmysql',
	'ox_lib',
}

lua54 'yes'
use_experimental_fxv2_oal 'yes'
