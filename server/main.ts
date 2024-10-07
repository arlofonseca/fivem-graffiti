import * as Cfx from '@nativewrappers/fivem-server';
import { addCommand, onClientCallback } from '@overextended/ox_lib/server';
import * as config from '../config.json';
import * as db from './db';
import { getDistance, getHex, isAdmin, sendChatMessage, } from './utils';

export interface GraffitiTag {
  id: number;
  creator_id: string;
  coords: string;
  dimension: number;
  text: string;
  font: number;
  size: number;
  hex: string;
  created_date: Date;
}

const graffitiTags: Record<number, GraffitiTag> = {};
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

  const spraycan: number = exports.ox_inventory.GetItemCount(source, 'spraycan');
  if (spraycan <= 0) {
    return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou need a spray can to create graffiti.');
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
      if (!exports.ox_inventory.RemoveItem(source, 'spraycan', 1)) {
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
    const font: number = parseInt(args.font.toString(), 10);
    const size: number = parseInt(args.size.toString(), 10);
    const hex: string = await getHex(source, args.hex);
    const createdDate = new Date();

    const rowsChanged: unknown = await db.saveGraffiti(identifier, coordsStr, dimension, text, font, size, hex);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to insert Graffiti Tag into the database');
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to create Graffiti Tag.');
    }

    const id: number | undefined = (rowsChanged as any).insertId;
    if (!id) return;

    const graffiti: GraffitiTag = {
      id: id,
      creator_id: identifier,
      coords: coordsStr,
      dimension: dimension,
      text: text,
      font: font,
      size: size,
      hex: hex,
      created_date: createdDate,
    };

    graffitiTags[id] = graffiti;
    emitNet('fivem-graffiti:client:createGraffitiTag', -1, id, coords, dimension, text, font, size, hex);
    sendChatMessage(source, '^#5e81acYou have successfully created a Graffiti Tag. Use ^#ffffff/cleangraffiti ^#5e81acto remove it');
  } catch (error) {
    console.error('Error creating Graffiti Tag:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while creating the Graffiti Tag.');
  }
}

// @todo: play cleaning animation client side
async function cleanNearestGraffiti(source: number): Promise<void> {
  let cleanDistance: number = 5;
  let closestGraffiti: GraffitiTag | null = null;

  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  // @ts-ignore
  const bucket: number = GetPlayerRoutingBucket(source);

  for (const id in graffitiTags) {
    const graffiti: GraffitiTag = graffitiTags[id];
    const graffitiCoords: number[] = JSON.parse(graffiti.coords);

    if (graffiti.dimension !== bucket) continue;

    const distance: number = getDistance(coords, graffitiCoords);
    if (distance < cleanDistance) {
      cleanDistance = distance;
      closestGraffiti = graffiti;
    }
  }

  if (closestGraffiti) {
    try {
      const rowsChanged: unknown = await db.deleteGraffiti(closestGraffiti.id);
      if (rowsChanged && (typeof rowsChanged === 'number' && rowsChanged > 0)) {
        delete graffitiTags[closestGraffiti.id];
        emitNet('fivem-graffiti:client:deleteGraffitiTag', -1, closestGraffiti.id);
        sendChatMessage(source, `^#5e81acSuccessfully removed the nearest graffiti tag.`);
      }
    } catch (error) {
      console.error(`Failed to remove graffiti tag with ID ${closestGraffiti.id}:`, error);
      sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while removing the graffiti tag.');
    }
  } else {
    sendChatMessage(source, '^#d73232ERROR ^#ffffffNo graffiti found nearby in your current dimension.');
  }
}

async function nearbyGraffiti(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const nearbyGraffitiIds: number[] = [];

  for (const id in graffitiTags) {
    const graffiti: GraffitiTag = graffitiTags[id];

    const graffitiCoords = JSON.parse(graffiti.coords);
    const distance: number = Math.sqrt(
      Math.pow(graffitiCoords[0] - coords[0], 2) +
      Math.pow(graffitiCoords[1] - coords[1], 2) +
      Math.pow(graffitiCoords[2] - coords[2], 2)
    );

    if (distance < 50) {
      nearbyGraffitiIds.push(graffiti.id);
    }
  }

  if (nearbyGraffitiIds.length === 0) {
    return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou are not near any active graffiti tags.');
  }

  sendChatMessage(source, '^#5e81ac--------- ^#ffffffNearby Graffiti ^#5e81ac---------');

  for (const id of nearbyGraffitiIds) {
    const marker: GraffitiTag = graffitiTags[id];
    const message = (`[${marker.created_date}] Graffiti #${marker.id}: Created by: ${marker.creator_id} | Location: ${marker.coords} | Dimension: ${marker.dimension} | Text: ${marker.text} | Font: ${marker.font} | Size: ${marker.size} | Hex: ${marker.hex}`);
    sendChatMessage(source, message);
  }
}

