import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, AlertCircle, ShoppingCart, Tag, Wallet } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts } from '../../db/schema';
import { processTrade } from '../../services/tradeService';
import currency from 'currency.js';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';

interface Props {
  marketType: 'GBM' | 'CRIPTO'; // <-- El contexto inyectado desde el Catálogo
  onClose: () => void;
}

type OrderType = 'COMPRA' | 'VENTA';

export const TradeModal = ({ marketType, onClose }: Props) => {
  const { db, saveDB } = useDB();
  const [invAccounts, setInvAccounts] = useState<any[]>([]);
  
  const [orderType, setOrderType] = useState<OrderType>('COMPRA');
  const [accountId, setAccountId] = useState('');
  const [ticker, setTicker] = useState('');
  const [titles, setTitles] = useState('');
  const [executionPrice, setExecutionPrice] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-selección inteligente de cuenta basada en el tab activo
  useEffect(() => {
    const loadAccounts = async () => {
      const accs = await db.select().from(accounts);
      const invs = accs.filter((a: any) => a.type === 'INVERSION');
      setInvAccounts(invs);
      
      let targetAcc;
      if (marketType === 'GBM') {
        targetAcc = invs.find((a: any) => a.name.toLowerCase().includes('inversion') || a.name.toLowerCase().includes('gbm'));
      } else {
        targetAcc = invs.find((a: any) => a.name.toLowerCase().includes('cripto') || a.name.toLowerCase().includes('crypto'));
      }
      
      if (targetAcc) setAccountId(targetAcc.id);
    };
    loadAccounts();
  }, [db, marketType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await processTrade(db, {
        type: orderType,
        assetId: ticker,
        category: marketType, // Se inyecta la categoría automáticamente
        titles,
        executionPrice,
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
  const estimatedTotal = currency(parseFloat(titles) || 0).multiply(parseFloat(executionPrice) || 0).value;

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

        {/* Toggle Compra/Venta */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl mb-4 border border-slate-800/50">
          <button 
            onClick={() => { setOrderType('COMPRA'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${orderType === 'COMPRA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Comprar
          </button>
          <button 
            onClick={() => { setOrderType('VENTA'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${orderType === 'VENTA' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Vender
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
          
          {/* Tarjeta de Liquidez Bloqueada (Smart UI) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Origen de Fondos</label>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200 text-sm font-bold">{selectedAcc?.name || 'Cargando...'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-widest">Poder de Compra</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedAcc ? formatMXN(selectedAcc.balance) : '$0.00'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {marketType === 'GBM' ? 'Ticker (Símbolo)' : 'Token / Cripto'}
            </label>
            <input 
              type="text" 
              className={styles.input} 
              value={ticker} 
              onChange={e => setTicker(e.target.value.toUpperCase())} 
              required 
              placeholder={marketType === 'GBM' ? "Ej. WALMEX *" : "Ej. BTC"} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {marketType === 'GBM' ? 'Títulos' : 'Cantidad'}
              </label>
              <input type="number" step="any" min="0" className={styles.input} value={titles} onChange={e => setTitles(e.target.value)} required placeholder={marketType === 'GBM' ? "Ej. 10" : "Ej. 0.05"} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Precio Ejecución</label>
              <input type="number" step="any" min="0" className={styles.input} value={executionPrice} onChange={e => setExecutionPrice(e.target.value)} required placeholder="Ej. 136.65" />
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-y border-slate-800/50 mt-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Monto Total</span>
            <span className={`font-bold text-xl tracking-tight ${orderType === 'COMPRA' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatMXN(estimatedTotal)}
            </span>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 flex items-start gap-2 mt-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 text-xs font-semibold leading-tight">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSaving || !accountId} className={`${styles.submitBtn} mt-2 flex justify-center items-center gap-2 ${orderType === 'COMPRA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {isSaving ? 'Procesando...' : `Confirmar ${orderType}`}
          </button>
        </form>
      </div>
    </div>
  );
};