import { cache } from '@overextended/ox_lib/client';

export function netEvent<T extends any[]>(event: string, fn: (...args: T) => void) {
  onNet(event, (...args: T) => {
    if (!source || (source as any) == '') return;

    fn(...args);
  });
}

export function hexToRgb(hexCode: string) {
  let result: RegExpExecArray | null = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexCode);
  if (!result) return null;

  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);

  return { r: r, g: g, b: b };
}

export function getDirectionFromRotation(rotation: { z: number; x: number }) {
  var z = rotation.z * (Math.PI / 180.0);
  var x = rotation.x * (Math.PI / 180.0);
  var number = Math.abs(Math.cos(x));

  return { x: -Math.sin(z) * number, y: Math.cos(z) * number, z: Math.sin(x) };
}

export function calculateRotationFromNormal(normal: { x: number; y: number; z: number }) {
  const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  const x = normal.x / length;
  const y = normal.y / length;
  const z = normal.z / length;

  let newNormal = { x: x, y: y, z: z };

  const pitchValue = Math.asin(-newNormal.z);
  const rollValue = Math.atan2(newNormal.y, newNormal.x);
  const yawValue = Math.atan2(-newNormal.x, newNormal.y);

  const pitchDeg = ((pitchValue * 180) / Math.PI + 360) % 360;
  const rollDeg = ((rollValue * 180) / Math.PI + 360) % 360;
  const yawDeg = ((yawValue * 180) / Math.PI + 360) % 360;

  return { x: pitchDeg, y: rollDeg, z: yawDeg };
}

export function getRaycast(): { result: number; hit: any; coords: number[]; surface: number[]; entity: number } {
  let positionArray = GetFinalRenderedCamCoord();
  let position = { x: positionArray[0], y: positionArray[1], z: positionArray[2] };

  let cameraRotationArray = GetFinalRenderedCamRot(2);
  let cameraRotation = { x: cameraRotationArray[0], y: cameraRotationArray[1], z: cameraRotationArray[2] };

  let fwdVector = getDirectionFromRotation(cameraRotation);
  let front = { x: position.x + fwdVector.x * 10, y: position.y + fwdVector.y * 10, z: position.z + fwdVector.z * 10 };

  let raycast = StartShapeTestLosProbe(position.x, position.y, position.z, front.x, front.y, front.z, -1, cache.ped, 4);
  let [result, hit, coords, surface, entity] = GetShapeTestResultIncludingMaterial(raycast);

  return { result, hit, coords, surface, entity };
}