async function deleteGraffitiTag(source: number, args: { graffitiId: number }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  const graffitiId: number = args.graffitiId;

  try {
    const data: GraffitiTag = graffitiTags[graffitiId];
    if (!data) {
      sendChatMessage(source, '^#d73232ERROR ^#ffffffNo Graffiti Tag found with the specified ID.');
      return;
    }

    // @ts-ignore
    if (data.creator_id !== identifier && !isAdmin(source, group)) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou cannot delete a Graffiti Tag that you did not create.');
    }

    // @ts-ignore
    if (!isAdmin(source, group)) {
      const rag: number = exports.ox_inventory.GetItemCount(source, 'rag');
      if (rag <= 0) {
        return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou need a rag to clean graffiti.');
      }
    }

    const rowsChanged: unknown = await db.deleteGraffiti(graffitiId);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to delete Graffiti Tag from the database');
      sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to delete Graffiti Tag.');
      return;
    }

    delete graffitiTags[graffitiId];
    emitNet('fivem-graffiti:client:deleteGraffitiTag', source, graffitiId);
    sendChatMessage(source, '^#5e81acGraffiti Tag was successfully deleted.');
  } catch (error) {
    console.error('Error deleting Graffiti Tag:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while deleting the Graffiti Tag.');
  }
}

async function massRemoveGraffiti(source: number, args: { radius: number; includeAdmin: number }): Promise<void> {
  const radius: number = args.radius;
  const includeAdmin: boolean = args.includeAdmin === 1;

  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  // @ts-ignore
  const bucket: number = GetPlayerRoutingBucket(source);
  const remove: GraffitiTag[] = [];

  for (const id in graffitiTags) {
    const graffiti: GraffitiTag = graffitiTags[id];
    const graffitiCoords: number[] = JSON.parse(graffiti.coords);

    if (graffiti.dimension !== bucket) continue;

    const distance: number = getDistance(coords, graffitiCoords);
    if (distance <= radius && (includeAdmin || graffiti.creator_id === identifier)) {
      remove.push(graffiti);
    }
  }

  if (remove.length === 0) {
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffNo graffiti found within a radius of ${radius} units and in dimension ${bucket}.`);
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

  sendChatMessage(source, `^#5e81acSuccessfully removed ^#ffffff${remove.length} graffiti tags within ^#ffffff${radius} units and in your current dimension ${bucket}`);
}

onClientCallback('fivem-graffiti:server:getRoutingBucket', (source: number): number => {
  // @ts-ignore
  return GetPlayerRoutingBucket(source);
});

onNet('fivem-graffiti:server:loadGraffitiTags', () => {
  db.loadGraffiti(source);
});

db.createGraffitiTable();

on('onResourceStart', async (resourceName: string): Promise<void> => {
  if (resourceName !== 'fivem-graffiti') return;

  await Cfx.Delay(100);

  const graffiti: GraffitiTag[] | undefined = await db.loadGraffiti();
  if (!graffiti) return;

  for (let i: number = 0; i < graffiti.length; i++) {
    const data: GraffitiTag = graffiti[i];
    graffitiTags[data.id] = data;
  }
});

addCommand(['graffiti', 'grf'], createGraffitiTag, {
  params: [
    {
      name: 'text',
      help: 'text',
      paramType: 'string',
      optional: false,
    },
    {
      name: 'font',
      help: 'font',
      paramType: 'number',
      optional: false,
    },
    {
      name: 'size',
      help: 'size',
      paramType: 'number',
      optional: false,
    },
    {
      name: 'hex',
      help: 'hex',
      paramType: 'string',
      optional: false,
    },
  ],
});

addCommand(['cleangraffiti', 'cgrf'], cleanNearestGraffiti, {
  params: [],
  restricted: false,
});

addCommand(['nearbygraffitis', 'ng'], nearbyGraffiti, {
  params: [],
  restricted: restrictedGroup,
});

addCommand(['removegraffiti', 'rg'], deleteGraffitiTag, {
  params: [
    {
      name: 'graffitiId',
      help: 'The id of the graffiti tag to clean',
      paramType: 'number',
    },
  ],
});

addCommand(['massremovegraffiti', 'mrg'], massRemoveGraffiti, {
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