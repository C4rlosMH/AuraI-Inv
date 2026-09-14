import { eq, desc } from 'drizzle-orm';
import { accounts, assets, transactions } from '../db/schema';
import { calculateNewCPP, calculateOperationTotal } from '../utils/math';
import currency from 'currency.js';

// Usamos la API criptográfica nativa del navegador para generar IDs únicos
const generateId = () => crypto.randomUUID();

export const executePurchase = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: {
    accountId: string;
    assetId: string;
    quantity: number;
    price: number;
    commissionRate?: number; 
  }
) => {
  const { accountId, assetId, quantity, price, commissionRate = 0.0025 } = payload;

  // 1. Validar la existencia de la cuenta y el activo
  const accountResult = await db.select().from(accounts).where(eq(accounts.id, accountId));
  const assetResult = await db.select().from(assets).where(eq(assets.id, assetId));

  if (!accountResult.length || !assetResult.length) {
    throw new Error('Cuenta o Activo no encontrados en el catálogo.');
  }

  const account = accountResult[0];
  const asset = assetResult[0];

  // 2. Calcular matemáticas financieras exactas
  const { netTotal, commission } = calculateOperationTotal(quantity, price, commissionRate);
  
  if (account.balance < netTotal && account.type !== 'DEUDA') {
    throw new Error('Poder de compra insuficiente para ejecutar la orden.');
  }

  const newCPP = calculateNewCPP(asset.totalTitles, asset.averageCost, quantity, price);
  const newTotalTitles = asset.totalTitles + quantity;
  const newAccountBalance = account.balance - netTotal;

  // 3. Ejecutar las mutaciones en la base de datos local
  
  // Actualizar saldo de liquidez
  await db.update(accounts)
    .set({ balance: newAccountBalance })
    .where(eq(accounts.id, accountId));

  // Actualizar posición y Costo Promedio Ponderado del activo
  await db.update(assets)
    .set({ 
      totalTitles: newTotalTitles, 
      averageCost: newCPP 
    })
    .where(eq(assets.id, assetId));

  // Registrar inmutabilidad en el libro mayor (Ledger)
  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    type: 'COMPRA',
    originAccountId: accountId,
    destinationAccountId: null,
    assetId: assetId,
    quantity: quantity,
    executionPrice: price,
    commission: commission,
    timestamp: Date.now(), // Unix Epoch nativo
  });

  // 4. Persistir los cambios físicos en el almacenamiento del teléfono
  await saveDB();
  
  return { success: true, newBalance: newAccountBalance, newCPP };
};

export const executeSale = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: {
    accountId: string;
    assetId: string;
    quantity: number;
    price: number;
    commissionRate?: number;
  }
) => {
  const { accountId, assetId, quantity, price, commissionRate = 0.0025 } = payload;

  const accountResult = await db.select().from(accounts).where(eq(accounts.id, accountId));
  const assetResult = await db.select().from(assets).where(eq(assets.id, assetId));

  if (!accountResult.length || !assetResult.length) throw new Error('Cuenta o Activo no encontrados.');

  const account = accountResult[0];
  const asset = assetResult[0];

  if (asset.totalTitles < quantity) {
    throw new Error('No posees suficientes títulos para esta venta.');
  }

  // En una venta, la comisión se DESCUENTA del monto total que recibes
  const grossTotal = quantity * price;
  const commission = grossTotal * commissionRate * 1.16; // Comisión + IVA
  const netProceeds = grossTotal - commission;

  const newTotalTitles = asset.totalTitles - quantity;
  // El CPP no cambia en una venta, solo disminuyen los títulos
  const currentCPP = asset.averageCost; 

  // Si vendes todo, el CPP se resetea por sanidad contable
  const finalCPP = newTotalTitles === 0 ? 0 : currentCPP;

  await db.update(accounts)
    .set({ balance: account.balance + netProceeds })
    .where(eq(accounts.id, accountId));

  await db.update(assets)
    .set({ totalTitles: newTotalTitles, averageCost: finalCPP })
    .where(eq(assets.id, assetId));

  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    type: 'VENTA',
    originAccountId: null,
    destinationAccountId: accountId,
    assetId: assetId,
    quantity: quantity,
    executionPrice: price,
    commission: commission,
    timestamp: Date.now(),
  });

  await saveDB();

  return { success: true, proceeds: netProceeds, realizedPrice: price };
};

// --------------------------------------------------------
// MÓDULO DE TESORERÍA (CASH FLOW Y TRASPASOS)
// --------------------------------------------------------

