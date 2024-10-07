export function sendChatMessage(source: number, message: string) {
    return exports.chat.addMessage(source, message);
}

export function isAdmin(source: string, group: string): boolean {
    return IsPlayerAceAllowed(source, group);
}

export function getDistance(one: number[], two: number[]): number {
    const x = one[0] - two[0];
    const y = one[1] - two[1];
    const z = one[2] - two[2];
    return Math.sqrt(x * x + y * y + z * z);
}