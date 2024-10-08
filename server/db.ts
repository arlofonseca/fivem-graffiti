import { oxmysql } from '@overextended/oxmysql';
import { Graffiti } from '../@types/Graffiti';

export async function createGraffitiTable(): Promise<void> {
  try {
    await oxmysql.rawExecute(
      `CREATE TABLE IF NOT EXISTS graffiti (
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
    return await oxmysql.query<Graffiti[]>('SELECT * FROM graffiti');
  } catch (error) {
    console.error('fetchGraffitiTable:', error);
    await createGraffitiTable();
    return [];
  }
}

export async function saveGraffiti(creator_id: string, coords: string, dimension: number, text: string, font: number, size: number, hex: string): Promise<unknown> {
  try {
    return await oxmysql.rawExecute('INSERT INTO graffiti (creator_id, coords, dimension, text, font, size, hex) VALUES (?, ?, ?, ?, ?, ?, ?)', [creator_id, coords, dimension, text, font, size, hex]);
  } catch (error) {
    console.error('saveGraffiti:', error);
  }
}

export async function deleteGraffiti(graffitiId: number): Promise<unknown> {
  try {
    return await oxmysql.rawExecute('DELETE FROM graffiti WHERE id = ?', [graffitiId]);
  } catch (error) {
    console.error('deleteGraffiti:', error);
  }
}

export async function countGraffiti(identifier: string | number): Promise<number> {
  try {
    const result: { owner: string }[] = await oxmysql.query<{ owner: string }[]>('SELECT * FROM graffiti WHERE creator_id = ?', [identifier]);
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
      const coords: any = JSON.parse(graffiti.coords);
      emitNet('fivem-graffiti:client:createGraffitiTag', source || -1, graffiti.creator_id, coords, graffiti.dimension, graffiti.text, graffiti.font, graffiti.size, graffiti.hex);
    });
    console.log(`Loaded ${graffiti.length} Graffiti Tags from the database.`);
    return graffiti;
  } catch (error) {
    console.error('loadGraffiti:', error);
  }
}
