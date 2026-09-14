import { eq } from 'drizzle-orm';
import { accounts, transactions, assets } from '../db/schema';
import currency from 'currency.js';

const FEES = {
  GBM: 0.0029,    // 0.25% comisión + 16% IVA = 0.29% total
  CRIPTO: 0.0050  // 0.50% promedio en exchanges como Bitso o Binance
};

export const processTrade = async (db: any, payload: any) => {
  const { type, assetId, category, titles, executionPrice, accountId } = payload;
  const timestamp = Date.now();

  const qty = parseFloat(titles);
  const price = parseFloat(executionPrice);
  
  if (isNaN(qty) || qty <= 0) throw new Error("Cantidad de títulos inválida");
  if (isNaN(price) || price < 0) throw new Error("Precio de ejecución inválido");
  if (!accountId) throw new Error("Falta seleccionar la cuenta de liquidez");

  // 1. Cálculo de Subtotal y Comisiones
  const subtotal = Number((qty * price).toFixed(2));
  const feeRate = category.toUpperCase() === 'GBM' ? FEES.GBM : FEES.CRIPTO;
  const commission = Number((subtotal * feeRate).toFixed(2));
  
  const upperAssetId = assetId.toUpperCase();

  const accountsData = await db.select().from(accounts);
  const liqAccount = accountsData.find((a: any) => a.id === accountId);
  if (!liqAccount) throw new Error("Cuenta de liquidez no encontrada");

  const assetsData = await db.select().from(assets);
  const existingAsset = assetsData.find((a: any) => a.id === upperAssetId);

  // ==========================================
  // COMPRA (Suma comisión al costo)
  // ==========================================
  if (type === 'COMPRA') {
    const totalCost = Number((subtotal + commission).toFixed(2)); // Pagas el activo + la comisión

    if (liqAccount.balance < totalCost) {
      throw new Error(`Poder de compra insuficiente. Requieres $${totalCost} (incluye $${commission} de comisión) y tienes $${liqAccount.balance}`);
    }

    // Restar liquidez (Capital + Comisión)
    const newBal = Number((liqAccount.balance - totalCost).toFixed(2));
    await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accountId));

    // Promediar Costo absorbiendo la comisión (Aumenta tu costo base real)
    if (existingAsset) {
      const oldTotalCost = existingAsset.totalTitles * existingAsset.averageCost;
      const newTotalCost = oldTotalCost + totalCost;
      const newTotalTitles = existingAsset.totalTitles + qty;
      const newAvgCost = newTotalCost / newTotalTitles;

      await db.update(assets).set({
        totalTitles: newTotalTitles,
        averageCost: newAvgCost,
        currentPrice: price
      }).where(eq(assets.id, existingAsset.id));
    } else {
      // Para activos nuevos, el precio actual es el de mercado, pero el costo promedio incluye la comisión
      const initialAvgCost = totalCost / qty;
      await db.insert(assets).values({
        id: upperAssetId, name: upperAssetId, symbol: upperAssetId, ticker: upperAssetId,
        category, totalTitles: qty, averageCost: initialAvgCost, currentPrice: price
      });
    }

    // Asiento Transaccional Detallado
    const txId = crypto.randomUUID();
    await db.insert(transactions).values({
      id: txId, type: 'COMPRA', originAccountId: accountId, destinationAccountId: null,
      quantity: totalCost, 
      concept: `COMPRA | ${upperAssetId} | ${qty} a $${price} (Com: $${commission})`, 
      category: 'Inversiones', timestamp
    });

  // ==========================================
  // VENTA (Resta comisión a tu ganancia)
  // ==========================================
  } else if (type === 'VENTA') {
    if (!existingAsset || existingAsset.totalTitles < qty) {
      throw new Error(`Títulos insuficientes. Tienes: ${existingAsset?.totalTitles || 0}`);
    }

    const netProceeds = Number((subtotal - commission).toFixed(2)); // Recibes la venta menos la comisión del broker

    // Sumar liquidez neta a la cuenta
    const newBal = Number((liqAccount.balance + netProceeds).toFixed(2));
    await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accountId));

    // Restar Títulos con límite de polvo (Dust limit)
    const newTotalTitles = Number((existingAsset.totalTitles - qty).toFixed(8));
    
    if (newTotalTitles <= 0.00000001) { 
      await db.delete(assets).where(eq(assets.id, existingAsset.id));
    } else {
      await db.update(assets).set({
        totalTitles: newTotalTitles,
        currentPrice: price
      }).where(eq(assets.id, existingAsset.id));
    }

    // Asiento Transaccional Detallado
    const txId = crypto.randomUUID();
    await db.insert(transactions).values({
      id: txId, type: 'VENTA', originAccountId: null, destinationAccountId: accountId,
      quantity: netProceeds, 
      concept: `VENTA | ${upperAssetId} | ${qty} a $${price} (Com: $${commission})`, 
      category: 'Inversiones', timestamp
    });
  }
};
// Pequeño helper para el formato interno (Cópialo aquí también o impórtalo)
const formatMXN = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

export const processDividend = async (db: any, payload: any) => {
  const { accountId, assetId, amount } = payload;
  const timestamp = Date.now();
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Monto de dividendo inválido");
  if (!accountId || !assetId) throw new Error("Faltan datos de la cuenta o el activo");

  const accountsData = await db.select().from(accounts);
  const liqAccount = accountsData.find((a: any) => a.id === accountId);
  if (!liqAccount) throw new Error("Cuenta de liquidez no encontrada");

  // 1. Inyectar el efectivo directo a la liquidez (GBM / Cripto)
  const newBal = currency(liqAccount.balance).add(parsedAmount).value;
  await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accountId));

  // 2. Generar el Asiento Transaccional de Rendimiento Pasivo
  const txId = crypto.randomUUID();
  await db.insert(transactions).values({
    id: txId,
    type: 'DIVIDENDO',
    originAccountId: null,
    destinationAccountId: accountId,
    quantity: parsedAmount,
    concept: `DIVIDENDO | ${assetId.toUpperCase()} | Pago de rendimientos`,
    category: 'Inversiones',
    timestamp
  });
};