import Decimal from 'decimal.js';

// Configuración de precisión global (20 dígitos significativos)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcula el nuevo Costo Promedio Ponderado (CPP) tras una compra.
 * Fórmula: ((Títulos Actuales * CPP Actual) + (Títulos Nuevos * Precio Compra)) / Títulos Totales
 */
export const calculateNewCPP = (
  currentTitles: number | string,
  currentCPP: number | string,
  boughtTitles: number | string,
  boughtPrice: number | string
): number => {
  const titlesBefore = new Decimal(currentTitles || 0);
  const cppBefore = new Decimal(currentCPP || 0);
  const titlesNew = new Decimal(boughtTitles || 0);
  const priceNew = new Decimal(boughtPrice || 0);

  const totalTitles = titlesBefore.plus(titlesNew);
  if (totalTitles.isZero()) return 0;

  const totalCostBefore = titlesBefore.times(cppBefore);
  const totalCostNew = titlesNew.times(priceNew);

  return totalCostBefore.plus(totalCostNew).dividedBy(totalTitles).toNumber();
};

/**
 * Calcula el costo total de una operación incluyendo comisión e IVA.
 * Ejemplo GBM: 0.25% de comisión + 16% de IVA sobre la comisión (total = 0.29%).
 */
export const calculateOperationTotal = (
  quantity: number | string,
  price: number | string,
  commissionRate: number | string = 0.0025, // 0.25% default GBM
  includeIVA: boolean = true
): { grossTotal: number; commission: number; netTotal: number } => {
  const q = new Decimal(quantity || 0);
  const p = new Decimal(price || 0);
  const rate = new Decimal(commissionRate || 0);

  const grossTotal = q.times(p);
  let commission = grossTotal.times(rate);

  if (includeIVA) {
    commission = commission.times(new Decimal(1.16)); // Suma 16% de IVA
  }

  const netTotal = grossTotal.plus(commission);

  return {
    grossTotal: grossTotal.toNumber(),
    commission: commission.toNumber(),
    netTotal: netTotal.toNumber(),
  };
};

/**
 * Calcula la plusvalía o minusvalía neta (absoluta y porcentual).
 */
export const calculatePnL = (
  currentTitles: number | string,
  currentPrice: number | string,
  averageCost: number | string
): { pnlAmount: number; pnlPercentage: number } => {
  const titles = new Decimal(currentTitles || 0);
  const current = new Decimal(currentPrice || 0);
  const cpp = new Decimal(averageCost || 0);

  if (titles.isZero() || cpp.isZero()) {
    return { pnlAmount: 0, pnlPercentage: 0 };
  }

  const currentValue = titles.times(current);
  const totalInvested = titles.times(cpp);
  const pnlAmount = currentValue.minus(totalInvested);
  const pnlPercentage = pnlAmount.dividedBy(totalInvested).times(100);

  return {
    pnlAmount: pnlAmount.toNumber(),
    pnlPercentage: pnlPercentage.toNumber(),
  };
};