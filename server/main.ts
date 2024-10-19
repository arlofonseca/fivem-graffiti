import * as Cfx from '@nativewrappers/fivem-server';
import { addCommand } from '@overextended/ox_lib/server';
import { Graffiti } from '../@types/Graffiti';
import { RestrictedZones } from '../@types/RestrictedZones';
import * as config from '../config.json';
import * as db from './db';
import { getArea, getDistance, getHex, hasItem, isAdmin, sendChatMessage } from './utils';

const graffitiTags: Record<number, Graffiti> = {};
const restrictedZones: Record<number, RestrictedZones> = {};
const spraycanDurability: Record<number, number> = {};
const playerGraffitiCooldowns: Record<number, number> = {};

const group: string = `group.${config.ace_group}`;
const restrictedGroup: string | undefined = config.admin_only ? group : undefined;

const cooldown: number = 60 * 1000;

async function createGraffitiTag(source: number, args: { text: string; font: number; size: number; hex: string }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, config.identifier_type);
  const activeGraffiti: number = await db.countGraffiti(identifier);

  if (activeGraffiti >= config.max_graffiti_tags) {
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffYou cannot have more than ${config.max_graffiti_tags} active Graffiti Tags at a time.`);
  }

  const time: number = Date.now();
  const lastCreated: number = playerGraffitiCooldowns[source] || 0;

  if (lastCreated && time - lastCreated < cooldown) {
    const timeLeft: number = Math.ceil((cooldown - (time - lastCreated)) / 1000);
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffYou need to wait ${timeLeft} seconds before creating another graffiti tag.`);
  }

  if (!hasItem(source, config.spraycan_item)) {
    sendChatMessage(source, '^#d73232ERROR ^#ffffffYou do not own a Spraycan!');
    return;
  }

  try {
    if (!spraycanDurability[source]) {
      spraycanDurability[source] = config.usage_limit;
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

    if (!getHex(hex)) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffInvalid hex code.');
    }

    const zoneCoords: { x: number; y: number; z: number; radius: number }[] = await db.getRestrictedZoneCoords();
    if (zoneCoords) {
      const area: boolean = getArea({ x: coords[0], y: coords[1], z: coords[2] }, zoneCoords);
      if (area) {
        return sendChatMessage(source, '^#d73232You cannot place graffiti in this area!');
      }
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
      displayed: true,
    };

    console.log(data)
    graffitiTags[id] = data;
    emitNet('fivem-graffiti:client:createGraffitiTag', -1, id, coords, dimension, text, font, size, hex);
    sendChatMessage(source, '^#5e81acYou have successfully created a Graffiti Tag. Use ^#ffffff/cleangraffiti ^#5e81acto remove it');
    playerGraffitiCooldowns[source] = time;
  } catch (error) {
    console.error('Error creating Graffiti Tag:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while creating the Graffiti Tag.');
  }
}

