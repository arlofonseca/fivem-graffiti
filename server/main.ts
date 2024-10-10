import * as Cfx from '@nativewrappers/fivem-server';
import { addCommand } from '@overextended/ox_lib/server';
import { Graffiti } from '../@types/Graffiti';
import * as config from '../config.json';
import * as db from './db';
import { getArea, getDistance, isAdmin, sendChatMessage, } from './utils';

const graffitiTags: Record<number, Graffiti> = {};
const spraycanDurability: Record<number, number> = {};

const group: string = `group.${config.ace_group}`;
const restrictedGroup: string | undefined = config.admin_only ? group : undefined;

async function createGraffitiTag(source: number, args: { text: string; font: number; size: number; hex: string }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  const activeGraffiti: number = await db.countGraffiti(identifier);

  if (activeGraffiti >= config.max_graffiti_tags) {
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffYou cannot have more than ${config.max_graffiti_tags} active Graffiti Tags at a time.`);
  }

  const spraycan: number = exports.ox_inventory.GetItemCount(source, config.spraycan_item);
  if (spraycan <= 0) {
    return sendChatMessage(source, '^#d73232You do not own a Spraycan!');
  }

  try {
    if (!spraycanDurability[source]) {
      spraycanDurability[source] = config.usage_limit;
    }

    if (spraycanDurability[source] <= 0) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou have no more spray left inside of your spray can.');
    }

    spraycanDurability[source]--;

    if (spraycanDurability[source] === 0) {
      if (!exports.ox_inventory.RemoveItem(source, config.spraycan_item, 1)) {
        return sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to remove spray can from inventory.');
      }
    }

    // @ts-ignore
    const text = `${args.text} ${args.filter((item: any): boolean => item !== null).join(' ')}`;
    // @ts-ignore
    const coords: number[] = GetEntityCoords(GetPlayerPed(source));
    const coordsStr: string = JSON.stringify(coords);
    // @ts-ignore
    const dimension: number = GetPlayerRoutingBucket(source);
    const font: number = args.font;
    const size: number = args.size;
    const hex: string = `#${(args.hex || '').replace('#', '')}`;
    const createdDate = new Date();

    if (getArea({ x: coords[0], y: coords[1], z: coords[2] }, config.restricted_areas)) {
      return sendChatMessage(source, '^#d73232You cannot place graffiti in this area!');
    }

    const rowsChanged: unknown = await db.saveGraffiti(identifier, coordsStr, dimension, text, font, size, hex);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to insert Graffiti Tag into the database');
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to create Graffiti Tag.');
    }

    const id: number | undefined = (rowsChanged as any).insertId;
    if (!id) return;

    const data: Graffiti = {
      id: id,
      creator_id: identifier,
      coords: coordsStr,
      dimension: dimension,
      text: text,
      font: font,
      size: size,
      hex: hex,
      created_date: createdDate,
      displayed: true
    };

    graffitiTags[id] = data;
    emitNet('fivem-graffiti:client:createGraffitiTag', -1, id, coords, dimension, text, font, size, hex);
    sendChatMessage(source, '^#5e81acYou have successfully created a Graffiti Tag. Use ^#ffffff/cleangraffiti ^#5e81acto remove it');
  } catch (error) {
    console.error('Error creating Graffiti Tag:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while creating the Graffiti Tag.');
  }
}

// @todo: play cleaning animation client side
async function cleanNearestGraffiti(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  // @ts-ignore
  const bucket: number = GetPlayerRoutingBucket(source);

  let cleanDistance: number = 5;
  let closestGraffiti: Graffiti | null = null;

  for (const id in graffitiTags) {
    const graffiti: Graffiti = graffitiTags[id];
    const graffitiCoords: number[] = JSON.parse(graffiti.coords);

    if (graffiti.dimension !== bucket) continue;

    const distance: number = getDistance(coords, graffitiCoords);
    if (distance < cleanDistance) {
      cleanDistance = distance;
      closestGraffiti = graffiti;
    }
  }

  // @ts-ignore
  if (!isAdmin(source, group)) {
    const rag: number = exports.ox_inventory.GetItemCount(source, config.clean_item);
    if (rag <= 0) {
      return sendChatMessage(source, '^#d73232You do not own a Rag!');
    }
  }

  if (closestGraffiti) {
    try {
      // @todo: stop the cleaning process if `/abortclean` is executed
      sendChatMessage(source, '^#5e81acYou are cleaning the wall use ^#c78946/abortclean ^#5e81acto cancel the action!');
      await Cfx.Delay(100)
      const rowsChanged: unknown = await db.deleteGraffiti(closestGraffiti.id);
      if (rowsChanged && (typeof rowsChanged === 'number' && rowsChanged > 0)) {
        delete graffitiTags[closestGraffiti.id];
        emitNet('fivem-graffiti:client:deleteGraffitiTag', -1, closestGraffiti.id);
        sendChatMessage(source, `^#5e81acSuccessfully cleaned the nearest graffiti tag.`);
      }
    } catch (error) {
      console.error(`Failed to remove graffiti tag with ID ${closestGraffiti.id}:`, error);
      sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while removing the graffiti tag.');
    }
  } else {
    sendChatMessage(source, '^#d73232No graffiti to clean nearby!');
  }
}

