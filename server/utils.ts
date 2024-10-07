export function sendChatMessage(source: number, message: string) {
    return exports.chat.addMessage(source, message);
}

export function isAdmin(source: string, group: string): boolean {
    return IsPlayerAceAllowed(source, group);
}

export function getHex(source: number, hexColor: string): Promise<string> {
    return new Promise((resolve, reject) => {
        emitNet('fivem-graffiti:client:getHex', source, hexColor);

        onNet('fivem-graffiti:server:returnHex', (returnedHex: string) => {
            if (returnedHex) {
                resolve(returnedHex);
            } else {
                reject('Failed to get hex color from client.');
            }
        });
    });
}

export function getDistance(one: number[], two: number[]): number {
    const x = one[0] - two[0];
    const y = one[1] - two[1];
    const z = one[2] - two[2];
    return Math.sqrt(x * x + y * y + z * z);
}