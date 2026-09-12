import { useState, useEffect, useCallback } from 'react';
import { useDB } from '../db/DBContext';
import { accounts, assets, transactions } from '../db/schema';
import { desc } from 'drizzle-orm';

export const usePortfolioStats = () => {
  const { db, isReady } = useDB();
  const [stats, setStats] = useState({
    netWorth: 0,
    bankBalance: 0,
    cashBalance: 0,
    
    totalDebt: 0,
    totalCreditLimit: 0, 
    
    totalInvested: 0,
    
    gbmBuyingPower: 0,
    gbmMarketValue: 0,
    gbmReturnPct: 0,
    
    cryptoBuyingPower: 0,
    cryptoMarketValue: 0,
    cryptoReturnPct: 0, 

    bankId: '',
    cashId: '',
    debtId: '',
    historyBank: [0],
    historyCash: [0],
    historyDebt: [0],
    historyGBM: [0],
    historyCrypto: [0],
    funds: [] as { id: string; name: string; balance: number; history: number[] }[]
  });

  const loadStats = useCallback(async () => {
    if (!isReady || !db) return;

    const allAccounts = await db.select().from(accounts);
    const allAssets = await db.select().from(assets);
    const allTx = await db.select().from(transactions).orderBy(desc(transactions.timestamp));

    let bank = 0, cash = 0, debt = 0, totalCreditLimit = 0, totalFundsBalance = 0;
    let gbmBuyingPower = 0, cryptoBuyingPower = 0; 
    let gbmMarketValue = 0, cryptoMarketValue = 0;
    
    let bankId = '', cashId = '', debtId = '';
    const accountMap: Record<string, any> = {};
    const fundsMap: Record<string, { id: string; name: string; balance: number; tempBalance: number; history: number[] }> = {};

    // ==========================================
    // CLASIFICACIÓN ESTRICTA POR TIPO (SIN FUGAS)
    // ==========================================
    allAccounts.forEach((acc: any) => {
      accountMap[acc.id] = acc;
      const name = (acc.name || '').toLowerCase();

      if (acc.type === 'FONDO') {
        fundsMap[acc.id] = { id: acc.id, name: acc.name, balance: acc.balance, tempBalance: acc.balance, history: [acc.balance] };
        totalFundsBalance += acc.balance;
      } 
      else if (acc.type === 'EFECTIVO') {
        if (name.includes('efectivo') || name.includes('caja')) {
          cash += acc.balance;
          cashId = acc.id;
        } else {
          // Si no es explícitamente efectivo/caja, el motor asume que es el Banco.
          bank += acc.balance;
          bankId = acc.id;
        }
      } 
      else if (acc.type === 'INVERSION') {
        if (name.includes('crypto') || name.includes('cripto') || name.includes('vault')) {
          cryptoBuyingPower += acc.balance;
        } else {
          // RED DE SEGURIDAD: Cualquier inversión que no sea cripto, suma a la liquidez de GBM.
          gbmBuyingPower += acc.balance;
        }
      } 
      else if (acc.type === 'DEUDA') {
        debt += acc.balance;
        totalCreditLimit += (Number(acc.credit_limit) || Number(acc.creditLimit) || 0);
        debtId = acc.id;
      }
    });

    // ==========================================
    // VALORACIÓN DE ACTIVOS BURSÁTILES
    // ==========================================
    const assetMap: Record<string, string> = {};
    
    allAssets.forEach((asset: any) => {
      assetMap[asset.id] = asset.category;
      const value = asset.totalTitles * asset.averageCost; 
      if (asset.category === 'CRIPTO') cryptoMarketValue += value;
      else gbmMarketValue += value;
    });

    let gbmTotal = gbmBuyingPower + gbmMarketValue;
    let cryptoTotal = cryptoBuyingPower + cryptoMarketValue;

    let tempBank = bank, tempCash = cash, tempDebt = debt;
    let tempGbm = gbmTotal, tempCrypto = cryptoTotal;

    const bankCurve = [bank], cashCurve = [cash], debtCurve = [debt];
    const gbmCurve = [gbmTotal], cryptoCurve = [cryptoTotal];

    // ==========================================
    // RECONSTRUCCIÓN HISTÓRICA INVERSA
    // ==========================================
    const applyReverseCash = (accId: string | null, delta: number) => {
      if (!accId) return;
      const acc = accountMap[accId];
      if (!acc) return;
      
      const name = (acc.name || '').toLowerCase();

      if (acc.type === 'FONDO') {
        if (fundsMap[accId]) fundsMap[accId].tempBalance += delta;
      } else if (acc.type === 'DEUDA') {
        tempDebt += delta;
      } else if (acc.type === 'INVERSION') {
        if (name.includes('crypto') || name.includes('cripto') || name.includes('vault')) tempCrypto += delta;
        else tempGbm += delta; // Red de seguridad histórica
      } else if (acc.type === 'EFECTIVO') {
        if (name.includes('efectivo') || name.includes('caja')) tempCash += delta;
        else tempBank += delta;
      }
    };

    allTx.forEach((tx: any) => {
      if (tx.type === 'DEPOSITO') {
        applyReverseCash(tx.destinationAccountId, -tx.quantity);
      } else if (tx.type === 'RETIRO') {
        applyReverseCash(tx.originAccountId, tx.quantity);
      } else if (tx.type === 'TRANSFERENCIA') {
        applyReverseCash(tx.originAccountId, tx.quantity);
        applyReverseCash(tx.destinationAccountId, -tx.quantity);
      } else if (tx.type === 'COMPRA') {
        applyReverseCash(tx.originAccountId, (tx.quantity * tx.executionPrice) + tx.commission);
        const cat = assetMap[tx.assetId];
        const investedVal = tx.quantity * tx.executionPrice;
        if (cat === 'CRIPTO') tempCrypto -= investedVal;
        else tempGbm -= investedVal;
      } else if (tx.type === 'VENTA') {
        applyReverseCash(tx.destinationAccountId, -(tx.quantity * tx.executionPrice - tx.commission));
        const cat = assetMap[tx.assetId];
        const investedVal = tx.quantity * tx.executionPrice;
        if (cat === 'CRIPTO') tempCrypto += investedVal;
        else tempGbm += investedVal;
      }

      bankCurve.unshift(tempBank);
      cashCurve.unshift(tempCash);
      debtCurve.unshift(tempDebt);
      gbmCurve.unshift(tempGbm);
      cryptoCurve.unshift(tempCrypto);
      
      Object.values(fundsMap).forEach(f => {
        f.history.unshift(f.tempBalance);
      });
    });

    if (bankCurve.length === 1) bankCurve.push(bankCurve[0]);
    if (cashCurve.length === 1) cashCurve.push(cashCurve[0]);
    if (debtCurve.length === 1) debtCurve.push(debtCurve[0]);
    if (gbmCurve.length === 1) gbmCurve.push(gbmCurve[0]);
    if (cryptoCurve.length === 1) cryptoCurve.push(cryptoCurve[0]);
    
    Object.values(fundsMap).forEach(f => {
      const firstNonZero = f.history.findIndex(val => val !== 0);
      if (firstNonZero > 1) f.history = f.history.slice(firstNonZero - 1);
      if (f.history.length === 1) f.history.push(f.history[0]);
    });

    setStats({
      netWorth: bank + cash + gbmTotal + cryptoTotal + debt + totalFundsBalance, 
      bankBalance: bank,
      cashBalance: cash,
      
      totalDebt: debt,
      totalCreditLimit,
      
      totalInvested: gbmTotal + cryptoTotal,
      gbmBuyingPower,
      gbmMarketValue,
      gbmReturnPct: 0, 
      cryptoBuyingPower,
      cryptoMarketValue,
      cryptoReturnPct: 0, 
      historyBank: bankCurve,
      historyCash: cashCurve,
      historyDebt: debtCurve,
      historyGBM: gbmCurve,
      historyCrypto: cryptoCurve,
      funds: Object.values(fundsMap),
      bankId,
      cashId,
      debtId
    });
  }, [isReady, db]);

  useEffect(() => {
    loadStats();
    window.addEventListener('db-update', loadStats);
    return () => window.removeEventListener('db-update', loadStats);
  }, [loadStats]);

  return { stats, refreshStats: loadStats };
};