async function nearbyGraffiti(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const nearbyGraffiti: number[] = [];

  for (const id in graffitiTags) {
    const graffiti: Graffiti = graffitiTags[id];
    const graffitiCoords = JSON.parse(graffiti.coords);
    const distance: number = Math.sqrt(Math.pow(graffitiCoords[0] - coords[0], 2) + Math.pow(graffitiCoords[1] - coords[1], 2) + Math.pow(graffitiCoords[2] - coords[2], 2));
    if (distance < 50) {
      nearbyGraffiti.push(graffiti.id);
    }
  }

  if (nearbyGraffiti.length === 0) {
    return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou are not near any active graffiti tags.');
  }

  sendChatMessage(source, '^#5e81ac--------- ^#ffffffNearby Graffiti ^#5e81ac---------');

  for (const id of nearbyGraffiti) {
    const data: Graffiti = graffitiTags[id];
    sendChatMessage(source, `^#ffffffGraffiti ID: ^#5e81ac${data.id} ^#ffffff| Created by: ^#5e81ac${data.creator_id} ^#ffffff| Location: ^#5e81ac${data.coords} ^#ffffff| Dimension: ^#5e81ac${data.dimension} ^#ffffff| Text: ^#5e81ac${data.text} ^#ffffff| Font: ^#5e81ac${data.font} ^#ffffff| Size: ^#5e81ac${data.size} ^#ffffff| Hex: ^#5e81ac${data.hex}`);
  }
}

async function deleteGraffitiTag(source: number, args: { graffitiId: number }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  const graffitiId: number = args.graffitiId;

  try {
    const data: Graffiti = graffitiTags[graffitiId];
    if (!data) {
      sendChatMessage(source, '^#d73232ERROR ^#ffffffNo Graffiti Tag found with the specified ID.');
      return;
    }

    // @ts-ignore
    if (data.creator_id !== identifier && !isAdmin(source, group)) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou cannot delete a Graffiti Tag that you did not create.');
    }

    const rowsChanged: unknown = await db.deleteGraffiti(graffitiId);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to delete Graffiti Tag from the database');
      sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to delete Graffiti Tag.');
      return;
    }

    delete graffitiTags[graffitiId];
    emitNet('fivem-graffiti:client:deleteGraffitiTag', source, graffitiId);
    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed the graffiti (#${graffitiId}): ${data.text}.`);
  } catch (error) {
    console.error('Error deleting Graffiti Tag:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while deleting the Graffiti Tag.');
  }
}

async function massRemoveGraffiti(source: number, args: { radius: number; includeAdmin: number }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const radius: number = args.radius;
  const includeAdmin: boolean = args.includeAdmin === 1;
  // @ts-ignore
  const bucket: number = GetPlayerRoutingBucket(source);
  const remove: Graffiti[] = [];

  for (const id in graffitiTags) {
    const data: Graffiti = graffitiTags[id];
    const graffitiCoords: number[] = JSON.parse(data.coords);

    if (data.dimension !== bucket) continue;

    const distance: number = getDistance(coords, graffitiCoords);
    if (distance <= radius && (includeAdmin || data.creator_id === identifier)) {
      remove.push(data);
    }
  }

  if (remove.length === 0) {
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffNo graffiti found within a radius of ${radius} units in dimension ${bucket}.`);
  }

  for (const graffiti of remove) {
    try {
      const rowsChanged: unknown = await db.deleteGraffiti(graffiti.id);
      if (rowsChanged && (typeof rowsChanged === 'number' && rowsChanged > 0)) {
        delete graffitiTags[graffiti.id];
        emitNet('fivem-graffiti:client:deleteGraffitiTag', -1, graffiti.id);
      }
    } catch (error) {
      console.error(`Failed to remove graffiti tag with ID ${graffiti.id}:`, error);
    }
  }

  sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed ${remove.length} graffiti(s) in the radius of ${radius} units!`);
}

onNet('fivem-graffiti:server:loadGraffitiTags', () => {
  db.loadGraffiti(source);
});

db.createGraffitiTable();

on('onResourceStart', async (resourceName: string): Promise<void> => {
  if (resourceName !== 'fivem-graffiti') return;

  await Cfx.Delay(100);

  const graffiti: Graffiti[] | undefined = await db.loadGraffiti();
  if (!graffiti) return;

  for (let i: number = 0; i < graffiti.length; i++) {
    const data: Graffiti = graffiti[i];
    graffitiTags[data.id] = data;
  }
});

addCommand(['graffiti', 'grf'], createGraffitiTag, {
  params: [
    {
      name: 'text',
      paramType: 'string',
      optional: false,
    },
    {
      name: 'font',
      paramType: 'number',
      optional: false,
    },
    {
      name: 'size',
      paramType: 'number',
      optional: false,
    },
    {
      name: 'hex',
      paramType: 'string',
      optional: false,
    },
  ],
});

addCommand(['cleangraffiti', 'cgrf'], cleanNearestGraffiti, {
  restricted: false,
});

// @todo: /abortclean to stop the cleaning process

addCommand(['nearbygraffitis', 'ng'], nearbyGraffiti, {
  restricted: restrictedGroup,
});

addCommand(['removegraffiti', 'rg'], deleteGraffitiTag, {
  params: [
    {
      name: 'graffitiId',
      help: 'The id of the graffiti tag to clean',
      paramType: 'number',
      optional: false,
    },
  ],
});

addCommand(['massremovegraffiti', 'removegraffitis'], massRemoveGraffiti, {
  params: [
    {
      name: 'radius',
      help: 'The radius within which to remove graffiti',
      paramType: 'number',
      optional: false,
    },
    {
      name: 'includeAdmin',
      help: 'Set to 1 to include graffiti created by admins',
      paramType: 'number',
      optional: true,
    },
  ],
  restricted: restrictedGroup,
});