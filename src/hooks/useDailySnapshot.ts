import { useEffect, useRef } from 'react';
import { useDB } from '../db/DBContext';
import { netWorthHistory } from '../db/schema';
import { eq } from 'drizzle-orm';
import { usePortfolioStats } from './usePortfolioStats';

export const useDailySnapshot = () => {
  const { db, isReady } = useDB();
  const { stats } = usePortfolioStats();
  const hasRun = useRef(false);

  useEffect(() => {
    // Evitar que corra si la DB no está lista, el patrimonio es 0 (aún cargando), o ya corrió en esta sesión
    if (!isReady || !db || stats.netWorth === 0 || hasRun.current) return;

    const checkAndSaveSnapshot = async () => {
      try {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // Ej: '2026-09-15'
        const timestamp = today.getTime();

        // 1. Verificamos si ya existe el snapshot de hoy
        const existing = await db.select().from(netWorthHistory).where(eq(netWorthHistory.id, dateString));
        
        if (existing.length === 0) {
          // 2. Si no existe, guardamos la "fotografía" del patrimonio actual
          await db.insert(netWorthHistory).values({
            id: dateString,
            date: timestamp,
            totalEfectivo: stats.bankBalance + stats.cashBalance,
            totalInversiones: stats.gbmMarketValue + stats.gbmBuyingPower,
            totalCripto: stats.cryptoMarketValue + stats.cryptoBuyingPower,
            netWorth: stats.netWorth
          });
          console.log(`Snapshot diario guardado para ${dateString}: $${stats.netWorth}`);
        }
        
        hasRun.current = true;
      } catch (error) {
        console.error("Error ejecutando el snapshot diario:", error);
      }
    };

    checkAndSaveSnapshot();
  }, [isReady, db, stats.netWorth]);
};