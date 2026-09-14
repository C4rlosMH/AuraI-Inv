import { eq, or } from 'drizzle-orm';
import { accounts, assets, transactions, netWorthHistory } from '../db/schema'; // <-- Nueva importación añadida

const generateId = () => crypto.randomUUID();

export const addAccount = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: { name: string; type: 'EFECTIVO' | 'DEUDA' | 'INVERSION' | 'FONDO'; initialBalance?: number }
) => {
  const newAccount = {
    id: generateId(),
    name: payload.name,
    type: payload.type,
    balance: payload.initialBalance || 0,
  };

  await db.insert(accounts).values(newAccount);
  await saveDB();
  return newAccount;
};

export const addAsset = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: { ticker: string; category: 'ETF' | 'FIBRA' | 'ACCION' | 'CRIPTO' }
) => {
  const newAsset = {
    id: generateId(),
    ticker: payload.ticker,
    category: payload.category,
    totalTitles: 0,
    averageCost: 0,
  };

  await db.insert(assets).values(newAsset);
  await saveDB();
  return newAsset;
};

export const seedInitialCatalog = async (db: any, saveDB: () => Promise<void>) => {
  const existingAccounts = await db.select().from(accounts);
  
  if (existingAccounts.length === 0) {
    // 1. CUENTAS MAESTRAS (Alta Liquidez - M0)
    await db.insert(accounts).values({
      id: generateId(), name: 'Banco', type: 'EFECTIVO', balance: 0,
    });
    await db.insert(accounts).values({
      id: generateId(), name: 'Efectivo', type: 'EFECTIVO', balance: 0,
    });

    // 2. FONDOS OPERATIVOS Y RESERVAS (Liquidez Etiquetada)
    await db.insert(accounts).values({
      id: generateId(), name: 'Gastos Diarios', type: 'FONDO', balance: 0,
    });
    await db.insert(accounts).values({
      id: generateId(), name: 'Ahorro', type: 'FONDO', balance: 0,
    });
    await db.insert(accounts).values({
      id: generateId(), name: 'Emergencia', type: 'FONDO', balance: 0,
    });

    // 4. PORTAFOLIOS DE INVERSIÓN (Poder de Compra)
    await db.insert(accounts).values({
      id: generateId(), name: 'Inversiones', type: 'INVERSION', balance: 0,
    });
    await db.insert(accounts).values({
      id: generateId(), name: 'Criptos', type: 'INVERSION', balance: 0,
    });

    await saveDB();
  }

  const currentAssets = await db.select().from(assets);
  
  if (currentAssets.length === 0) {
    await db.insert(assets).values([
      { 
        id: 'GFNORTE O', name: 'Grupo Financiero Banorte', symbol: 'GFNORTE O', ticker: 'GFNORTE O',
        category: 'GBM', totalTitles: 1, averageCost: 195.93, currentPrice: 200.22 
      },
      { 
        id: 'BBAJIO O', name: 'Banco del Bajio', symbol: 'BBAJIO O', ticker: 'BBAJIO O',
        category: 'GBM', totalTitles: 5, averageCost: 57.96, currentPrice: 57.97 
      },
      { 
        id: 'KOF UBL', name: 'Coca Cola Femsa', symbol: 'KOF UBL', ticker: 'KOF UBL',
        category: 'GBM', totalTitles: 1, averageCost: 192.30, currentPrice: 191.09 
      },
      { 
        id: 'IVVPESO ISHRS', name: 'iShares S&P 500 Peso', symbol: 'IVVPESO ISHRS', ticker: 'IVVPESO ISHRS',
        category: 'GBM', totalTitles: 1, averageCost: 156.44, currentPrice: 154.85 
      },
      { 
        id: 'WALMEX *', name: 'Wal-Mart de México', symbol: 'WALMEX *', ticker: 'WALMEX *',
        category: 'GBM', totalTitles: 3, averageCost: 46.12, currentPrice: 46.03 
      },
      { 
        id: 'FIBRAMQ 12', name: 'Fibra Macquarie', symbol: 'FIBRAMQ 12', ticker: 'FIBRAMQ 12',
        category: 'GBM', totalTitles: 3, averageCost: 43.88, currentPrice: 43.80 
      },
      { 
        id: 'FUNO 11', name: 'Fibra UNO ADMIN SA DE CV', symbol: 'FUNO 11', ticker: 'FUNO 11',
        category: 'GBM', totalTitles: 2, averageCost: 29.36, currentPrice: 29.93 
      }
    ]);
  }

  // =========================================================================
  // GENERACIÓN DE HISTORIAL PATRIMONIAL (Simulación de 7 días atrás)
  // =========================================================================
  const existingHistory = await db.select().from(netWorthHistory);
  
  if (existingHistory.length === 0) {
    const today = new Date();
    const historyData = [];
    
    // Simulamos una curva de crecimiento que empezó con $1,500 hace 7 días
    const mockValues = [1500, 1620, 1580, 1800, 1950, 2100, 2236]; 
    
    for (let i = 6; i >= 0; i--) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      const dateString = pastDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      const timestamp = pastDate.getTime();
      
      const dayWorth = mockValues[6 - i];
      
      historyData.push({
        id: dateString,
        date: timestamp,
        totalEfectivo: dayWorth * 0.1, // 10% en efectivo
        totalInversiones: dayWorth * 0.8, // 80% en GBM
        totalCripto: dayWorth * 0.1, // 10% en Cripto
        netWorth: dayWorth
      });
    }
    
    await db.insert(netWorthHistory).values(historyData);
  }

  await saveDB();
};

export const updateAccountSettings = async (
  db: any,
  saveDB: () => Promise<void>,
  accountId: string,
  payload: {
    name: string;
    creditLimit?: number;
    balance?: number;
  }
) => {
  const updateData: any = { name: payload.name };
  
  if (payload.creditLimit !== undefined) {
    // Inyectamos ambos nombres posibles. Drizzle tomará el correcto y descartará el otro.
    updateData.credit_limit = payload.creditLimit;
    updateData.creditLimit = payload.creditLimit; 
  }
  
  if (payload.balance !== undefined) {
    updateData.balance = payload.balance;
  }

  await db.update(accounts)
    .set(updateData)
    .where(eq(accounts.id, accountId));

  await saveDB();
  return { success: true };
};

export const deleteAccount = async (db: any, saveDB: () => Promise<void>, accountId: string) => {
  // 1. Eliminar transacciones asociadas para evitar errores de llave foránea
  await db.delete(transactions)
    .where(
      or(
        eq(transactions.originAccountId, accountId),
        eq(transactions.destinationAccountId, accountId)
      )
    );

  // 2. Eliminar la cuenta del catálogo
  await db.delete(accounts).where(eq(accounts.id, accountId));

  // 3. Persistir los cambios
  await saveDB();
  return { success: true };
};

export const createNewCreditAccount = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: { name: string; creditLimit: number; balance: number }
) => {
  const newId = crypto.randomUUID(); 
  
  const insertData: any = {
    id: newId,
    name: payload.name,
    type: 'DEUDA',
    balance: payload.balance,
    // Doble llave también en la creación
    credit_limit: payload.creditLimit,
    creditLimit: payload.creditLimit, 
  };

  await db.insert(accounts).values(insertData);
  await saveDB();
  return { success: true, id: newId };
};