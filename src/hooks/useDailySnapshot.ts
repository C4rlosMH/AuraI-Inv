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
    if (!isReady || !db || stats.netWorth === 0 || hasRun.current) return;

    const checkAndSaveSnapshot = async () => {
      try {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; 
        const timestamp = today.getTime();

        const existing = await db.select().from(netWorthHistory).where(eq(netWorthHistory.id, dateString));
        
        if (existing.length === 0) {
          await db.insert(netWorthHistory).values({
            id: dateString,
            date: timestamp,
            totalEfectivo: stats.bankBalance + stats.cashBalance,
            totalInversiones: stats.gbmMarketValue + stats.gbmBuyingPower,
            totalCripto: stats.cryptoMarketValue + stats.cryptoBuyingPower,
            netWorth: stats.netWorth
          });
          
          console.log(`Snapshot diario guardado para ${dateString}: $${stats.netWorth}`);
          
          // ---> ESTA ES LA LÍNEA QUE FALTABA <---
          // Obliga a usePortfolioStats a recargar la info y actualizar la gráfica instantáneamente
          window.dispatchEvent(new Event('db-update'));
        }
        
        hasRun.current = true;
      } catch (error) {
        console.error("Error ejecutando el snapshot diario:", error);
      }
    };

    checkAndSaveSnapshot();
  }, [isReady, db, stats.netWorth]);
};