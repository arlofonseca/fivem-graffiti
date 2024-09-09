import * as Cfx from '@nativewrappers/client';
import { Point, triggerServerCallback } from '@overextended/ox_lib/client';
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

netEvent(
  'fivem-graffiti:client:createGraffitiTag',
  (
    id: number,
    creator_id: string,
    coords: [number, number, number],
    dimension: number,
    text: string,
    font: number,
    size: number,
    hex: string
  ): void => {
    const graffiti: Graffiti = {
      id: id,
      creator_id: creator_id,
      coords: Cfx.Vector3.fromArray(coords),
      dimension: dimension,
      text: text,
      font: font,
      size: size,
      hex: hex,
      displayed: false,
    };

    createdGraffiti[id] = graffiti;
    drawGraffiti[id] = false;

    startSpray(coords, text, font, size, hex);

    const point = new Point({
      coords: coords,
      distance: config.graffiti_distance,
      nearby: async (): Promise<void> => {
        const plyCoords: Cfx.Vector3 = Cfx.Game.PlayerPed.Position;
        const distance: number = plyCoords.distance(graffiti.coords);
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
      onEnter: (): void => {
        console.log(`Entered range of point ${id}`);
      },
      onExit: (): void => {
        console.log(`Left range of point ${id}`);
        graffiti.displayed = false;
        drawGraffiti[id] = false;
      },
    });

    points[id] = point;
  }
);

async function startSpray(coords: Cfx.Vector3, text: string, size: number, font: number, hex: string) {
  const ptxDict = 'scr_recartheft';
  const ptxName = 'scr_wheel_burnout';
  const sprayPos = new Cfx.Vector3(0.07, 0.03, -0.07);
  const sprayRot = new Cfx.Vector3(15, 45, 10);
  const sprayObject = CreateObject(GetHashKey('ng_proc_spraycan01b'), 0, 0, 0, false, false, false);

  AttachEntityToEntity(
    sprayObject,
    PlayerPedId(),
    GetPedBoneIndex(PlayerPedId(), 57005), // Bone index for the right hand
    sprayPos.x,
    sprayPos.y,
    sprayPos.z,
    sprayRot.x,
    sprayRot.y,
    sprayRot.z,
    true,
    true,
    false,
    true,
    0,
    true
  );

  RequestAnimDict('anim@amb@business@weed@weed_inspecting_lo_med_hi@');
  while (!HasAnimDictLoaded('anim@amb@business@weed@weed_inspecting_lo_med_hi@')) {
    await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 100));

    RequestNamedPtfxAsset(ptxDict);
    while (!HasNamedPtfxAssetLoaded(ptxDict)) {
      await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 100));
    }

    TaskPlayAnim(
      PlayerPedId(),
      'anim@amb@business@weed@weed_inspecting_lo_med_hi@',
      'weed_spraybottle_stand_spraying_01_inspector',
      1.0,
      1.0,
      -1,
      49,
      0,
      false,
      false,
      false
    );

    // Convert hex color to RGBA
    const rgbaColor = hexToRgb(hex);
    let alphaValue = 0;

    // Start spraying
    let particleInterval = setInterval(() => {
      if (alphaValue === 255) {
        clearInterval(particleInterval);

        if (DoesEntityExist(sprayObject)) {
          DeleteObject(sprayObject);
        }

        ClearPedTasks(PlayerPedId());

        // todo: draw graffiti
        return;
      }

      const fwdVector: number[] = GetEntityForwardVector(PlayerPedId());
      const playerCoords: number[] = GetEntityCoords(PlayerPedId(), true);
      const ptxCoords = {
        x: playerCoords[0] + fwdVector[0] * 0.5,
        y: playerCoords[1] + fwdVector[1] * 0.5,
        z: playerCoords[2] - 0.5,
      };
      const playerHeading: number = GetEntityHeading(PlayerPedId());

      if (!rgbaColor) {
        return null;
      }

      UseParticleFxAsset(ptxDict);
      SetParticleFxNonLoopedColour(rgbaColor.r / 255, rgbaColor.g / 255, rgbaColor.b / 255);
      StartNetworkedParticleFxNonLoopedAtCoord(
        ptxName,
        ptxCoords.x,
        ptxCoords.y,
        ptxCoords.z + 1.5,
        0,
        0,
        playerHeading,
        0.5,
        false,
        false,
        true
      );

      alphaValue++;
    }, 200);
  }

  netEvent('fivem-graffiti:client:deleteGraffitiTag', (id: number): void => {
    if (points[id]) {
      points[id].remove();
      delete points[id];
    }

    delete createdGraffiti[id];
    delete drawGraffiti[id];
  });

  on('onClientResourceStart', (resourceName: string): void => {
    if (resourceName !== 'fivem-graffiti') return;

    emitNet('fivem-graffiti:server:loadGraffitiTags');
  });

  setInterval(async (): Promise<void> => {
    const bucket: number | void = await triggerServerCallback('fivem-graffiti:server:getRoutingBucket', null);
    if (!bucket) return;

    playerBucket = bucket;
  }, 1000);

  setInterval(async (): Promise<void> => {
    for (const id in drawGraffiti) {
      if (drawGraffiti[id]) {
        const graffiti = createdGraffiti[id];
        Cfx.World.drawMarker(
          Cfx.MarkerType.QuestionMark,
          graffiti.coords,
          Cfx.Vector3.create(0),
          new Cfx.Vector3(0, 360, 0),
          Cfx.Vector3.create(0.5),
          new Cfx.Color(204, 230, 217, 188),
          false,
          true
        );
      }
    }
  });
}
