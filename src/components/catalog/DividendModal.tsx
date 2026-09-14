import React, { useState, useEffect } from 'react';
import { X, AlertCircle, HandCoins, Wallet } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, assets } from '../../db/schema';
import { processDividend } from '../../services/tradeService';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';

interface Props {
  marketType: 'GBM' | 'CRIPTO';
  onClose: () => void;
}

export const DividendModal = ({ marketType, onClose }: Props) => {
  const { db, saveDB } = useDB();
  
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState(0);
  const [ownedAssets, setOwnedAssets] = useState<any[]>([]);
  
  const [ticker, setTicker] = useState('');
  const [amount, setAmount] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

useEffect(() => {
    const loadData = async () => {
      // 1. Cargar la cuenta destino (Radar inteligente)
      const accs = await db.select().from(accounts);
      const invs = accs.filter((a: any) => a.type === 'INVERSION');
      
      let targetAcc;
      if (marketType === 'GBM') {
        targetAcc = invs.find((a: any) => a.name.toLowerCase().includes('inversion') || a.name.toLowerCase().includes('gbm'));
      } else {
        targetAcc = invs.find((a: any) => a.name.toLowerCase().includes('cripto') || a.name.toLowerCase().includes('crypto'));
      }
      
      if (targetAcc) {
        setAccountId(targetAcc.id);
        setAccountName(targetAcc.name);
        setAccountBalance(targetAcc.balance);
      }

      // 2. Cargar activos para cobrar (Solo los que posees en ese mercado)
      const allAssets = await db.select().from(assets);
      const filteredAssets = allAssets.filter((a: any) => (a.category || 'GBM').toUpperCase() === marketType);
      setOwnedAssets(filteredAssets);
      if (filteredAssets.length > 0) setTicker(filteredAssets[0].id);
    };
    loadData();
  }, [db, marketType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await processDividend(db, { accountId, assetId: ticker, amount });
      await saveDB();
      window.dispatchEvent(new Event('db-update'));
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar el dividendo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2 text-emerald-400">
            <HandCoins className="w-5 h-5" />
            <h2 className={styles.modalTitle}>Cobrar Rendimientos</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-5">
          <p className="text-emerald-400/90 text-[10px] uppercase font-bold tracking-wide">Flujo de Efectivo</p>
          <p className="text-emerald-400/70 text-xs mt-1 leading-tight">
            Este dinero se sumará directamente a tu liquidez disponible sin alterar tus títulos ni tu costo promedio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destino del Efectivo</label>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200 text-sm font-bold">{accountName || 'Cargando...'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-widest">Saldo Actual</span>
                <span className="text-slate-300 font-bold text-sm">{formatMXN(accountBalance)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Instrumento
              </label>
              <select className={styles.input} value={ticker} onChange={e => setTicker(e.target.value)} required>
                {ownedAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.id}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Monto Depositado</label>
              <input type="number" step="any" min="0" className={`${styles.input} border-emerald-500/30 focus:border-emerald-500 text-emerald-400 font-bold`} value={amount} onChange={e => setAmount(e.target.value)} required placeholder="$ 0.00" />
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 flex items-start gap-2 mt-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 text-xs font-semibold leading-tight">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSaving || !accountId || ownedAssets.length === 0} className={`${styles.submitBtn} mt-2 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed`}>
            {isSaving ? 'Acreditando...' : 'Confirmar Ingreso'}
          </button>
        </form>
      </div>
    </div>
  );
};