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
const creationCooldown: Record<number, number> = {};

const restrictedGroup: string = `group.${config.ace_group}`;
const cooldown: number = 60 * 1000;

// -- Graffiti --

async function createGraffiti(source: number, args: { text: string; font: number; size: number; hex: string }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, config.identifier_type);
  const activeGraffiti: number = await db.countGraffiti(identifier);

  if (activeGraffiti >= config.max_graffiti_tags) {
    return sendChatMessage(source, `^#d73232ERROR ^#ffffffYou cannot have more than ${config.max_graffiti_tags} active Graffiti Tags at a time.`);
  }

  const time: number = Date.now();
  const lastCreated: number = creationCooldown[source] || 0;

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

    // @ts-ignore
    if (!isAdmin(source, restrictedGroup)) {
      const zoneCoords: { x: number; y: number; z: number; radius: number }[] = await db.getRestrictedZoneCoords();
      if (zoneCoords) {
        const area: boolean = getArea({ x: coords[0], y: coords[1], z: coords[2] }, zoneCoords);
        if (area) {
          return sendChatMessage(source, '^#d73232You cannot place graffiti in this area!');
        }
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
    creationCooldown[source] = time;
  } catch (error) {
    console.error('createGraffiti:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while creating the Graffiti Tag.');
  }
}

// -- @todo: play cleaning animation client side --
async function cleanNearestGraffiti(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  // @ts-ignore
  const dimension: number = GetPlayerRoutingBucket(source);

  let cleanDistance: number = 5;
  let closestGraffiti: Graffiti | null = null;

  try {
    for (const id in graffitiTags) {
      const graffiti: Graffiti = graffitiTags[id];
      const graffitiCoords: number[] = JSON.parse(graffiti.coords);

      if (graffiti.dimension !== dimension) continue;

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
      // -- @todo: stop the cleaning process if `/abortclean` is executed --
      sendChatMessage(source, '^#5e81acYou are cleaning the wall use ^#c78946/abortclean ^#5e81acto cancel the action!');
      await Cfx.Delay(100);
      const rowsChanged: unknown = await db.deleteGraffiti(closestGraffiti.id);
      if (rowsChanged && typeof rowsChanged === 'number' && rowsChanged > 0) {
        delete graffitiTags[closestGraffiti.id];
        emitNet('fivem-graffiti:client:deleteGraffitiTag', -1, closestGraffiti.id);
        sendChatMessage(source, `^#5e81acSuccessfully cleaned the nearest graffiti tag.`);
      }
    } else {
      sendChatMessage(source, '^#d73232No graffiti to clean nearby!');
    }
  } catch (error) {
    console.error(`cleanNearestGraffiti:`, error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while trying to clean graffiti.');
  }
}

async function nearbyGraffiti(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const nearbyGraffiti: Graffiti[] = [];

  try {
    for (const id in graffitiTags) {
      const graffiti: Graffiti = graffitiTags[id];
      const graffitiCoords: number[] = JSON.parse(graffiti.coords);
      const distance: number = getDistance(coords, graffitiCoords);
      if (distance < 50) {
        nearbyGraffiti.push(graffiti);
      }
    }

    if (nearbyGraffiti.length === 0) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffYou are not near any active graffiti tags.');
    }

    sendChatMessage(source, '^#5e81ac--------- ^#ffffffNearby Graffiti ^#5e81ac---------');

    for (const graffiti of nearbyGraffiti) {
      sendChatMessage(source, `^#ffffffGraffiti ID: ^#5e81ac${graffiti.id} ^#ffffff| Location: ^#5e81ac${graffiti.coords} ^#5e81ac| Dimension: ^#5e81ac${graffiti.dimension} ^#5e81ac| Text: ^#5e81ac${graffiti.text} ^#5e81ac| Font: ^#5e81ac${graffiti.font} ^#5e81ac| Size: ^#5e81ac${graffiti.size} ^#5e81ac| Hex: ^#5e81ac${graffiti.hex}`);
    }
  } catch (error) {
    console.error(`nearbyGraffiti:`, error);
    sendChatMessage(source, `^#d73232ERROR ^#ffffffAn error occurred while fetching nearby graffiti.`);
  }
}

