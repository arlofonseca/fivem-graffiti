# fivem-graffiti

A standalone 3D-Graffiti system which gives the ability to tag walls and objects.

## Features

- Supports instances and routing buckets; e.g., graffiti placed in dimension #21 won't be visible in dimension #1.
- Customizable options such as maximum graffiti distance, logging, fonts, color, and maximum number of graffiti tags per player.
- Graffiti persist across sessions and server restarts; e.g., graffiti is retained unless manually removed via command.
- Graffiti is stored in your database.
- Draws graffiti tags and retrieves local players using [nativewrappers](https://github.com/nativewrappers), rather than using common methods.
- Some fonts allow you to strikethrough a letter by using upper or lowercase.
- Spraying new graffiti will remove your old graffiti.
- Item requirements to spray/clean graffiti.
- Graffiti cannot be placed in specified areas within a set radius; e.g., high-traffic or admin-defined areas.
- Users can clean their own graffiti tags, while administrators have the ability to manage any through a menu handled via the ox_lib [interface](https://overextended.dev/ox_lib/Modules/Interface/Client/context) module or through commands.

## Installation

##### _If you download the source code via the green `Code` button, you'll need to build the resource. Information on how to do this is provided below. If you prefer not to build it, you can download latest release and drag and drop it into your server. However, any changes made to the built resource will need to be re-built to apply the changes._

### Dependencies

- [oxmysql](https://github.com/overextended/oxmysql)
- [ox_lib](https://github.com/overextended/ox_lib)

### Building this resource

1. Download and install the LTS version of Node.js.
2. Open a command-line terminal (e.g., Terminal, Command Prompt).
3. Enter `node --version` to verify the installation.
4. Run `npm install -g pnpm` to globally install the package.
5. Download or clone the repository with `git clone https://github.com/arlofonseca/fivem-graffiti`.
6. Execute the queries found in `graffiti.sql` in your database.
7. Install all dependencies with `pnpm i`.
8. Build the resource with `pnpm build`.

Use `pnpm watch` to rebuild whenever a file is modified.

## Usage

### Commands

#### `/graffiti` _(alias: `/grf`)_

- Create graffiti at any location. This command allows you to place a piece of graffiti at a specified position, enabling you to mark and decorate the world.

#### `/cleangraffiti` _(alias: `/cgrf`)_

- Clean and remove the nearest graffiti. Use this command to erase the closest piece of graffiti.

#### `/abortclean` _(alias: `/ac`)_

- Stop cleaning the current graffiti. If you change your mind while cleaning, this command will halt the process, preserving the graffiti in its current state.

#### [ADMIN] `/nearbygraffitis [radius]` _(alias: `/ng`)_

- List all active nearby graffiti. This command scans the surrounding area within a specified radius to identify all active pieces of graffiti. It provides detailed information including the unique identifier, text content, position, and the owner of each graffiti piece.

#### [ADMIN] `/removegraffiti [id]` _(alias: `/rg`)_

- Remove graffiti from the database and the world using its unique identifier. This command allows you to permanently delete a specific piece of graffiti by referencing its unique identifier, ensuring it is removed from both the game world and the database.

#### [ADMIN] `/massremovegraffiti [radius] [include admins 0/1]` _(alias: `/mrg`)_

- Mass remove graffiti from the database and the world within a specified distance. This powerful command enables the removal of multiple graffiti pieces within a certain range. If the second optional parameter is set to `1`, it will also delete graffiti created by admins.
