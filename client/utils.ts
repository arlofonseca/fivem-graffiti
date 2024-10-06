import { cache } from '@overextended/ox_lib/client';

export function netEvent<T extends any[]>(event: string, fn: (...args: T) => void) {
  onNet(event, (...args: T) => {
    if (!source || (source as any) == '') return;

    fn(...args);
  });
}

export function hexToRgb(hexCode: string) {
  let resultColor: RegExpExecArray | null = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexCode);

  if (!resultColor) {
    return null;
  }

  let rColor = parseInt(resultColor[1], 16);
  let gColor = parseInt(resultColor[2], 16);
  let bColor = parseInt(resultColor[3], 16);

  return { r: rColor, g: gColor, b: bColor };
}

export function getDirectionFromRotation(rotation: { z: number; x: number }) {
  var z = rotation.z * (Math.PI / 180.0);
  var x = rotation.x * (Math.PI / 180.0);
  var num = Math.abs(Math.cos(x));

  return { x: -Math.sin(z) * num, y: Math.cos(z) * num, z: Math.sin(x) };
}

export function calculateRotationFromNormal(normal: { x: number; y: number; z: number }) {
  const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  const newX = normal.x / length;
  const newY = normal.y / length;
  const newZ = normal.z / length;

  let newNormal = { x: newX, y: newY, z: newZ };

  const pitchValue = Math.asin(-newNormal.z);
  const rollValue = Math.atan2(newNormal.y, newNormal.x);
  const yawValue = Math.atan2(-newNormal.x, newNormal.y);

  const pitchDeg = ((pitchValue * 180) / Math.PI + 360) % 360;
  const rollDeg = ((rollValue * 180) / Math.PI + 360) % 360;
  const yawDeg = ((yawValue * 180) / Math.PI + 360) % 360;

  return { x: pitchDeg, y: rollDeg, z: yawDeg };
}

export function getRaycast(): { result: number; hit: any; endCoords: number[]; surfaceNormal: number[]; entityHit: number } {
  let startPositionArray = GetFinalRenderedCamCoord();
  let startPosition = { x: startPositionArray[0], y: startPositionArray[1], z: startPositionArray[2] };

  let cameraRotationArray = GetFinalRenderedCamRot(2);
  let cameraRotation = { x: cameraRotationArray[0], y: cameraRotationArray[1], z: cameraRotationArray[2] };

  let fwdVector = getDirectionFromRotation(cameraRotation);
  let frontOf = { x: startPosition.x + fwdVector.x * 10, y: startPosition.y + fwdVector.y * 10, z: startPosition.z + fwdVector.z * 10 };

  let raycastTest = StartShapeTestLosProbe(startPosition.x, startPosition.y, startPosition.z, frontOf.x, frontOf.y, frontOf.z, -1, cache.ped, 4);
  let [result, hit, endCoords, surfaceNormal, entityHit] = GetShapeTestResultIncludingMaterial(raycastTest);

  return { result, hit, endCoords, surfaceNormal, entityHit };
}