async function deleteGraffiti(source: number, args: { graffitiId: number }): Promise<void> {
  const graffitiId: number = args.graffitiId;

  try {
    const graffiti: Graffiti = graffitiTags[graffitiId];
    if (!graffiti) {
      sendChatMessage(source, '^#d73232ERROR ^#ffffffNo Graffiti Tag found with the specified ID.');
      return;
    }

    const rowsChanged: unknown = await db.deleteGraffiti(graffitiId);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to delete Graffiti Tag from the database');
      sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to delete Graffiti Tag.');
      return;
    }

    delete graffitiTags[graffitiId];
    emitNet('fivem-graffiti:client:deleteGraffitiTag', source, graffitiId);
    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed the graffiti (#${graffitiId}): ${graffiti.text}.`);
  } catch (error) {
    console.error('deleteGraffiti:', error);
    sendChatMessage(source, `^#d73232ERROR ^#ffffffAn error occurred while deleting graffiti.`);
  }
}

async function massRemoveGraffiti(source: number, args: { radius: number; includeAdmin: number }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, config.identifier_type);
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  // @ts-ignore
  const dimension: number = GetPlayerRoutingBucket(source);
  const radius: number = args.radius;
  const includeAdmin: boolean = args.includeAdmin === 1;
  const remove: Graffiti[] = [];

  try {
    for (const graffiti of Object.values(graffitiTags)) {
      const graffitiCoords: number[] = JSON.parse(graffiti.coords);
      const distance: number = getDistance(coords, graffitiCoords);
      if (graffiti.dimension === dimension && distance <= radius && (includeAdmin || graffiti.creator_id === identifier)) {
        remove.push(graffiti);
      }
    }

    if (remove.length === 0) {
      return sendChatMessage(source, `^#d73232ERROR ^#ffffffNo graffiti found within a radius of ${radius} units in dimension ${dimension}.`);
    }

    const success: Promise<void>[] = remove.map(async (graffiti: Graffiti): Promise<void> => {
      const rowsChanged: unknown = await db.deleteGraffiti(graffiti.id);
      if (rowsChanged && typeof rowsChanged === 'number' && rowsChanged > 0) {
        delete graffitiTags[graffiti.id];
        emitNet('fivem-graffiti:client:deleteGraffitiTag', -1, graffiti.id);
      }
    });

    await Promise.all(success);

    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed ${remove.length} graffiti(s) in the radius of ${radius} units!`);
  } catch (error) {
    console.error(`massRemoveGraffiti:`, error);
    sendChatMessage(source, `^#d73232ERROR ^#ffffffAn error occurred while trying to mass remove graffiti.`);
  }
}

// -- Zones --

async function createRestrictedZone(source: number, args: { radius: number }): Promise<void> {
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
    console.error('createRestrictedZone:', error);
    sendChatMessage(source, `^#d73232ERROR ^#ffffffAn error occurred while creating the restricted zone.`);
  }
}

