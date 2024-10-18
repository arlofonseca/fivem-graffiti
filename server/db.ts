import { oxmysql } from '@overextended/oxmysql';
import { Graffiti } from '../@types/Graffiti';
import { RestrictedZones } from '../@types/RestrictedZones';

// -- Graffiti --

export async function createGraffitiTable(): Promise<void> {
  try {
    await oxmysql.rawExecute(
      `CREATE TABLE IF NOT EXISTS graffiti_tags (
        id INT NOT NULL AUTO_INCREMENT,
        creator_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        coords LONGTEXT NOT NULL,
        dimension INT DEFAULT 0,
        text LONGTEXT NOT NULL,
        font INT DEFAULT 0,
        size INT DEFAULT 0,
        hex LONGTEXT NOT NULL,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );
  } catch (error) {
    console.error('createGraffitiTable:', error);
  }
}

export async function fetchGraffitiTable(): Promise<Graffiti[]> {
  try {
    await createGraffitiTable();
    return await oxmysql.query<Graffiti[]>('SELECT * FROM graffiti_tags');
  } catch (error) {
    console.error('fetchGraffitiTable:', error);
    return [];
  }
}

export async function saveGraffiti(creator_id: string, coords: string, dimension: number, text: string, font: number, size: number, hex: string): Promise<unknown> {
  try {
    return await oxmysql.rawExecute('INSERT INTO graffiti_tags (creator_id, coords, dimension, text, font, size, hex) VALUES (?, ?, ?, ?, ?, ?, ?)', [creator_id, coords, dimension, text, font, size, hex]);
  } catch (error) {
    console.error('saveGraffiti:', error);
  }
}

export async function deleteGraffiti(graffitiId: number): Promise<unknown> {
  try {
    return await oxmysql.rawExecute('DELETE FROM graffiti_tags WHERE id = ?', [graffitiId]);
  } catch (error) {
    console.error('deleteGraffiti:', error);
  }
}

export async function countGraffiti(identifier: string | number): Promise<number> {
  try {
    const result: { owner: string }[] = await oxmysql.query<{ owner: string }[]>('SELECT * FROM graffiti_tags WHERE creator_id = ?', [identifier]);
    return result ? result.length : 0;
  } catch (error) {
    console.error('countGraffiti:', error);
    return 0;
  }
}

export async function loadGraffiti(source?: number): Promise<Graffiti[] | undefined> {
  try {
    const graffiti: Graffiti[] = await fetchGraffitiTable();
    graffiti.forEach((graffiti: Graffiti) => {
      const coords: number[] = JSON.parse(graffiti.coords);
      emitNet('fivem-graffiti:client:createGraffitiTag', source || -1, graffiti.creator_id, coords, graffiti.dimension, graffiti.text, graffiti.font, graffiti.size, graffiti.hex);
    });
    console.log(`Loaded ${graffiti.length} Graffiti Tags from the database.`);
    return graffiti;
  } catch (error) {
    console.error('loadGraffiti:', error);
  }
}

// -- Zones --

export async function createRestrictedZonesTable(): Promise<void> {
  try {
    await oxmysql.rawExecute(
      `CREATE TABLE IF NOT EXISTS graffiti_restricted_zones (
        id INT NOT NULL AUTO_INCREMENT,
        creator_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        coords LONGTEXT NOT NULL,
        dimension INT DEFAULT 0,
        radius INT DEFAULT 0,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );
  } catch (error) {
    console.error('createRestrictedZonesTable:', error);
  }
}

export async function fetchRestrictedZonesTable(): Promise<RestrictedZones[]> {
  try {
    await createRestrictedZonesTable();
    return await oxmysql.query<RestrictedZones[]>('SELECT * FROM graffiti_restricted_zones');
  } catch (error) {
    console.error('fetchRestrictedZonesTable:', error);
    return [];
  }
}

export async function saveRestrictedZone(creator_id: string, coords: string, dimension: number, radius: number): Promise<unknown> {
  try {
    return await oxmysql.rawExecute('INSERT INTO graffiti_restricted_zones (creator_id, coords, dimension, radius) VALUES (?, ?, ?, ?)', [creator_id, coords, dimension, radius]);
  } catch (error) {
    console.error('saveRestrictedZone:', error);
  }
}

export async function deleteRestrictedZone(zoneId: number): Promise<unknown> {
  try {
    return await oxmysql.rawExecute('DELETE FROM graffiti_restricted_zones WHERE id = ?', [zoneId]);
  } catch (error) {
    console.error('deleteRestrictedZone:', error);
  }
}

export async function getRestrictedZoneById(zoneId: number): Promise<RestrictedZones | null> {
  try {
    const [zone] = await oxmysql.query<RestrictedZones[]>('SELECT * FROM graffiti_restricted_zones WHERE id = ?', [zoneId]);
    return zone || null;
  } catch (error) {
    console.error('getRestrictedZoneById:', error);
    return null;
  }
}

export async function fetchRestrictedZoneCoords(): Promise<{ x: number; y: number; z: number; radius: number }[]> {
  try {
    const zones: RestrictedZones[] = await fetchRestrictedZonesTable();
    return zones.map(zone => {
      const array = JSON.parse(zone.coords);
      return {
        x: array[0],
        y: array[1],
        z: array[2],
        radius: zone.radius
      };
    });
  } catch (error) {
    console.error('fetchRestrictedZoneCoords:', error);
    return [];
  }
}

export async function loadRestrictedZones(): Promise<Array<{ creator_id: string; coords: number[]; dimension: number; radius: number }> | undefined> {
  try {
    const zones: Array<{ creator_id: string; coords: string; dimension: number; radius: number }> = await fetchRestrictedZonesTable();
    const parsedZones: { creator_id: string; coords: any; dimension: number; radius: number }[] = zones.map((zone) => ({ creator_id: zone.creator_id, coords: JSON.parse(zone.coords), dimension: zone.dimension, radius: zone.radius }));
    console.log(`Loaded ${parsedZones.length} Restricted Graffiti Zones from the database.`);
    return parsedZones;
  } catch (error) {
    console.error('loadRestrictedZones:', error);
    return undefined;
  }
}