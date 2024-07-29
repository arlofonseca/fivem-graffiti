# fivem-graffiti

A standalone graffiti creation script.

## Features

###### todo

## Development

The upcoming steps will necessitate a certain level of understanding but offer access to the most recent and innovative features.

*It's important to note there is always a chance of changes being pushed that could potentially break functionality; in such cases, please refer to the latest release build.*

### Dependencies

- [Git](https://git-scm.com/)
- [Node](https://nodejs.org/en/) (LTS)
- [pnpm](https://pnpm.io)

### Setup

Clone the repository into your resources folder:

```
git clone https://github.com/shifu614/fivem-graffiti.git
```

Navigate to the `fivem-graffiti/web` directory and install the dependencies for the NUI:

```
cd web
```

```
pnpm i
```

### Editing NUI

Start development in a browser:

```
pnpm dev
```

### Building NUI

To build the NUI, execute the following command within the `fivem-graffiti/web` directory:

```
pnpm build
```

### Watching Files

If you prefer not to rebuild continuously, you can enable file watching, which will automatically write to the disk:

```
pnpm watch
```

## Installation

###### If you want to build this project yourself, you can refer to the [development](https://github.com/shifu614/fivem-graffiti?tab=readme-ov-file#development) section. If you don't want to build it, you can download the release and drag and drop it in your server, but any changes made to the built resource will need to be re-built to add the changes in.

This resource requires the following to function correctly:

### Dependencies

- [oxmysql](https://github.com/overextended/oxmysql)
- [ox_lib](https://github.com/overextended/ox_lib)

### Setup

1. Download the latest release build [from here](https://github.com/shifu614/fivem-graffiti/releases/latest).
2. Unpack the contents of the downloaded folder.
3. Place the `fivem-graffiti` folder into the directory where your resources are located.
4. Execute the queries found in `graffiti.sql` in your database.
5. Add `start fivem-graffiti` to the location where your resources are initialized.
6. Be sure to adjust the files found in the `config` directory to fit your needs.

## Usage

### Commands

#### `/graffiti` _(alias: `/grf`)_

- Create graffiti at any location. This command allows you to place a piece of graffiti at a specified position, enabling you to mark and decorate the world.

#### `/cleangraffiti` _(alias: `/cg`)_

- Clean and remove the nearest graffiti. Use this command to erase the closest piece of graffiti.

#### `/abortclean` _(alias: `/ac`)_

- Stop cleaning the current graffiti. If you change your mind while cleaning, this command will halt the process, preserving the graffiti in its current state.

#### [ADMIN] `/nearbygraffitis [radius]` _(alias: `/ng`)_

- List all active nearby graffiti. This command scans the surrounding area within a specified radius to identify all active pieces of graffiti. It provides detailed information including the unique identifier, text content, position, and the owner of each graffiti piece.

#### [ADMIN] `/removegraffiti [id]` _(alias: `/rg`)_

- Remove graffiti from the database and the world using its unique identifier. This command allows you to permanently delete a specific piece of graffiti by referencing its unique identifier, ensuring it is removed from both the game world and the database.

#### [ADMIN] `/massremovegraffiti [radius] [include admins 0/1]` _(alias: `/mrg`)_

- Mass remove graffiti from the database and the world within a specified distance. This powerful command enables the removal of multiple graffiti pieces within a certain range. If the second optional parameter is set to `1`, it will also delete graffiti created by admins.