async function deleteRestrictedZone(source: number, args: { zoneId: number }): Promise<void> {
  const zoneId: number = args.zoneId;

  try {
    const zone: RestrictedZones | null = await db.getRestrictedZoneById(zoneId);
    if (!zone) {
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffNo restricted zone found with the specified ID.');
    }

    const rowsChanged: unknown = await db.deleteRestrictedZone(zoneId);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to delete Restricted Zone from the database');
      return sendChatMessage(source, '^#d73232ERROR ^#ffffffFailed to delete Restricted Zone.');
    }

    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou removed restricted zone with ID: ${zoneId}.`);
  } catch (error) {
    console.error('deleteRestrictedZone:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while deleting the restricted zone.');
  }
}

async function nearbyRestrictedZones(source: number): Promise<void> {
  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const nearbyZones: RestrictedZones[] = [];

  try {
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
      sendChatMessage(source, `^#ffffffZone ID: ^#5e81ac${zone.id} ^#ffffff| Location: ^#5e81ac${zone.coords} ^#ffffff| Radius: ^#5e81ac${zone.radius} ^#ffffff| Dimension: ^#5e81ac${zone.dimension}`);
    }
  } catch (error) {
    console.error(`nearbyRestrictedZones:`, error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while fetching nearby restricted zones.');
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

addCommand(['graffiti', 'grf'], createGraffiti, {
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

addCommand(['removegraffiti', 'rg'], deleteGraffiti, {
  params: [
    {
      name: 'graffitiId',
      paramType: 'number',
      optional: false,
    },
  ],
  restricted: restrictedGroup,
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

addCommand(['graffitiinfo'], async (source: number, args: { graffitiId: number }): Promise<void> => {
  const graffitiId: number = args.graffitiId;

  try {
    const graffiti: Graffiti = graffitiTags[graffitiId];
    if (!graffiti) {
      sendChatMessage(source, '^#d73232ERROR ^#ffffffNo Graffiti Tag found with the specified ID.');
      return;
    }

    sendChatMessage(source, '^#5e81ac--------- ^#ffffffGraffiti Info ^#5e81ac---------')
    sendChatMessage(source, `^#5e81acCreator: ^#ffffffSpawned by: ${graffiti.creator_id}`)
    sendChatMessage(source, `^#5e81acCreated date: ^#ffffff${graffiti.created_date}`)
  } catch (error) {
    console.error('/graffitiinfo:', error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while fetching graffiti information.');
  }
}, {
  params: [
    {
      name: 'graffitiId',
      paramType: 'number',
      optional: false,
    },
  ],
  restricted: restrictedGroup,
});

addCommand(['addrestrictedzone', 'arz'], createRestrictedZone, {
  params: [
    {
      name: 'radius',
      paramType: 'number',
      optional: false,
    },
  ],
  restricted: restrictedGroup,
});

addCommand(['removerestrictedzone', 'rrz'], deleteRestrictedZone, {
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

addCommand(['agotograffiti'], async (source: number, args: { graffitiId: number }): Promise<void> => {
  // @ts-ignore
  const dimension: number = GetPlayerRoutingBucket(source);
  const graffitiId: number = args.graffitiId;

  try {
    const graffiti = graffitiTags[graffitiId];
    if (!graffiti) {
      sendChatMessage(source, `^#d73232ERROR ^#ffffffGraffiti with ID ${graffitiId} couldn't be found.`);
      return;
    }

    const graffitiDimension: number = graffiti.dimension;
    if (dimension !== graffitiDimension) {
      // @ts-ignore
      SetPlayerRoutingBucket(source, graffitiDimension);
      // @ts-ignore
      SetEntityCoords(GetPlayerPed(source), graffiti.coords, false, false, false, false);
      sendChatMessage(source, `^#5e81acYou have successfully teleported to graffiti ID ${graffitiId} in dimension ${graffitiDimension}`);
    } else {
      sendChatMessage(source, `^#f39c12You are already in dimension ${graffitiDimension}.`);
    }
  } catch (error) {
    console.error(`/agotograffiti:`, error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while teleporting to graffiti.');
  }
}, {
  params: [
    {
      name: 'graffitiId',
      paramType: 'number',
      optional: false,
    },
  ],
  restricted: restrictedGroup,
});

// Unfortunately need this fallback to handle cases where users 
// don't have a mechanism to reset their dimension properly lol
addCommand(['aresetbucket'], async (source: number): Promise<void> => {
  // @ts-ignore
  const dimension: number = GetPlayerRoutingBucket(source);
  const defaultDimension: number = 0;

  try {
    if (dimension === defaultDimension) {
      sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou are already in the default dimension ^#5e81ac${defaultDimension}^#ffffff.`);
      return;
    }

    // @ts-ignore
    SetPlayerRoutingBucket(source, defaultDimension);
    sendChatMessage(source, `^#5e81ac[ADMIN] ^#ffffffYou have left dimension ^#5e81ac${dimension} ^#ffffffand entered dimension ^#5e81ac${defaultDimension}^#ffffff.`);
  } catch (error) {
    console.error(`/aresetbucket:`, error);
    sendChatMessage(source, '^#d73232ERROR ^#ffffffAn error occurred while trying to reset your dimension.');
  }
}, {
  restricted: restrictedGroup,
});