// 1. GASTOS E INGRESOS SIMPLES
export const executeCashFlow = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: {
    type: 'DEPOSITO' | 'RETIRO';
    accountId: string;
    amount: number;
    concept?: string;  // <-- Nuevo
    category?: string; // <-- Nuevo
  }
) => {
  const { type, accountId, amount, concept, category } = payload;
  if (amount <= 0) throw new Error('El monto debe ser mayor a cero.');

  const accResult = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!accResult.length) throw new Error('Cuenta no encontrada.');
  const account = accResult[0];

  const newBalance = type === 'DEPOSITO' ? account.balance + amount : account.balance - amount;
  if (type === 'RETIRO' && account.type !== 'DEUDA' && newBalance < 0) {
    throw new Error('Liquidez insuficiente.');
  }

  await db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, accountId));

  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    type,
    originAccountId: type === 'RETIRO' ? accountId : null,
    destinationAccountId: type === 'DEPOSITO' ? accountId : null,
    assetId: null,
    quantity: amount,
    executionPrice: 1,
    commission: 0,
    timestamp: Date.now(),
    concept: concept || null,   // <-- Guardamos el concepto
    category: category || null, // <-- Guardamos la categoría
  });

  await saveDB();
  return { success: true };
};

// 2. TRASPASOS INTERNOS
export const executeTransfer = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: {
    originAccountId: string;
    destinationAccountId: string;
    amount: number;
    concept?: string;
    category?: string; // <-- SOLUCIÓN AL ERROR DE TYPESCRIPT
  }
) => {
  const { originAccountId, destinationAccountId, amount, concept, category } = payload;
  if (amount <= 0) throw new Error('El monto a transferir debe ser mayor a cero.');
  if (originAccountId === destinationAccountId) throw new Error('No puedes transferir a la misma cuenta.');

  const originResult = await db.select().from(accounts).where(eq(accounts.id, originAccountId));
  const destResult = await db.select().from(accounts).where(eq(accounts.id, destinationAccountId));

  if (!originResult.length || !destResult.length) throw new Error('Cuentas no encontradas.');
  
  if (originResult[0].type === 'DEUDA') {
    throw new Error('No puedes usar una cuenta de crédito/deuda como origen.');
  }
  if (originResult[0].balance < amount) {
    throw new Error(`Liquidez insuficiente. Solo tienes ${originResult[0].balance} disponibles.`);
  }

  await db.update(accounts).set({ balance: originResult[0].balance - amount }).where(eq(accounts.id, originAccountId));
  await db.update(accounts).set({ balance: destResult[0].balance + amount }).where(eq(accounts.id, destinationAccountId));

  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    type: 'TRANSFERENCIA',
    originAccountId,
    destinationAccountId,
    assetId: null,
    quantity: amount,
    executionPrice: 1,
    commission: 0,
    timestamp: Date.now(),
    concept: concept || 'Traspaso Interno',
    category: category || 'TRANSFERENCIA', // <-- SE GUARDA LA CLASIFICACIÓN DEL MODAL
  });

  await saveDB();
  return { success: true };
};

// 3. SPLIT DE NÓMINA (Banco + Efectivo)
export const executeSplitDeposit = async (
  db: any,
  saveDB: () => Promise<void>,
  payload: {
    bankAccountId: string;
    cashAccountId: string;
    bankAmount: number;
    cashAmount: number;
    concept?: string;  // <-- Nuevo
    category?: string; // <-- Nuevo
  }
) => {
  const { bankAccountId, cashAccountId, bankAmount, cashAmount, concept, category } = payload;
  const timestamp = Date.now();
  
  const applyConcept = concept || 'Ingreso de Capital (Split)';
  const applyCategory = category || 'INGRESO';

  if (bankAmount > 0) {
    const bankResult = await db.select().from(accounts).where(eq(accounts.id, bankAccountId));
    await db.update(accounts).set({ balance: bankResult[0].balance + bankAmount }).where(eq(accounts.id, bankAccountId));
      
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      type: 'DEPOSITO',
      destinationAccountId: bankAccountId,
      assetId: null,
      quantity: bankAmount,
      executionPrice: 1,
      commission: 0,
      timestamp: timestamp,
      concept: applyConcept,
      category: applyCategory,
    });
  }

  if (cashAmount > 0) {
    const cashResult = await db.select().from(accounts).where(eq(accounts.id, cashAccountId));
    await db.update(accounts).set({ balance: cashResult[0].balance + cashAmount }).where(eq(accounts.id, cashAccountId));
      
    await db.insert(transactions).values({
      id: generateId(),
      type: 'DEPOSITO',
      destinationAccountId: cashAccountId,
      assetId: null,
      quantity: cashAmount,
      executionPrice: 1,
      commission: 0,
      timestamp: timestamp + 1,
      concept: applyConcept,
      category: applyCategory,
    });
  }

  await saveDB();
  return { success: true };
};

