import { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowRightLeft, ShoppingCart, Tag, Wallet, Building2, Briefcase, ArrowLeft, History, HandCoins } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, transactions, assets } from '../../db/schema';
import { desc } from 'drizzle-orm';
import currency from 'currency.js';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';

interface Props {
  accountId: string;
  onBack: () => void;
}

export const AccountDetails = ({ accountId, onBack }: Props) => {
  const { db } = useDB();
  const [account, setAccount] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [assetMap, setAssetMap] = useState<Record<string, string>>({});
  
  // Nuevo interruptor para la vista progresiva
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, [accountId, db]);

  const loadData = async () => {
    const accs = await db.select().from(accounts);
    const currentAcc = accs.find((a: any) => a.id === accountId);
    setAccount(currentAcc);

    const allAssets = await db.select().from(assets);
    const aMap: Record<string, string> = {};
    allAssets.forEach((a: any) => { aMap[a.id] = a.name; });
    setAssetMap(aMap);

    const allTxs = await db.select().from(transactions).orderBy(desc(transactions.timestamp));
    const accountTxs = allTxs.filter((tx: any) => 
      tx.originAccountId === accountId || tx.destinationAccountId === accountId
    );
    setHistory(accountTxs);
  };

  const getAccountIcon = () => {
    if (!account) return <Wallet className="w-6 h-6 text-emerald-400" />;
    if (account.type === 'INVERSION') return <Briefcase className="w-6 h-6 text-emerald-400" />;
    if (account.name.toLowerCase().includes('banco')) return <Building2 className="w-6 h-6 text-emerald-400" />;
    return <Wallet className="w-6 h-6 text-emerald-400" />;
  };

    const renderTransaction = (tx: any) => {
    const isOrigin = tx.originAccountId === accountId;
    
    let isIncome = false;
    let icon = <ArrowRightLeft className="w-4 h-4" />;
    let colorClass = "text-slate-400";
    let bgClass = "bg-slate-800/50";
    let concept = tx.concept;
    let detail = "";
    let txAmount = tx.quantity;

    // 1. Movimientos de Liquidez y Transferencias
    if (tx.type === 'DEPOSITO' || (tx.type === 'TRANSFERENCIA' && !isOrigin)) {
      isIncome = true;
      icon = <ArrowDownRight className="w-4 h-4" />;
      colorClass = "text-emerald-400";
      bgClass = "bg-emerald-500/10";
      detail = tx.type === 'TRANSFERENCIA' ? 'Transferencia Recibida' : 'Ingreso';
    } 
    else if (tx.type === 'RETIRO' || (tx.type === 'TRANSFERENCIA' && isOrigin)) {
      isIncome = false;
      icon = <ArrowUpRight className="w-4 h-4" />;
      colorClass = "text-rose-400";
      bgClass = "bg-rose-500/10";
      detail = tx.type === 'TRANSFERENCIA' ? 'Transferencia Enviada' : 'Gasto';
    }
    // 2. Movimientos Bursátiles (Trading)
    else if (tx.type === 'COMPRA' || tx.type === 'VENTA') {
      isIncome = tx.type === 'VENTA'; 
      icon = isIncome ? <Tag className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />;
      colorClass = isIncome ? "text-emerald-400" : "text-rose-400";
      bgClass = isIncome ? "bg-emerald-500/10" : "bg-rose-500/10";
      
      // Magia contable: Desempaquetamos el string sin saturar la base de datos
      if (tx.concept.includes(' | ')) {
        const parts = tx.concept.split(' | ');
        concept = `${isIncome ? 'Venta' : 'Compra'} de ${parts[1]}`;
        detail = parts[2]; // Ej: "3 títulos a $136.65"
      }
    }
    
    // 3. Dividendos (Flujo de Efectivo Pasivo)
    else if (tx.type === 'DIVIDENDO' || tx.concept.startsWith('DIVIDENDO |')) {
      isIncome = true;
      icon = <HandCoins className="w-4 h-4" />;
      colorClass = "text-emerald-400";
      bgClass = "bg-emerald-500/10";
      
      if (tx.concept.includes(' | ')) {
        const parts = tx.concept.split(' | ');
        concept = `Dividendo de ${parts[1]}`;
        detail = parts[2]; // Ej: "Pago de rendimientos"
      }
    }

    return (
      <div key={tx.id} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border border-white/5 ${bgClass} ${colorClass}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-white font-bold text-sm leading-tight">{concept}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-500 text-[10px] uppercase font-bold">
                {new Date(tx.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              </span>
              {detail && (
                <>
                  <span className="text-slate-600 text-[9px]">•</span>
                  <span className="text-slate-400 text-[9px] font-medium tracking-wide uppercase">{detail}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={`font-bold text-sm ${colorClass}`}>
          {isIncome ? '+' : '-'}{formatMXN(txAmount)}
        </div>
      </div>
    );
  };

  if (!account) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        
        {/* HEADER DINÁMICO */}
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            {showAllHistory ? (
              <button onClick={() => setShowAllHistory(false)} className="mr-1 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : getAccountIcon()}
            <h2 className={styles.modalTitle}>{showAllHistory ? 'Historial Completo' : account.name}</h2>
          </div>
          <button onClick={onBack} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VISTA 1: HISTORIAL COMPLETO */}
        {showAllHistory ? (
          <div className="animate-fade-in pb-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <div className="flex flex-col gap-3 pr-1">
              {history.map(renderTransaction)}
            </div>
          </div>
        ) : (
          /* VISTA 2: DASHBOARD (Balance + Resumen) */
          <div className="animate-fade-in flex flex-col gap-6">
            
            <div className="flex flex-col items-center justify-center mt-2 mb-2">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                {account.type === 'INVERSION' ? 'Liquidez Disponible' : 'Saldo Actual'}
              </span>
              <h1 className="text-white text-4xl font-bold tracking-tight">{formatMXN(account.balance)}</h1>
            </div>

            <div>
              <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-4">Historial Reciente</h3>
              
              <div className="flex flex-col gap-3">
                {history.length === 0 ? (
                  <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center">
                    <span className="text-slate-500 text-xs">No hay movimientos registrados en esta cuenta.</span>
                  </div>
                ) : (
                  history.slice(0, 10).map(renderTransaction)
                )}
              </div>

              {history.length > 0 && (
                <button 
                  onClick={() => setShowAllHistory(true)}
                  className="w-full mt-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 text-slate-300 text-[11px] font-bold uppercase tracking-wider py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  Ver todos los movimientos ({history.length})
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};