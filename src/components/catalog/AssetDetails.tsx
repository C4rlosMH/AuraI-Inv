import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, ShoppingCart, Tag, HandCoins, Briefcase, Coins } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { assets, transactions } from '../../db/schema';
import { desc } from 'drizzle-orm';
import currency from 'currency.js';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';
import { MarketSparkline } from './MarketSparkline';

interface Props {
  assetId: string;
  marketType: 'GBM' | 'CRIPTO';
  onBack: () => void;
  onEdit: () => void;
}

export const AssetDetails = ({ assetId, marketType, onBack, onEdit }: Props) => {
  const { db } = useDB();
  const [asset, setAsset] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [assetId, db]);

  const loadData = async () => {
    const allAssets = await db.select().from(assets);
    const currentAsset = allAssets.find((a: any) => a.id === assetId);
    setAsset(currentAsset);

    const allTxs = await db.select().from(transactions).orderBy(desc(transactions.timestamp));
    const assetTxs = allTxs.filter((tx: any) => {
      if (tx.concept && tx.concept.includes(' | ')) {
        const parts = tx.concept.split(' | ');
        return parts[1] === assetId; 
      }
      return false;
    });
    setHistory(assetTxs);
  };

  const generateChartData = (startPrice: number, endPrice: number) => {
    const points = [];
    const steps = 24; 
    const volatility = ((startPrice + endPrice) / 2) * 0.02; 
    
    for (let i = 0; i <= steps; i++) {
      if (i === 0) points.push(startPrice);
      else if (i === steps) points.push(endPrice);
      else {
        const progress = i / steps;
        const base = startPrice + (endPrice - startPrice) * progress;
        const noise = (Math.random() - 0.5) * volatility;
        points.push(base + noise);
      }
    }
    return points;
  };

  const renderTransaction = (tx: any) => {
    const parts = tx.concept.split(' | ');
    const type = parts[0]; 
    const detail = parts[2]; 
    const txAmount = tx.quantity;

    let isIncome = false;
    let icon = <ShoppingCart className="w-4 h-4" />;
    let colorClass = "text-rose-400";
    let bgClass = "bg-rose-500/10";
    let title = "Operación";

    if (type === 'COMPRA') {
      isIncome = false; 
      icon = <ShoppingCart className="w-4 h-4" />;
      colorClass = "text-rose-400";
      bgClass = "bg-rose-500/10";
      title = "Compra de Títulos";
    } else if (type === 'VENTA') {
      isIncome = true; 
      icon = <Tag className="w-4 h-4" />;
      colorClass = "text-emerald-400";
      bgClass = "bg-emerald-500/10";
      title = "Venta de Títulos";
    } else if (type === 'DIVIDENDO') {
      isIncome = true; 
      icon = <HandCoins className="w-4 h-4" />;
      colorClass = "text-emerald-400";
      bgClass = "bg-emerald-500/10";
      title = "Cobro de Dividendo";
    }

    return (
      <div key={tx.id} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border border-white/5 ${bgClass} ${colorClass}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-white font-bold text-sm leading-tight">{title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-500 text-[10px] uppercase font-bold">
                {new Date(tx.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              </span>
              <span className="text-slate-600 text-[9px]">•</span>
              <span className="text-slate-400 text-[9px] font-medium tracking-wide uppercase">{detail}</span>
            </div>
          </div>
        </div>
        <div className={`font-bold text-sm ${colorClass}`}>
          {isIncome ? '+' : '-'}{formatMXN(txAmount)}
        </div>
      </div>
    );
  };

  // 1. EL HOOK ESTÁ AHORA EN UNA ZONA SEGURA (Antes del return temprano)
  // Evaluamos los valores internamente para no fallar si asset es null
  const chartData = useMemo(() => {
    if (!asset) return [];
    const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
    const c = Number(asset.averageCost ?? asset.average_cost) || 0;
    const p = Number(asset.currentPrice ?? asset.current_price) || c; 
    const mkt = currency(t).multiply(p).value;
    const cost = currency(t).multiply(c).value;
    return generateChartData(cost, mkt);
  }, [asset]);

  // 2. RETORNO TEMPRANO AHORA SEGURO
  if (!asset) return null;

  // 3. CONTINUAMOS CON LA LÓGICA DE LA UI
  const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
  const c = Number(asset.averageCost ?? asset.average_cost) || 0;
  const p = Number(asset.currentPrice ?? asset.current_price) || c; 
  const mktValue = currency(t).multiply(p).value;
  const costValue = currency(t).multiply(c).value;
  const returnPct = costValue > 0 ? ((mktValue - costValue) / costValue) * 100 : 0;
  const isPositive = returnPct >= 0;

  const AssetIcon = marketType === 'GBM' ? Briefcase : Coins;
  const themeColor = isPositive ? '#34d399' : '#f43f5e'; 

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        
        {/* HEADER */}
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            <AssetIcon className="w-5 h-5 text-emerald-400" />
            <h2 className={styles.modalTitle}>{asset.id}</h2>
          </div>
          <button onClick={onBack} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MÉTRICAS DEL ACTIVO CON GRÁFICA INCRUSTADA */}
        <div className="flex flex-col items-center justify-center mt-2 mb-2 w-full overflow-hidden">
          <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">
            Valor de Mercado
          </span>
          <h1 className="text-white text-4xl font-bold tracking-tight relative z-10">{formatMXN(mktValue)}</h1>
          
          <div className="w-full -mt-4 opacity-90 relative z-0">
            <MarketSparkline data={chartData} color={themeColor} />
          </div>
          
          <div className="flex items-center gap-3 mt-2 w-full bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 relative z-10">
            <div className="flex-1 text-center border-r border-slate-700/50">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Títulos</span>
              <span className="text-slate-200 text-sm font-bold">{t}</span>
            </div>
            <div className="flex-1 text-center border-r border-slate-700/50">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Costo Promedio</span>
              <span className="text-slate-200 text-sm font-bold">{formatMXN(c)}</span>
            </div>
            <div className="flex-1 text-center">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Plusvalía</span>
              <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* ACCIONES Y KARDEX */}
        <div>
          <div className="flex justify-between items-center mb-4 mt-2">
            <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Historial de Operaciones</h3>
            <button 
              onClick={onEdit}
              className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 bg-slate-800/50 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-slate-700/50 hover:border-emerald-500/20 transition-colors text-[9px] font-bold uppercase tracking-wider"
            >
              <Settings className="w-3.5 h-3.5" /> Ajustar Precio
            </button>
          </div>
          
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[35vh] custom-scrollbar pr-1">
            {history.length === 0 ? (
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center">
                <span className="text-slate-500 text-xs">No hay movimientos registrados para este activo.</span>
              </div>
            ) : (
              history.map(renderTransaction)
            )}
          </div>
        </div>

      </div>
    </div>
  );
};