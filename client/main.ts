import * as Cfx from '@nativewrappers/client';
import { Point, triggerServerCallback } from '@overextended/ox_lib/client';
import * as config from '../config.json';
import { netEvent } from './utils';

interface Graffiti {
  id: number;
  creator_id: string;
  coords: string;
  dimension: number;
  text: string;
  displayed: boolean;
}

const createdGraffiti: Record<number, Graffiti> = {};
const drawGraffiti: Record<number, boolean> = {};
const points: Record<number, Point> = {};
let playerBucket: number = 0;

netEvent('fivem-graffiti:client:createGraffitiTag', (id: number, creator_id: string, coords: [number, number, number], dimension: number, text: string): void => {
    const graffiti: Graffiti = {
      id: id,
      creator_id: creator_id,
      coords: Cfx.Vector3.fromArray(coords),
      dimension: dimension,
      text: text,
      displayed: false,
    };

    createdGraffiti[id] = graffiti;
    drawGraffiti[id] = false;

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