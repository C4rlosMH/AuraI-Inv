import { eq } from 'drizzle-orm';
import { accounts, transactions, assets } from '../db/schema';
import currency from 'currency.js';

export const processTrade = async (db: any, payload: any) => {
  const { type, assetId, category, titles, executionPrice, accountId } = payload;
  const timestamp = Date.now();

  const qty = parseFloat(titles);
  const price = parseFloat(executionPrice);
  
  if (isNaN(qty) || qty <= 0) throw new Error("Cantidad de títulos inválida");
  if (isNaN(price) || price < 0) throw new Error("Precio de ejecución inválido");
  if (!accountId) throw new Error("Falta seleccionar la cuenta de liquidez");

  const totalValue = currency(qty).multiply(price).value;
  const upperAssetId = assetId.toUpperCase();

  const accountsData = await db.select().from(accounts);
  const liqAccount = accountsData.find((a: any) => a.id === accountId);
  if (!liqAccount) throw new Error("Cuenta de liquidez no encontrada");

  const assetsData = await db.select().from(assets);
  const existingAsset = assetsData.find((a: any) => a.id === upperAssetId);

  // ==========================================
  // LÓGICA DE COMPRA (BUY)
  // ==========================================
  if (type === 'COMPRA') {
    if (liqAccount.balance < totalValue) {
      throw new Error(`Poder de compra insuficiente. Requieres ${formatMXN(totalValue)} y tienes ${formatMXN(liqAccount.balance)}`);
    }

    // 1. Restar Liquidez
    const newBal = currency(liqAccount.balance).subtract(totalValue).value;
    await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accountId));

    // 2. Promediar Costo e Inyectar Títulos
    if (existingAsset) {
      const oldTotalCost = currency(existingAsset.totalTitles).multiply(existingAsset.averageCost).value;
      const newTotalCost = currency(oldTotalCost).add(totalValue).value;
      const newTotalTitles = currency(existingAsset.totalTitles).add(qty).value;
      const newAvgCost = currency(newTotalCost).divide(newTotalTitles).value;

      await db.update(assets).set({
        totalTitles: newTotalTitles,
        averageCost: newAvgCost,
        currentPrice: price
      }).where(eq(assets.id, existingAsset.id));
    } else {
      // AQUÍ ESTABA EL ERROR: Agregamos ticker: upperAssetId
      await db.insert(assets).values({
        id: upperAssetId, name: upperAssetId, symbol: upperAssetId, ticker: upperAssetId,
        category, totalTitles: qty, averageCost: price, currentPrice: price
      });
    }

    // 3. Asiento Transaccional
    const txId = crypto.randomUUID();
    await db.insert(transactions).values({
      id: txId, type: 'COMPRA', originAccountId: accountId, destinationAccountId: null,
      quantity: totalValue, 
      concept: `COMPRA | ${upperAssetId} | ${qty} títulos a $${price}`, 
      category: 'Inversiones', timestamp
    });

  // ==========================================
  // LÓGICA DE VENTA (SELL)
  // ==========================================
  } else if (type === 'VENTA') {
    if (!existingAsset || existingAsset.totalTitles < qty) {
      throw new Error(`Títulos insuficientes. Tienes: ${existingAsset?.totalTitles || 0}`);
    }

    // 1. Sumar liquidez a la cuenta
    const newBal = currency(liqAccount.balance).add(totalValue).value;
    await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accountId));

    // 2. Restar Títulos del Portafolio
    const newTotalTitles = currency(existingAsset.totalTitles).subtract(qty).value;
    if (newTotalTitles === 0) {
      await db.delete(assets).where(eq(assets.id, existingAsset.id));
    } else {
      await db.update(assets).set({
        totalTitles: newTotalTitles,
        currentPrice: price
      }).where(eq(assets.id, existingAsset.id));
    }

    // 3. Asiento Transaccional
    const txId = crypto.randomUUID();
    await db.insert(transactions).values({
      id: txId, type: 'VENTA', originAccountId: null, destinationAccountId: accountId,
      quantity: totalValue, 
      concept: `VENTA | ${upperAssetId} | ${qty} títulos a $${price}`, 
      category: 'Inversiones', timestamp
    });
  }
};

// Pequeño helper para el formato interno (Cópialo aquí también o impórtalo)
const formatMXN = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};