import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initDB } from './index';

// Definimos qué expone nuestro contexto
type DBContextType = {
  db: any; // Instancia de Drizzle ORM
  saveDB: () => Promise<void>;
  isReady: boolean;
};

const DBContext = createContext<DBContextType | null>(null);

export const DBProvider = ({ children }: { children: ReactNode }) => {
  const [dbInstance, setDbInstance] = useState<any>(null);
  const [saveFunction, setSaveFunction] = useState<(() => Promise<void>) | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadDatabase = async () => {
      const { db, saveDB } = await initDB();
      setDbInstance(db);
      setSaveFunction(() => saveDB);
      setIsReady(true);
    };
    loadDatabase();
  }, []);

  if (!isReady) {
    // Pantalla de carga ultra-minimalista mientras arranca el motor SQLite
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-emerald-400 font-bold animate-pulse">Cargando Motor Financiero...</p>
      </div>
    );
  }

  return (
    <DBContext.Provider value={{ db: dbInstance, saveDB: saveFunction!, isReady }}>
      {children}
    </DBContext.Provider>
  );
};

// Hook personalizado para usar la base de datos en cualquier pantalla
export const useDB = () => {
  const context = useContext(DBContext);
  if (!context) throw new Error("useDB debe usarse dentro de un DBProvider");
  return context;
};