import React, { useState, useEffect } from 'react';
import { Briefcase, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { assets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import currency from 'currency.js';
import { styles } from '../home/Home.styles';
import { formatMXN } from '../../utils/formatters';

export default function Catalog() {
  const { db, saveDB, isReady } = useDB();
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Estados para el Modal de Sincronización
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState('GBM');
  const [titles, setTitles] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [averageCost, setAverageCost] = useState('');

  useEffect(() => {
    if (isReady && db) loadPortfolio();
  }, [isReady, db]);

  const loadPortfolio = async () => {
    const data = await db.select().from(assets);
    setPortfolio(data);
  };

  // Cálculos matemáticos blindados con currency.js
  const totalMarketValue = portfolio.reduce((acc, asset) => 
    currency(acc).add(currency(asset.totalTitles).multiply(asset.currentPrice)).value, 0
  );

  const totalCost = portfolio.reduce((acc, asset) => 
    currency(acc).add(currency(asset.totalTitles).multiply(asset.averageCost)).value, 0
  );

  const globalReturn = totalCost > 0 ? ((totalMarketValue - totalCost) / totalCost) * 100 : 0;

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assetId = ticker.toUpperCase();
      const existing = portfolio.find(a => a.id === assetId);

      const parsedTitles = parseFloat(titles);
      const parsedCurrentPrice = parseFloat(currentPrice);
      const parsedAverageCost = parseFloat(averageCost) || parsedCurrentPrice;

      if (existing) {
        await db.update(assets).set({
          totalTitles: parsedTitles,
          currentPrice: parsedCurrentPrice,
          averageCost: parsedAverageCost,
          category
        }).where(eq(assets.id, assetId));
      } else {
        await db.insert(assets).values({
          id: assetId,
          name: assetId,
          symbol: assetId,
          category,
          totalTitles: parsedTitles,
          averageCost: parsedAverageCost,
          currentPrice: parsedCurrentPrice
        });
      }

      await saveDB();
      await loadPortfolio();
      setShowModal(false);
      
      // Avisamos al Home y al motor estadístico que hubo cambios
      window.dispatchEvent(new Event('db-update')); 
    } catch (error) {
      console.error("Error al guardar el activo:", error);
    }
  };

  // Limpiar el formulario al abrir el modal para un nuevo activo
  const openNewAssetModal = () => {
    setTicker('');
    setCategory('GBM');
    setTitles('');
    setCurrentPrice('');
    setAverageCost('');
    setShowModal(true);
  };

  return (
    <div className={styles.container}>
      {/* 1. Header del Portafolio */}
      <div className={styles.topHeader}>
        <div className={styles.greeting}>Mercado de Capitales</div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 mb-6">
        <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Valor Actual (Trading)</span>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-white text-3xl font-bold tracking-tight">
            {formatMXN(totalMarketValue)}
          </h1>
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${globalReturn >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {globalReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {globalReturn > 0 ? '+' : ''}{globalReturn.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* 2. Lista de Títulos */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Títulos en Posesión</h3>
        <button onClick={openNewAssetModal} className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider">
          <Plus className="w-3.5 h-3.5" /> Sincronizar
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {portfolio.length === 0 ? (
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center">
            <span className="text-slate-500 text-xs">No hay títulos registrados en tu portafolio.</span>
          </div>
        ) : (
          portfolio.map(asset => {
            const mktValue = currency(asset.totalTitles).multiply(asset.currentPrice).value;
            const costValue = currency(asset.totalTitles).multiply(asset.averageCost).value;
            const returnPct = costValue > 0 ? ((mktValue - costValue) / costValue) * 100 : 0;
            const isPositive = returnPct >= 0;

            return (
              <div key={asset.id} onClick={() => {
                setTicker(asset.id); 
                setCategory(asset.category); 
                setTitles(asset.totalTitles.toString());
                setCurrentPrice(asset.currentPrice.toString()); 
                setAverageCost(asset.averageCost.toString());
                setShowModal(true);
              }} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-slate-900/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border border-white/5 ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{asset.id}</h4>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">{asset.totalTitles} Títulos • Costo: {formatMXN(asset.averageCost)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-100 font-bold text-sm">{formatMXN(mktValue)}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Modal de Sincronización de Activo */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Sincronizar Título</h2>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveAsset} className="flex flex-col gap-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ticker (Símbolo)</label>
                  <input type="text" className={styles.input} value={ticker} onChange={e => setTicker(e.target.value)} required placeholder="Ej. GFNORTE O" />
                </div>
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plataforma</label>
                  <select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="GBM">GBM+</option>
                    <option value="CRIPTO">Criptomonedas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Títulos en posesión</label>
                  <input type="number" step="any" min="0" className={styles.input} value={titles} onChange={e => setTitles(e.target.value)} required placeholder="Ej. 1" />
                </div>
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Costo Promedio ($)</label>
                  <input type="number" step="any" min="0" className={styles.input} value={averageCost} onChange={e => setAverageCost(e.target.value)} required placeholder="Ej. 195.50" />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Precio de Mercado (Actual)</label>
                <input type="number" step="any" min="0" className={styles.input} value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} required placeholder="Ej. 199.12" />
              </div>

              <button type="submit" className={`${styles.submitBtn} bg-emerald-600 hover:bg-emerald-700 mt-2 flex justify-center items-center`}>
                Guardar Activo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}