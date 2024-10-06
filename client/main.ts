import * as Cfx from '@nativewrappers/client';
import lib, { cache, Point, triggerServerCallback } from '@overextended/ox_lib/client';
import * as config from '../config.json';
import { netEvent, hexToRgb, getDirectionFromRotation, calculateRotationFromNormal, getRaycast } from './utils';

interface Graffiti {
  id: number;
  creator_id: string;
  coords: string;
  dimension: number;
  text: string;
  font: number;
  size: number;
  hex: string;
  displayed: boolean;
}

const createdGraffiti: Record<number, Graffiti> = {};
const drawGraffiti: Record<number, boolean> = {};
const points: Record<number, Point> = {};
let playerBucket: number = 0;

netEvent('fivem-graffiti:client:createGraffitiTag', (id: number, creator_id: string, coords: [number, number, number], dimension: number, text: string, font: number, size: number, hex: string) => {
  const graffiti: Graffiti = {
    id: id,
    creator_id: creator_id,
    coords: JSON.stringify(Cfx.Vector3.fromArray(coords)),
    dimension: dimension,
    text: text,
    font: font,
    size: size,
    hex: hex,
    displayed: false,
  };

  createdGraffiti[id] = graffiti;
  drawGraffiti[id] = false;

  const vec = Cfx.Vector3.fromArray(JSON.parse(graffiti.coords));
  startSpray(vec, text, font, size, hex);

  points[id] = new Point({
    coords: [vec.x, vec.y, vec.z],
    distance: config.graffiti_distance,
    nearby: async (): Promise<void> => {
      const plyCoords: Cfx.Vector3 = Cfx.Game.PlayerPed.Position;
      const distance: number = plyCoords.distance(vec);
      if (playerBucket === graffiti.dimension && distance <= config.graffiti_distance) {
        drawGraffiti[id] = true;

        if (distance <= 1.5 && !graffiti.displayed) {
          // todo: display graffiti
          graffiti.displayed = true;
        } else if (distance > 1.5) {
          graffiti.displayed = false;
        }
      } else {
        graffiti.displayed = false;
        drawGraffiti[id] = false;
      }
    },
    onEnter: () => {
      console.log(`Entered range of point ${id}`);
    },
    onExit: () => {
      console.log(`Left range of point ${id}`);
      graffiti.displayed = false;
      drawGraffiti[id] = false;
    },
  });
});

netEvent('fivem-graffiti:client:deleteGraffitiTag', (id: number) => {
  if (points[id]) {
    points[id].remove();
    delete points[id];
  }
  delete createdGraffiti[id];
  delete drawGraffiti[id];
});

async function startSpray(coords: Cfx.Vector3, text: string, size: number, font: number, hex: string) {
  const ptxDict = 'scr_recartheft';
  const ptxName = 'scr_wheel_burnout';
  const obj = sprayObject();

  await lib.requestAnimDict('anim@amb@business@weed@weed_inspecting_lo_med_hi@');
  await lib.requestNamedPtfxAsset(ptxDict);

  TaskPlayAnim(cache.ped, 'anim@amb@business@weed@weed_inspecting_lo_med_hi@', 'weed_spraybottle_stand_spraying_01_inspector', 1.0, 1.0, -1, 49, 0, false, false, false);

  const rgbaColor = hexToRgb(hex);
  if (!rgbaColor) return;

  let alphaValue = 0;
  const particleInterval = setInterval(() => {
    if (alphaValue >= 255) {
      clearInterval(particleInterval);
      sprayObjectCleanup(obj);
      return;
    }

    const fwdVector = GetEntityForwardVector(cache.ped);
    const plyCoords = GetEntityCoords(cache.ped, true);
    const plyHeading = GetEntityHeading(cache.ped);
    const ptxCoords = { x: plyCoords[0] + fwdVector[0] * 0.5, y: plyCoords[1] + fwdVector[1] * 0.5, z: plyCoords[2] - 0.5 };

    UseParticleFxAsset(ptxDict);
    SetParticleFxNonLoopedColour(rgbaColor.r / 255, rgbaColor.g / 255, rgbaColor.b / 255);
    StartNetworkedParticleFxNonLoopedAtCoord(ptxName, ptxCoords.x, ptxCoords.y, ptxCoords.z + 1.5, 0, 0, plyHeading, 0.5, false, false, true);

    alphaValue++;
  }, 200);
}

function sprayObject() {
  const obj = CreateObject(GetHashKey('ng_proc_spraycan01b'), 0, 0, 0, false, false, false);
  const objPosition = new Cfx.Vector3(0.07, 0.03, -0.07);
  const objRotation = new Cfx.Vector3(15, 45, 10);

  AttachEntityToEntity(obj, cache.ped, GetPedBoneIndex(cache.ped, 57005), objPosition.x, objPosition.y, objPosition.z, objRotation.x, objRotation.y, objRotation.z, true, true, false, true, 0, true);

  return obj;
}

function sprayObjectCleanup(sprayObject: number) {
  if (DoesEntityExist(sprayObject)) {
    DeleteObject(sprayObject);
  }
  ClearPedTasks(cache.ped);
}

onNet('fivem-graffiti:client:getHex', (hexColor: string) => {
  const processedHex = hexColor;
  emitNet('fivem-graffiti:server:returnHex', processedHex);
});

on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== 'fivem-graffiti') return;

  emitNet('fivem-graffiti:server:loadGraffitiTags');
});

setInterval(async () => {
  const dimension: number | void = await triggerServerCallback('fivem-graffiti:server:getRoutingBucket', null);
  if (!dimension) return;

  playerBucket = dimension;
}, 1000);

setInterval(async () => {
  for (const id in drawGraffiti) {
    if (drawGraffiti[id]) {
      const graffiti = createdGraffiti[id];
      // todo
    }
  }
});
