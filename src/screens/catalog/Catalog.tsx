import React, { useState, useEffect } from 'react';
import { Briefcase, Coins, TrendingUp, TrendingDown, ShoppingCart, Settings, X } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { assets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import currency from 'currency.js';
import { styles } from '../home/Home.styles';
import { formatMXN } from '../../utils/formatters';
import { TradeModal } from '../../components/catalog/TradeModal';

export default function Catalog() {
  const { db, saveDB, isReady } = useDB();
  const [portfolio, setPortfolio] = useState<any[]>([]);
  
  // Nuevo estado para separar los mundos
  const [activeTab, setActiveTab] = useState<'GBM' | 'CRIPTO'>('GBM');
  
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState('GBM');
  const [titles, setTitles] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [averageCost, setAverageCost] = useState('');

  const loadPortfolio = async () => {
    if (!isReady || !db) return;
    const data = await db.select().from(assets);
    setPortfolio(data);
  };

  useEffect(() => {
    loadPortfolio();
    window.addEventListener('db-update', loadPortfolio);
    return () => window.removeEventListener('db-update', loadPortfolio);
  }, [isReady, db]);

  // 1. Aislamos el portafolio según la pestaña seleccionada
  const filteredPortfolio = portfolio.filter(a => (a.category || 'GBM').toUpperCase() === activeTab);

  // 2. La matemática ahora solo suma los activos de la pestaña activa
  const tabMarketValue = filteredPortfolio.reduce((acc, asset) => {
    const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
    const c = Number(asset.averageCost ?? asset.average_cost) || 0;
    const p = Number(asset.currentPrice ?? asset.current_price) || c; 
    return currency(acc).add(currency(t).multiply(p)).value;
  }, 0);

  const tabTotalCost = filteredPortfolio.reduce((acc, asset) => {
    const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
    const c = Number(asset.averageCost ?? asset.average_cost) || 0;
    return currency(acc).add(currency(t).multiply(c)).value;
  }, 0);

  const tabReturn = tabTotalCost > 0 ? ((tabMarketValue - tabTotalCost) / tabTotalCost) * 100 : 0;

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assetId = ticker.toUpperCase();
      const existing = portfolio.find(a => a.id === assetId);

      const parsedTitles = parseFloat(titles) || 0;
      const parsedCurrentPrice = parseFloat(currentPrice) || 0;
      const parsedAverageCost = parseFloat(averageCost) || parsedCurrentPrice;

      if (existing) {
        await db.update(assets).set({
          totalTitles: parsedTitles,
          currentPrice: parsedCurrentPrice,
          averageCost: parsedAverageCost,
          category // Se actualiza la categoría si es necesario
        }).where(eq(assets.id, assetId));
      } else {
        await db.insert(assets).values({
          id: assetId,
          name: assetId,
          symbol: assetId,
          ticker: assetId,
          category,
          totalTitles: parsedTitles,
          averageCost: parsedAverageCost,
          currentPrice: parsedCurrentPrice
        });
      }

      await saveDB();
      await loadPortfolio();
      setShowSyncModal(false);
      window.dispatchEvent(new Event('db-update')); 
    } catch (error) {
      console.error("Error al guardar el activo:", error);
    }
  };

  // Ícono dinámico para la lista
  const AssetIcon = activeTab === 'GBM' ? Briefcase : Coins;

  return (
    <div className={styles.container}>
      
      <div className={styles.topHeader}>
        <div className={styles.greeting}>
          {activeTab === 'GBM' ? 'Mercado de Capitales' : 'Billetera Cripto'}
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl mb-6 border border-slate-800/50">
        <button 
          onClick={() => setActiveTab('GBM')}
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'GBM' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
        >
          GBM+ (Acciones)
        </button>
        <button 
          onClick={() => setActiveTab('CRIPTO')}
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'CRIPTO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Criptomonedas
        </button>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 mb-6 animate-fade-in">
        <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
          Valor Actual ({activeTab})
        </span>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-white text-3xl font-bold tracking-tight">
            {formatMXN(tabMarketValue)}
          </h1>
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${tabReturn >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {tabReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {tabReturn > 0 ? '+' : ''}{tabReturn.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
          Títulos en Posesión
        </h3>
        <button 
          onClick={() => setShowTradeModal(true)} 
          className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Operar
        </button>
      </div>

      <div className="flex flex-col gap-3 min-h-[300px]">
        {filteredPortfolio.length === 0 ? (
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center animate-fade-in">
            <span className="text-slate-500 text-xs">No hay activos registrados en {activeTab === 'GBM' ? 'GBM+' : 'Criptomonedas'}.</span>
          </div>
        ) : (
          filteredPortfolio.map(asset => {
            const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
            const c = Number(asset.averageCost ?? asset.average_cost) || 0;
            const p = Number(asset.currentPrice ?? asset.current_price) || c; 
            
            const mktValue = currency(t).multiply(p).value;
            const costValue = currency(t).multiply(c).value;
            const returnPct = costValue > 0 ? ((mktValue - costValue) / costValue) * 100 : 0;
            const isPositive = returnPct >= 0;

            return (
              <div 
                key={asset.id} 
                className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center group relative overflow-hidden animate-fade-in"
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`p-2.5 rounded-xl border border-white/5 ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <AssetIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{asset.id}</h4>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">
                      {t} {activeTab === 'CRIPTO' ? 'Tokens' : 'Títulos'} • Costo: {formatMXN(c)}
                    </span>
                  </div>
                </div>
                
                <div className="text-right relative z-10 flex items-center gap-3">
                  <div>
                    <div className="text-slate-100 font-bold text-sm">{formatMXN(mktValue)}</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setTicker(asset.id); setCategory(asset.category); setTitles(t.toString());
                      setCurrentPrice(p.toString()); setAverageCost(c.toString());
                      setShowSyncModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showTradeModal && (
        <TradeModal 
          marketType={activeTab} 
          onClose={() => setShowTradeModal(false)} 
        />
      )}

      {showSyncModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Ajuste Manual</h2>
              <button onClick={() => setShowSyncModal(false)} className={styles.closeBtn}><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSaveAsset} className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ticker</label>
                  <input type="text" className={styles.input} value={ticker} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoría</label>
                  <select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="GBM">GBM+</option>
                    <option value="CRIPTO">Criptomonedas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total en Posesión</label>
                  <input type="number" step="any" min="0" className={styles.input} value={titles} onChange={e => setTitles(e.target.value)} required />
                </div>
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Costo Promedio ($)</label>
                  <input type="number" step="any" min="0" className={styles.input} value={averageCost} onChange={e => setAverageCost(e.target.value)} required />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Precio de Mercado (Actual)</label>
                <input type="number" step="any" min="0" className={styles.input} value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} required />
              </div>

              <button type="submit" className={`${styles.submitBtn} bg-slate-700 hover:bg-slate-600 mt-2 flex justify-center items-center`}>
                Forzar Actualización
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}