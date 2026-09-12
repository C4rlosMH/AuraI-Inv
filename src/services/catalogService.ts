import { eq, or } from 'drizzle-orm';
import { accounts, assets, transactions } from '../db/schema';

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

// Función para poblar la base de datos la primera vez que abres la app
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