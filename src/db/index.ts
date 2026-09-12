import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import * as schema from './schema';
import localforage from 'localforage';
import initialMigration from './migrations/0000_high_lionheart.sql?raw';

// ¡El truco de Vite! Importamos la ruta del archivo binario directamente
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export const initDB = async () => {
  const SQL = await initSqlJs({
    // Le pasamos la ruta dinámica que Vite resolvió
    locateFile: () => sqlWasmUrl
  });

  const savedDatabase = await localforage.getItem<Uint8Array>('aura_inv_db');
  let sqlite;
  
  if (savedDatabase) {
    sqlite = new SQL.Database(savedDatabase);
  } else {
    // Es la primera vez que se abre la app. Creamos la DB y ejecutamos el SQL.
    sqlite = new SQL.Database();
    sqlite.run(initialMigration);
  }

  const db = drizzle(sqlite, { schema });

  const saveDB = async () => {
    const data = sqlite.export();
    await localforage.setItem('aura_inv_db', data);
  };

  // Guardamos inmediatamente si fue una creación nueva
  if (!savedDatabase) {
    await saveDB();
  }

  return { sqlite, db, saveDB };
};