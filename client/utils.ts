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

  let rColor: number = parseInt(resultColor[1], 16);
  let gColor: number = parseInt(resultColor[2], 16);
  let bColor: number = parseInt(resultColor[3], 16);

  return { r: rColor, g: gColor, b: bColor };
}

export function getDirectionFromRotation(rotation: { z: number; x: number }) {
  var z: number = rotation.z * (Math.PI / 180.0);
  var x: number = rotation.x * (Math.PI / 180.0);
  var num: number = Math.abs(Math.cos(x));

  return {
    x: -Math.sin(z) * num,
    y: Math.cos(z) * num,
    z: Math.sin(x),
  };
}

export function calculateRotationFromNormal(normal: { x: number; y: number; z: number }) {
  const length: number = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  const newX: number = normal.x / length;
  const newY: number = normal.y / length;
  const newZ: number = normal.z / length;

  let newNormal: {
    x: number;
    y: number;
    z: number;
  } = { x: newX, y: newY, z: newZ };

  const pitchValue: number = Math.asin(-newNormal.z);
  const rollValue: number = Math.atan2(newNormal.y, newNormal.x);
  const yawValue: number = Math.atan2(-newNormal.x, newNormal.y);

  const pitchDeg: number = ((pitchValue * 180) / Math.PI + 360) % 360;
  const rollDeg: number = ((rollValue * 180) / Math.PI + 360) % 360;
  const yawDeg: number = ((yawValue * 180) / Math.PI + 360) % 360;

  return { x: pitchDeg, y: rollDeg, z: yawDeg };
}

export function getRaycast(): {
  result: number;
  hit: any;
  endCoords: number[];
  surfaceNormal: number[];
  entityHit: number;
} {
  // Get start position as an array and map it to x, y, z
  let startPositionArray: number[] = GetFinalRenderedCamCoord();
  let startPosition: {
    x: number;
    y: number;
    z: number;
  } = {
    x: startPositionArray[0],
    y: startPositionArray[1],
    z: startPositionArray[2],
  };

  // Get camera rotation and map it to x, y, z
  let cameraRotationArray: number[] = GetFinalRenderedCamRot(2);
  let cameraRotation: {
    x: number;
    y: number;
    z: number;
  } = {
    x: cameraRotationArray[0],
    y: cameraRotationArray[1],
    z: cameraRotationArray[2],
  };

  let fwdVector: {
    x: number;
    y: number;
    z: number;
  } = getDirectionFromRotation(cameraRotation);

  let frontOf: {
    x: number;
    y: number;
    z: number;
  } = {
    x: startPosition.x + fwdVector.x * 10,
    y: startPosition.y + fwdVector.y * 10,
    z: startPosition.z + fwdVector.z * 10,
  };

  let raycastTest: number = StartShapeTestLosProbe(
    startPosition.x,
    startPosition.y,
    startPosition.z,
    frontOf.x,
    frontOf.y,
    frontOf.z,
    -1,
    PlayerPedId(),
    4
  );

  let [result, hit, endCoords, surfaceNormal, entityHit] = GetShapeTestResultIncludingMaterial(raycastTest);

  return { result, hit, endCoords, surfaceNormal, entityHit };
}