// -- @todo: play cleaning animation client side --
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
  if (!isAdmin(source, restrictedGroup)) {
    if (!hasItem(source, config.clean_item)) {
      sendChatMessage(source, '^#d73232ERROR ^#ffffffYou do not own a Rag!');
      return;
    }
  }

  if (closestGraffiti) {
    try {
      // -- @todo: stop the cleaning process if `/abortclean` is executed --
      sendChatMessage(source, '^#5e81acYou are cleaning the wall use ^#c78946/abortclean ^#5e81acto cancel the action!');
      await Cfx.Delay(100);
      const rowsChanged: unknown = await db.deleteGraffiti(closestGraffiti.id);
      if (rowsChanged && typeof rowsChanged === 'number' && rowsChanged > 0) {
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
    const graffitiCoords: number[] = JSON.parse(graffiti.coords);
    const distance: number = getDistance(coords, graffitiCoords);
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
  const identifier: string = GetPlayerIdentifierByType(source, config.identifier_type);
  const graffitiId: number = args.graffitiId;

  try {
    const data: Graffiti = graffitiTags[graffitiId];
    if (!data) {
      sendChatMessage(source, '^#d73232ERROR ^#ffffffNo Graffiti Tag found with the specified ID.');
      return;
    }

    // @ts-ignore
    if (data.creator_id !== identifier && !isAdmin(source, restrictedGroup)) {
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
  const identifier: string = GetPlayerIdentifierByType(source, config.identifier_type);
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const radius: number = args.radius;
  const includeAdmin: boolean = args.includeAdmin === 1;
  // @ts-ignore
  const bucket: number = GetPlayerRoutingBucket(source);
  const remove: Graffiti[] = [];

  for (const graffiti of Object.values(graffitiTags)) {
    if (graffiti.dimension !== bucket) continue;

    const graffitiCoords: number[] = JSON.parse(graffiti.coords);
    const distance: number = getDistance(coords, graffitiCoords);
    if (distance <= radius && (includeAdmin || graffiti.creator_id === identifier)) {
      remove.push(graffiti);
    }
  }

  if (remove.length === 0) {
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffNo graffiti found within a radius of ${radius} units in dimension ${bucket}.`);
  }

  const success: Promise<void>[] = remove.map(async (graffiti: Graffiti): Promise<void> => {
    try {
      const rowsChanged: unknown = await db.deleteGraffiti(graffiti.id);
      if (rowsChanged && typeof rowsChanged === 'number' && rowsChanged > 0) {
        delete graffitiTags[graffiti.id];
        emitNet('fivem-graffiti:client:deleteGraffitiTag', -1, graffiti.id);
      }
    } catch (error) {
      console.error(`Failed to remove graffiti tag with ID ${graffiti.id}:`, error);
    }
  });

  await Promise.all(success);

  sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed ${remove.length} graffiti(s) in the radius of ${radius} units!`);
}

async function addRestrictedZone(source: number, args: { radius: number }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, config.identifier_type);
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const coordsStr: string = JSON.stringify(coords);
  // @ts-ignore
  const dimension: number = GetPlayerRoutingBucket(source);
  const radius: number = args.radius;
  const createdDate = new Date();

  try {
    const rowsChanged: unknown = await db.saveRestrictedZone(identifier, coordsStr, dimension, radius);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to insert Restricted Zone into the database');
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to create Restricted Zone.');
    }

    const id: number | undefined = (rowsChanged as any).insertId;
    if (!id) return;

    const data: RestrictedZones = {
      id: id,
      creator_id: identifier,
      coords: coordsStr,
      dimension: dimension,
      radius: radius,
      created_date: createdDate,
    };

    console.log(data)
    restrictedZones[id] = data;
    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffSuccessfully created a restricted zone with a radius of ${radius} units!`);
  } catch (error) {
    console.error('Error creating restricted zone:', error);
    sendChatMessage(source, `^#d73232ERROR ^#ffffffAn error occurred while creating the restricted zone.`);
  }
}

async function removeRestrictedZone(source: number, args: { zoneId: number }): Promise<void> {
  const zoneId: number = args.zoneId;

  try {
    const data: RestrictedZones | null = await db.getRestrictedZoneById(zoneId);
    if (!data) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffNo restricted zone found with the specified ID.');
    }

    const rowsChanged: unknown = await db.deleteRestrictedZone(zoneId);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to delete Restricted Zone from the database');
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to delete Restricted Zone.');
    }

    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed restricted zone with ID: ${zoneId}.`);
  } catch (error) {
    console.error('Error deleting Restricted Zone:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while deleting the restricted zone.');
  }
}

async function nearbyRestrictedZones(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const nearbyZones: RestrictedZones[] = [];

  for (const id in restrictedZones) {
    const zone: RestrictedZones = restrictedZones[id];
    const zoneCoords: number[] = JSON.parse(zone.coords);
    const distance: number = getDistance(coords, zoneCoords);
    if (distance < 50) {
      nearbyZones.push(zone);
    }
  }

  if (nearbyZones.length === 0) {
    return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou are not near any restricted zones.');
  }

  sendChatMessage(source, '^#5e81ac--------- ^#ffffffNearby Restricted Zones ^#5e81ac---------');

  for (const zone of nearbyZones) {
    sendChatMessage(source, `^#ffffffZone ID: ^#5e81ac${zone.id} ^#ffffff| Location: ^#5e81ac${zone.coords} ^#ffffff| Radius: ^#5e81ac${zone.radius}`);
  }
}

onNet('fivem-graffiti:server:loadGraffitiTags', () => {
  db.loadGraffiti(source);
});

on('onResourceStart', async (resourceName: string): Promise<void> => {
  if (resourceName !== 'fivem-graffiti') return;

  await Cfx.Delay(100);

  const graffiti: Graffiti[] | undefined = await db.loadGraffiti();
  if (!graffiti) return;

  for (let i: number = 0; i < graffiti.length; i++) {
    const data: Graffiti = graffiti[i];
    graffitiTags[data.id] = data;
  }

  const zones: { creator_id: string; coords: number[]; dimension: number; radius: number }[] | undefined = await db.loadRestrictedZones();
  if (!zones) return;
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

// -- @todo: /abortclean to stop the cleaning process --

addCommand(['nearbygraffitis', 'ng'], nearbyGraffiti, {
  restricted: restrictedGroup,
});

addCommand(['removegraffiti', 'rg'], deleteGraffitiTag, {
  params: [
    {
      name: 'graffitiId',
      paramType: 'number',
      optional: false,
    },
  ],
});

addCommand(['massremovegraffiti', 'removegraffitis'], massRemoveGraffiti, {
  params: [
    {
      name: 'radius',
      paramType: 'number',
      optional: false,
    },
    {
      name: 'includeAdmin',
      paramType: 'number',
      optional: true,
    },
  ],
  restricted: restrictedGroup,
});

addCommand(['addrestrictedzone', 'arz'], addRestrictedZone, {
  params: [
    {
      name: 'radius',
      paramType: 'number',
      optional: false,
    },
  ],
  restricted: restrictedGroup,
});

addCommand(['removerestrictedzone', 'rrz'], removeRestrictedZone, {
  params: [
    {
      name: 'zoneId',
      paramType: 'number',
      optional: false,
    },
  ],
  restricted: restrictedGroup,
});

addCommand(['nearbyrestrictedzones', 'nrz'], nearbyRestrictedZones, {
  restricted: restrictedGroup,
});