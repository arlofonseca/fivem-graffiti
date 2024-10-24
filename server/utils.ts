export function hasItem(source: number, item: string): boolean {
  return exports.ox_inventory.GetItemCount(source, item) > 0;
}

export function sendChatMessage(source: number, message: string) {
  return exports.chat.addMessage(source, message);
}

export function isAdmin(source: string, group: string): boolean {
  return IsPlayerAceAllowed(source, group);
}

export function getHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

export function getDistance(one: number[], two: number[]): number {
  const x: number = one[0] - two[0];
  const y: number = one[1] - two[1];
  const z: number = one[2] - two[2];
  return Math.sqrt(x * x + y * y + z * z);
}

export function getArea(coords: { x: number; y: number; z: number }, areas: { x: number; y: number; z: number; radius: number }[]): boolean {
  return areas.some((area) => {
    const distance: number = Math.sqrt(Math.pow(coords.x - area.x, 2) + Math.pow(coords.y - area.y, 2) + Math.pow(coords.z - area.z, 2));
    return distance <= area.radius;
  });
}