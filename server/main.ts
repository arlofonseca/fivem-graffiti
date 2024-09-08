import * as Cfx from '@nativewrappers/fivem-server';
import { addCommand, onClientCallback } from '@overextended/ox_lib/server';
import * as config from '../config.json';
import * as db from './db';

export interface GraffitiTag {
  id: number;
  creator_id: string;
  coords: string;
  dimension: number;
  text: string;
}

const graffitiTags: Record<number, GraffitiTag> = {};

const group: string = `group.${config.ace_group}`;
const restrictedGroup: string | undefined = config.admin_only ? group : undefined;

function sendChatMessage(source: number, template: string, args?: any[]): void {
  emitNet('chat:addMessage', source, { template, args });
}

function isAdmin(source: string): boolean {
  return IsPlayerAceAllowed(source, group);
}

async function createGraffitiTag(source: number, args: { days: number; text: string }): Promise<void> {
  // @ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  const activeGraffiti: number = await db.countGraffiti(identifier);

  if (activeGraffiti >= config.max_graffiti_tags) {
    return sendChatMessage(source, '^1 ERROR: ^0 You cannot have more than {0} active Graffiti Tags at a time.', [
      config.max_graffiti_tags,
    ]);
  }

  //@ts-ignore
  const text = `${args.text} ${args.filter((item: any): boolean => item !== null).join(' ')}`;

  // @ts-ignore
  const coords: number[] = GetEntityCoords(GetPlayerPed(source));
  const coordsStr: string = JSON.stringify(coords);
  // @ts-ignore
  const bucket: number = GetPlayerRoutingBucket(source);

  try {
    const rowsChanged: unknown = await db.saveGraffiti(identifier, coordsStr, bucket, text);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to insert Graffiti Tag into the database');
      return sendChatMessage(source, '^1 ERROR: ^0 Failed to create Graffiti Tag.');
    }

    const id: number | undefined = (rowsChanged as any).insertId;
    if (!id) return;

    const graffiti: GraffitiTag = {
      id: id,
      creator_id: identifier,
      coords: coordsStr,
      dimension: bucket,
      text: text,
    };

    graffitiTags[id] = graffiti;
    emitNet('fivem-graffiti:client:createGraffitiTag', -1, id, coords, bucket, text);
    sendChatMessage(source, '^4 You have successfully created a Graffiti Tag. Use ^0 /cleangraffiti ^4 to remove it.');
  } catch (error) {
    console.error('Error creating Graffiti Tag:', error);
    sendChatMessage(source, '^1 ERROR: ^0 An error occurred while creating the Graffiti Tag.');
  }
}

async function deleteGraffitiTag(source: number, args: { graffitiId: number }): Promise<void> {
  //@ts-ignore
  const identifier: string = GetPlayerIdentifierByType(source, 'license2');
  const graffitiId: number = args.graffitiId;
  try {
    const data: GraffitiTag = graffitiTags[graffitiId];
    if (!data) {
      sendChatMessage(source, '^1 ERROR: ^0 No Graffiti Tag found with the specified ID.');
      return;
    }

    //@ts-ignore
    if (data.owner !== identifier && !isAdmin) {
      return sendChatMessage(source, '^1 ERROR: ^0 You cannot delete a Graffiti Tag that you did not create.');
    }

    const rowsChanged: unknown = await db.deleteGraffiti(graffitiId);
    if (!rowsChanged || (typeof rowsChanged === 'number' && rowsChanged === 0)) {
      console.error('Failed to delete Graffiti Tag from the database');
      sendChatMessage(source, '^1 ERROR: ^0 Failed to delete Graffiti Tag.');
      return;
    }

    delete graffitiTags[graffitiId];
    emitNet('fivem-graffiti:client:deleteGraffitiTag', source, graffitiId);
    sendChatMessage(source, '^4 Graffiti Tag was successfully deleted.');
  } catch (error) {
    console.error('Error deleting Graffiti Tag:', error);
    sendChatMessage(source, '^1 ERROR: ^0 An error occurred while deleting the Graffiti Tag.');
  }
}

onClientCallback('fivem-graffiti:server:getRoutingBucket', (source: number): number => {
  // @ts-ignore
  return GetPlayerRoutingBucket(source);
});

onClientCallback('fivem-graffiti:server:getGraffitiTags', (): Record<number, GraffitiTag[]> => {
  return graffitiTags;
});

onNet('fivem-graffiti:server:loadGraffitiTags', (): void => {
  db.loadGraffiti(source);
});

onNet('fivem-graffiti:server:deleteGraffitiTag', (graffitiId: number): void => {
  deleteGraffitiTag(source, { graffitiId });
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

addCommand(['cleangraffiti', 'cgrf'], deleteGraffitiTag, {
  params: [
    {
      name: 'graffitiId',
      help: 'The id of the graffiti tag to clean',
      paramType: 'number',
    },
  ],
});
