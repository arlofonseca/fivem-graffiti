import * as Cfx from '@nativewrappers/client';
import lib, { cache, Point } from '@overextended/ox_lib/client';
import { Graffiti } from '../@types/Graffiti';
import * as config from '../config.json';
import { calculateRotationFromNormal, getDirectionFromRotation, getRaycast, hexToRgb, netEvent } from './utils';

const createdGraffiti: Record<number, Graffiti> = {};
const drawGraffiti: Record<number, boolean> = {};
const points: Record<number, Point> = {};
let playerBucket: number = 0;

netEvent('fivem-graffiti:client:createGraffitiTag', (id: number, creator_id: string, coords: [number, number, number], dimension: number, text: string, font: number, size: number, hex: string, created_date: Date) => {
  const graffiti: Graffiti = {
    id: id,
    creator_id: creator_id,
    coords: JSON.stringify(Cfx.Vector3.fromArray(coords)),
    dimension: dimension,
    text: text,
    font: font,
    size: size,
    hex: hex,
    created_date: created_date,
    displayed: false,
  };

  createdGraffiti[id] = graffiti;
  drawGraffiti[id] = false;

  const vec: Cfx.Vector3 = Cfx.Vector3.fromArray(JSON.parse(graffiti.coords));
  sprayStart(vec, text, font, size, hex);

  points[id] = new Point({
    coords: [vec.x, vec.y, vec.z],
    distance: config.graffiti_distance,
    nearby: async (): Promise<void> => {
      const playerCoords: Cfx.Vector3 = Cfx.Game.PlayerPed.Position;
      const distance: number = playerCoords.distance(vec);
      if (playerBucket === graffiti.dimension && distance <= config.graffiti_distance) {
        drawGraffiti[id] = true;

        if (distance <= 1.5 && !graffiti.displayed) {
          // -- @todo: display graffiti --
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
      console.log(`Entered range of Graffiti Tag '#${id}'`);
    },
    onExit: () => {
      console.log(`Left range of Graffiti Tag '#${id}'`);
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

async function sprayStart(coords: Cfx.Vector3, text: string, size: number, font: number, hex: string): Promise<void> {
  const obj: number = sprayObject();

  await lib.requestAnimDict('anim@amb@business@weed@weed_inspecting_lo_med_hi@');
  await lib.requestNamedPtfxAsset('scr_recartheft');

  TaskPlayAnim(cache.ped, 'anim@amb@business@weed@weed_inspecting_lo_med_hi@', 'weed_spraybottle_stand_spraying_01_inspector', 1.0, 1.0, -1, 49, 0, false, false, false);

  const rgbaColor: { r: number; g: number; b: number } | null = hexToRgb(hex);
  if (!rgbaColor) return;

  let value: number = 0;
  const interval = setInterval(() => {
    if (value >= 255) {
      clearInterval(interval);
      if (DoesEntityExist(obj)) {
        DeleteObject(obj);
      }
      ClearPedTasks(cache.ped);
      return;
    }

    UseParticleFxAsset('scr_recartheft');
    SetParticleFxNonLoopedColour(rgbaColor.r / 255, rgbaColor.g / 255, rgbaColor.b / 255);
    StartNetworkedParticleFxNonLoopedAtCoord('scr_wheel_burnout', coords.x, coords.y, coords.z + 1.5, 0, 0, 0, size * 0.5, false, false, true);
    value++;
  }, 200);
}

function sprayObject() {
  const obj: number = CreateObject(GetHashKey('ng_proc_spraycan01b'), 0, 0, 0, false, false, false);
  const objPosition = new Cfx.Vector3(0.07, 0.03, -0.07);
  const objRotation = new Cfx.Vector3(15, 45, 10);

  AttachEntityToEntity(obj, cache.ped, GetPedBoneIndex(cache.ped, 57005), objPosition.x, objPosition.y, objPosition.z, objRotation.x, objRotation.y, objRotation.z, true, true, false, true, 0, true);

  return obj;
}

on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== 'fivem-graffiti') return;

  emitNet('fivem-graffiti:server:loadGraffitiTags');
});
