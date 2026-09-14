import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ShoppingCart, Tag, Wallet, Briefcase, Coins, Zap, Receipt } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, assets } from '../../db/schema';
import { processTrade } from '../../services/tradeService';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';
import { fetchCryptoPriceMXN, fetchStockPriceMXN } from '../../services/marketDataService';

interface Props {
  marketType: 'GBM' | 'CRIPTO';
  onClose: () => void;
}

type OrderType = 'COMPRA' | 'VENTA';

// Tasas de comisión reales
const FEES = {
  GBM: 0.0029,    // 0.25% + IVA
  CRIPTO: 0.0050  // 0.50% promedio
};

export const TradeModal = ({ marketType, onClose }: Props) => {
  const { db, saveDB } = useDB();
  
  const [invAccounts, setInvAccounts] = useState<any[]>([]);
  const [ownedAssets, setOwnedAssets] = useState<any[]>([]);
  
  const [orderType, setOrderType] = useState<OrderType>('COMPRA');
  const [accountId, setAccountId] = useState('');
  const [ticker, setTicker] = useState('');
  
  // Estados bidireccionales de la calculadora
  const [titles, setTitles] = useState(''); 
  const [unitPrice, setUnitPrice] = useState(''); 
  const [subtotalAmount, setSubtotalAmount] = useState(''); 
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  // 1. Oráculo Dual (Auto-Fetch)
  useEffect(() => {
    if (ticker.length >= 3) {
      const getPrice = async () => {
        setIsFetchingPrice(true);
        let price = null;

        if (marketType === 'CRIPTO') {
          price = await fetchCryptoPriceMXN(ticker);
        } else if (marketType === 'GBM') {
          price = await fetchStockPriceMXN(ticker);
        }
        
        if (price !== null && price > 0) {
          setUnitPrice(price.toString());
          
          // Disparar cálculos si ya había títulos o montos escritos
          const t = parseFloat(titles);
          const sub = parseFloat(subtotalAmount);

          if (!isNaN(t) && t > 0) {
            setSubtotalAmount(Number(t * price).toFixed(2));
          } else if (!isNaN(sub) && sub > 0) {
            const newTitles = sub / price;
            setTitles(parseFloat(newTitles.toFixed(8)).toString());
          }
        }
        setIsFetchingPrice(false);
      };

      const timeoutId = setTimeout(() => getPrice(), 800);
      return () => clearTimeout(timeoutId);
    }
  }, [ticker, marketType]);

  // 2. Calculadora Bidireccional en Tiempo Real
  const handleTitlesChange = (val: string) => {
    setTitles(val);
    if (val === '' || val === '.') { setSubtotalAmount(''); return; }
    
    const t = parseFloat(val);
    const u = parseFloat(unitPrice) || 0;
    if (!isNaN(t) && u > 0) setSubtotalAmount(Number(t * u).toFixed(2));
  };

  const handleSubtotalChange = (val: string) => {
    setSubtotalAmount(val);
    if (val === '' || val === '.') { setTitles(''); return; }
    
    const sub = parseFloat(val);
    const u = parseFloat(unitPrice) || 0;
    if (!isNaN(sub) && u > 0) setTitles(parseFloat((sub / u).toFixed(8)).toString());
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    if (val === '' || val === '.') { setSubtotalAmount(''); return; }
    
    const u = parseFloat(val);
    const t = parseFloat(titles) || 0;
    if (!isNaN(u) && t > 0) setSubtotalAmount(Number(t * u).toFixed(2));
  };

  // 3. Cálculos Finales para el Ticket (Comisiones y Netos)
  const feeRate = marketType === 'GBM' ? FEES.GBM : FEES.CRIPTO;
  const subtotalNum = parseFloat(subtotalAmount) || 0;
  const commission = Number((subtotalNum * feeRate).toFixed(2));
  const finalTotal = orderType === 'COMPRA' ? subtotalNum + commission : subtotalNum - commission;

  // Inicialización y Carga de Cuentas
  useEffect(() => {
    if (orderType === 'VENTA' && ownedAssets.length > 0) {
      setTicker(ownedAssets[0].id);
    } else if (orderType === 'COMPRA') {
      setTicker('');
    }
  }, [orderType, ownedAssets]);

  useEffect(() => {
    const loadData = async () => {
      const accs = await db.select().from(accounts);
      const invs = accs.filter((a: any) => a.type === 'INVERSION');
      setInvAccounts(invs);
      
      let targetAcc = invs.find((a: any) => 
        marketType === 'GBM' ? a.name.toLowerCase().includes('inversion') || a.name.toLowerCase().includes('gbm') 
        : a.name.toLowerCase().includes('cripto') || a.name.toLowerCase().includes('crypto')
      );
      if (targetAcc) setAccountId(targetAcc.id);

      const allAssets = await db.select().from(assets);
      const filteredAssets = allAssets.filter((a: any) => (a.category || 'GBM').toUpperCase() === marketType);
      setOwnedAssets(filteredAssets);
    };
    loadData();
  }, [db, marketType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await processTrade(db, {
        type: orderType,
        assetId: ticker,
        category: marketType,
        titles,
        executionPrice: unitPrice,
        accountId
      });

      await saveDB();
      window.dispatchEvent(new Event('db-update'));
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la orden");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAcc = invAccounts.find(a => a.id === accountId);
  const selectedAsset = ownedAssets.find(a => a.id === ticker);
  const AssetIcon = marketType === 'GBM' ? Briefcase : Coins;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            {orderType === 'COMPRA' ? <ShoppingCart className="w-5 h-5 text-emerald-400" /> : <Tag className="w-5 h-5 text-rose-400" />}
            <h2 className={styles.modalTitle}>Orden en {marketType === 'GBM' ? 'GBM+' : 'Cripto'}</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex bg-slate-900/60 p-1 rounded-xl mb-4 border border-slate-800/50">
          <button onClick={() => { setOrderType('COMPRA'); setError(''); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${orderType === 'COMPRA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Comprar</button>
          <button onClick={() => { setOrderType('VENTA'); setError(''); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${orderType === 'VENTA' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Vender</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
          
          {/* LIQUIDEZ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {orderType === 'COMPRA' ? 'Origen de Fondos' : 'Destino de Fondos'}
            </label>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200 text-sm font-bold">{selectedAcc?.name || 'Cargando...'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-widest">Saldo Líquido</span>
                <span className={`${orderType === 'COMPRA' ? 'text-emerald-400' : 'text-slate-300'} font-bold text-sm`}>
                  {selectedAcc ? formatMXN(selectedAcc.balance) : '$0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVO A OPERAR */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {marketType === 'GBM' ? 'Ticker (Símbolo)' : 'Token / Cripto'}
            </label>
            {orderType === 'COMPRA' ? (
              <input type="text" className={styles.input} value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} required placeholder={marketType === 'GBM' ? "Ej. WALMEX" : "Ej. BTC"} />
            ) : (
              <div className="relative">
                <select className={`${styles.input} appearance-none pr-10`} value={ticker} onChange={e => setTicker(e.target.value)} required>
                  {ownedAssets.length === 0 ? <option value="">No tienes activos</option> : ownedAssets.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
                </select>
                {selectedAsset && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <AssetIcon className="w-3 h-3 text-emerald-400" />
                    Disp: <span className="text-emerald-400">{selectedAsset.totalTitles ?? selectedAsset.total_titles}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRECIO UNITARIO */}
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Precio Unitario (Mercado)
              </label>
              {ticker.length >= 3 && (
                <span className={`text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 ${isFetchingPrice ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                  <Zap className="w-2.5 h-2.5" /> 
                  {isFetchingPrice ? 'Buscando API...' : 'Oráculo'}
                </span>
              )}
            </div>
            <input 
              type="number" step="any" min="0" 
              className={`${styles.input} ${isFetchingPrice ? 'border-amber-500/50 text-amber-100' : ''}`} 
              value={unitPrice} onChange={e => handleUnitPriceChange(e.target.value)} required 
              placeholder="Ej. 62.50" 
            />
          </div>

          {/* CANTIDAD Y SUBTOTAL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {marketType === 'GBM' ? 'Títulos' : 'Cantidad (Tokens)'}
              </label>
              <input type="number" step="any" min="0" max={orderType === 'VENTA' && selectedAsset ? (selectedAsset.totalTitles ?? selectedAsset.total_titles) : undefined} className={styles.input} value={titles} onChange={e => handleTitlesChange(e.target.value)} required placeholder={marketType === 'GBM' ? "Ej. 10" : "Ej. 0.05"} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">
                {orderType === 'COMPRA' ? 'Monto Activos' : 'Monto Venta'}
              </label>
              <input type="number" step="any" min="0" className={styles.input} value={subtotalAmount} onChange={e => handleSubtotalChange(e.target.value)} required placeholder="$ 0.00" />
            </div>
          </div>

          {/* DESGLOSE FINANCIERO (TICKET) */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 mt-2">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800/50">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Receipt className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Comisión del Broker ({(feeRate * 100).toFixed(2)}%)
                </span>
              </div>
              <span className={`text-[11px] font-bold ${orderType === 'COMPRA' ? 'text-rose-400' : 'text-rose-400'}`}>
                - {formatMXN(commission)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">
                {orderType === 'COMPRA' ? 'Total A Pagar' : 'Neto A Recibir'}
              </span>
              <span className={`font-bold text-xl tracking-tight ${orderType === 'COMPRA' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {orderType === 'VENTA' && finalTotal > 0 ? '+' : ''}{formatMXN(finalTotal)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 flex items-start gap-2 mt-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 text-xs font-semibold leading-tight">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSaving || !accountId || (orderType === 'VENTA' && ownedAssets.length === 0) || !unitPrice || !titles} className={`${styles.submitBtn} mt-2 flex justify-center items-center gap-2 ${orderType === 'COMPRA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {isSaving ? 'Procesando...' : `Confirmar Operación`}
          </button>
        </form>
      </div>
    </div>
  );
};