export const getRecentTransactions = async (db: any, limitAmount = 5) => {
  try {
    // Drizzle ORM extrae automáticamente los nombres de las columnas (quantity, timestamp) 
    // tal cual como los declaraste en tu schema, sin necesidad de alias.
    const result = await db.select()
      .from(transactions)
      .orderBy(desc(transactions.timestamp))
      .limit(limitAmount);
    
    return result; // Drizzle ya devuelve un arreglo limpio
    
  } catch (error) {
    console.error("Error al obtener el historial:", error);
    return [];
  }
};

export const processTreasuryTransaction = async (db: any, payload: any) => {
  const { type, isSplitDeposit, originId, destId, amount, concept, category, bankId, cashId, bankAmount, cashAmount } = payload;
  const timestamp = Date.now();

  // Consultamos el estado real y fresco de las cuentas
  const accountsData = await db.select().from(accounts);

  // 1. FLUJO DIVIDIDO
  if (type === 'DEPOSITO' && isSplitDeposit) {
    const bAmt = parseFloat(bankAmount) || 0;
    const cAmt = parseFloat(cashAmount) || 0;

    if (bAmt <= 0 && cAmt <= 0) throw new Error("Debes ingresar al menos un monto válido");

    if (bAmt > 0 && bankId) {
      const bankAcc = accountsData.find((a: any) => a.id === bankId);
      if (bankAcc) {
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({ id: txId, type: 'DEPOSITO', destinationAccountId: bankId, quantity: bAmt, concept, category, timestamp });
        const newBal = currency(bankAcc.balance).add(bAmt).value;
        await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, bankId));
      }
    }

    if (cAmt > 0 && cashId) {
      const cashAcc = accountsData.find((a: any) => a.id === cashId);
      if (cashAcc) {
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({ id: txId, type: 'DEPOSITO', destinationAccountId: cashId, quantity: cAmt, concept, category, timestamp });
        const newBal = currency(cashAcc.balance).add(cAmt).value;
        await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, cashId));
      }
    }
    return;
  }

  // 2. FLUJO ESTÁNDAR
  const qty = parseFloat(amount);
  if (isNaN(qty) || qty <= 0) throw new Error("Monto inválido");
  if ((type === 'RETIRO' || type === 'TRANSFERENCIA') && !originId) throw new Error("Falta origen");
  if ((type === 'DEPOSITO' || type === 'TRANSFERENCIA') && !destId) throw new Error("Falta destino");

  const origAcc = originId ? accountsData.find((a: any) => a.id === originId) : null;
  const destAcc = destId ? accountsData.find((a: any) => a.id === destId) : null;

  // REGLA: PROTECCIÓN CONTRA SOBREGIRO
  if (type === 'RETIRO' || type === 'TRANSFERENCIA') {
    if (origAcc) {
      if (origAcc.type === 'DEUDA') {
        const currentDebt = Math.abs(origAcc.balance);
        const limit = origAcc.creditLimit || origAcc.credit_limit || 0;
        if (currency(currentDebt).add(qty).value > limit) {
          const disponible = currency(limit).subtract(currentDebt).value;
          throw new Error(`Línea de crédito insuficiente. Disp: ${disponible}`);
        }
      } else {
        if (qty > origAcc.balance) {
          throw new Error(`Fondos insuficientes. Disp: ${origAcc.balance}`);
        }
      }
    }
  }

  // EJECUCIÓN (ASIENTOS CONTABLES EXACTOS)
  const txId = crypto.randomUUID();
  await db.insert(transactions).values({
    id: txId, type, originAccountId: origAcc ? originId : null,
    destinationAccountId: destAcc ? destId : null,
    quantity: qty, concept, category, timestamp
  });

  if (type === 'DEPOSITO' && destAcc) {
    const newBal = currency(destAcc.balance).add(qty).value;
    await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, destId));
  } else if (type === 'RETIRO' && origAcc) {
    const newBal = currency(origAcc.balance).subtract(qty).value;
    await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, originId));
  } else if (type === 'TRANSFERENCIA' && origAcc && destAcc) {
    const newOrigBal = currency(origAcc.balance).subtract(qty).value;
    const newDestBal = currency(destAcc.balance).add(qty).value;
    await db.update(accounts).set({ balance: newOrigBal }).where(eq(accounts.id, originId));
    await db.update(accounts).set({ balance: newDestBal }).where(eq(accounts.id, destId));
  }
};