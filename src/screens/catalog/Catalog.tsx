import React, { useState, useEffect } from 'react';
import { Briefcase, Coins, TrendingUp, TrendingDown, ShoppingCart, Settings, X, HandCoins, ArrowUp, ArrowDown, Wallet, RefreshCw } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { assets, accounts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { styles } from '../home/Home.styles';
import { formatMXN } from '../../utils/formatters';

// Componentes Inteligentes
import { TradeModal } from '../../components/catalog/TradeModal';
import { DividendModal } from '../../components/catalog/DividendModal';
import { AssetDetails } from '../../components/catalog/AssetDetails';
import { AllocationBar } from '../../components/catalog/AllocationBar'; // <-- IMPORTACIÓN CORRECTA
import { syncPortfolioPrices } from '../../services/marketDataService';

// Paleta de colores para la barra de diversificación
const CHART_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];

export default function Catalog() {
  const { db, saveDB, isReady } = useDB();
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'GBM' | 'CRIPTO'>('GBM');
  const [tabLiquidity, setTabLiquidity] = useState(0); 
  
  // Modales
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showDividendModal, setShowDividendModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // Ajuste Manual
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState('GBM');
  const [titles, setTitles] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const loadPortfolio = async () => {
    if (!isReady || !db) return;
    
    // 1. Cargar Activos
    const data = await db.select().from(assets);
    setPortfolio(data);

    // 2. Cargar Liquidez Dinámica del Tab Actual
    const accs = await db.select().from(accounts);
    const targetAcc = accs.find((a: any) => 
      a.type === 'INVERSION' && 
      (activeTab === 'GBM' 
        ? a.name.toLowerCase().includes('inversion') || a.name.toLowerCase().includes('gbm') 
        : a.name.toLowerCase().includes('cripto') || a.name.toLowerCase().includes('crypto')
      )
    );
    setTabLiquidity(targetAcc ? targetAcc.balance : 0);
  };

  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      await syncPortfolioPrices(db);
      await loadPortfolio(); 
      window.dispatchEvent(new Event('db-update')); 
    } catch (error) {
      console.error("Error sincronizando precios:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
    window.addEventListener('db-update', loadPortfolio);
    return () => window.removeEventListener('db-update', loadPortfolio);
  }, [isReady, db, activeTab]);

  const filteredPortfolio = portfolio.filter(a => (a.category || 'GBM').toUpperCase() === activeTab);

  // MATEMÁTICA WEB3 (ALTA PRECISIÓN SIN CURRENCY.JS)
  const tabMarketValue = filteredPortfolio.reduce((acc, asset) => {
    const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
    const c = Number(asset.averageCost ?? asset.average_cost) || 0;
    const p = Number(asset.currentPrice ?? asset.current_price) || c; 
    return acc + Number((t * p).toFixed(2));
  }, 0);

  const tabTotalCost = filteredPortfolio.reduce((acc, asset) => {
    const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
    const c = Number(asset.averageCost ?? asset.average_cost) || 0;
    return acc + Number((t * c).toFixed(2));
  }, 0);

  const tabReturn = tabTotalCost > 0 ? ((tabMarketValue - tabTotalCost) / tabTotalCost) * 100 : 0;

  // Pre-cálculo y Optimización (Para encontrar Max y Min)
  const allocationsData = filteredPortfolio.map((asset, idx) => {
    const t = Number(asset.totalTitles ?? asset.total_titles) || 0;
    const c = Number(asset.averageCost ?? asset.average_cost) || 0;
    const p = Number(asset.currentPrice ?? asset.current_price) || c; 
    
    const mktValue = Number((t * p).toFixed(2));
    const costValue = Number((t * c).toFixed(2));
    const returnPct = costValue > 0 ? ((mktValue - costValue) / costValue) * 100 : 0;
    const isPositive = returnPct >= 0;
    const pct = tabMarketValue > 0 ? (mktValue / tabMarketValue) * 100 : 0;
    const dotColor = CHART_COLORS[idx % CHART_COLORS.length];

    return { ...asset, t, c, p, mktValue, costValue, returnPct, isPositive, pct, dotColor };
  });

  const maxPct = allocationsData.length > 1 ? Math.max(...allocationsData.map(a => a.pct)) : -1;
  const minPct = allocationsData.length > 1 ? Math.min(...allocationsData.map(a => a.pct)) : -1;

  // Funciones de control
  const handleOpenEdit = (asset: any) => {
    setTicker(asset.id); setCategory(asset.category); setTitles(asset.t.toString());
    setCurrentPrice(asset.p.toString()); setAverageCost(asset.c.toString());
    setShowSyncModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assetId = ticker.toUpperCase();
      const parsedTitles = parseFloat(titles) || 0;
      const parsedCurrentPrice = parseFloat(currentPrice) || 0;
      const parsedAverageCost = parseFloat(averageCost) || parsedCurrentPrice;

      await db.update(assets).set({
        totalTitles: parsedTitles,
        currentPrice: parsedCurrentPrice,
        averageCost: parsedAverageCost
      }).where(eq(assets.id, assetId));

      await saveDB();
      await loadPortfolio();
      setShowSyncModal(false);
      window.dispatchEvent(new Event('db-update')); 
    } catch (error) {
      console.error("Error al guardar el activo:", error);
    }
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.topHeader}>
        <div className={styles.greeting}>
          {activeTab === 'GBM' ? 'Mercado de Capitales' : 'Billetera Cripto'}
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl mb-6 border border-slate-800/50">
        <button 
          onClick={() => setActiveTab('GBM')}
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'GBM' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Acciones
        </button>
        <button 
          onClick={() => setActiveTab('CRIPTO')}
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'CRIPTO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Criptomonedas
        </button>
      </div>

      {/* DASHBOARD PRINCIPAL Y ASSET ALLOCATION */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 mb-6 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                Valor Actual ({activeTab})
              </span>
              <button 
                onClick={handleSyncPrices} 
                disabled={isSyncing}
                className="text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                title="Actualizar precios de mercado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-white text-3xl font-bold tracking-tight">
                {formatMXN(tabMarketValue)}
              </h1>
              <div className="bg-slate-900/80 border border-slate-700/50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300 text-[10px] font-bold tracking-wide">Disp: {formatMXN(tabLiquidity)}</span>
              </div>
            </div>
          </div>
          
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${tabReturn >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {tabReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {tabReturn > 0 ? '+' : ''}{tabReturn.toFixed(2)}%
          </div>
        </div>
        
        {/* <-- TRUCO DE UI: MÁRGENES NEGATIVOS PARA EXPANDIR A LOS LADOS --> */}
        <div className="-mx-4"> 
          <AllocationBar data={allocationsData} />
        </div>

      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
          Portafolio Detallado
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setShowDividendModal(true)} className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider">
            <HandCoins className="w-3.5 h-3.5" /> Cobrar
          </button>
          <button onClick={() => setShowTradeModal(true)} className="flex items-center gap-1 text-slate-300 bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors text-[10px] font-bold uppercase tracking-wider">
            <ShoppingCart className="w-3.5 h-3.5" /> Operar
          </button>
        </div>
      </div>

      {/* LISTA DE ACTIVOS CON ETIQUETAS MAX/MIN */}
      <div className="flex flex-col gap-3 min-h-[300px]">
        {allocationsData.length === 0 ? (
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center animate-fade-in">
            <span className="text-slate-500 text-xs">No hay activos registrados en {activeTab === 'GBM' ? 'GBM+' : 'Criptomonedas'}.</span>
          </div>
        ) : (
          allocationsData.map((asset) => (
            <div 
              key={asset.id} 
              onClick={() => setSelectedAssetId(asset.id)}
              className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-slate-900/80 hover:border-slate-700 transition-colors group animate-fade-in"
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-1 h-8 rounded-full ${asset.dotColor}`} />
                <div>
                  
                  {/* Fila del Título y Etiquetas */}
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h4 className="text-white font-bold text-sm">{asset.id}</h4>
                    <span className="text-slate-400 text-[10px] font-bold">{asset.pct.toFixed(1)}%</span>
                    
                    {/* Badge: Mayor Peso */}
                    {asset.pct === maxPct && maxPct !== minPct && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ArrowUp className="w-2.5 h-2.5" /> Mayor Peso
                      </span>
                    )}
                    
                    {/* Badge: Menor Peso */}
                    {asset.pct === minPct && maxPct !== minPct && (
                      <span className="bg-slate-800/80 text-slate-400 border border-slate-700 text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ArrowDown className="w-2.5 h-2.5" /> Menor Peso
                      </span>
                    )}
                  </div>
                  
                  <span className="text-slate-500 text-[10px] uppercase font-bold">
                    {asset.t} {activeTab === 'CRIPTO' ? 'Tokens' : 'Títulos'} • Costo: {formatMXN(asset.c)}
                  </span>
                </div>
              </div>
              
              <div className="text-right relative z-10">
                <div className="text-slate-100 font-bold text-sm">{formatMXN(asset.mktValue)}</div>
                <div className={`text-[10px] font-bold mt-0.5 ${asset.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {asset.isPositive ? '+' : ''}{asset.returnPct.toFixed(2)}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALES */}
      {showTradeModal && <TradeModal marketType={activeTab} onClose={() => setShowTradeModal(false)} />}
      {showDividendModal && <DividendModal marketType={activeTab} onClose={() => setShowDividendModal(false)} />}
      
      {/* HISTORIAL DETALLADO */}
      {selectedAssetId && (
        <AssetDetails 
          assetId={selectedAssetId} 
          marketType={activeTab}
          onBack={() => setSelectedAssetId(null)} 
          onEdit={() => {
            const asset = allocationsData.find(a => a.id === selectedAssetId);
            if (asset) handleOpenEdit(asset);
          }} 
        />
      )}

      {/* Sincronizador Manual */}
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total en Posesión</label>
                  <input type="number" step="any" min="0" className={styles.input} value={titles} onChange={e => setTitles(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Costo Promedio ($)</label>
                  <input type="number" step="any" min="0" className={styles.input} value={averageCost} onChange={e => setAverageCost(e.target.value)} required />
                </div>
                <div className={styles.inputGroup}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Precio Actual</label>
                  <input type="number" step="any" min="0" className={styles.input} value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} required />
                </div>
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