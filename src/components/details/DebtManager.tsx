import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, CreditCard, Plus } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, transactions } from '../../db/schema';
import { eq, desc, or, inArray } from 'drizzle-orm';
import { formatMXN, formatDate } from '../../utils/formatters';
import { EditAccountModal } from './EditAccountModal';
import { NewCreditModal } from './NewCreditModal';

interface Props {
  onBack: () => void;
}

export const DebtManager = ({ onBack }: Props) => {
  const { db } = useDB();
  const [debtAccounts, setDebtAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  const loadData = async () => {
    // Extraer TODAS las cuentas de crédito/deuda
    const accs = await db.select().from(accounts).where(eq(accounts.type, 'DEUDA'));
    setDebtAccounts(accs);

    if (accs.length > 0) {
      const ids = accs.map((a: any) => a.id);
      // Extraer historial donde se haya usado CUALQUIER tarjeta de crédito
      const txs = await db.select()
        .from(transactions)
        .where(or(
          inArray(transactions.originAccountId, ids),
          inArray(transactions.destinationAccountId, ids)
        ))
        .orderBy(desc(transactions.timestamp));
      setHistory(txs);
    }
  };

  useEffect(() => {
    loadData();
  }, [db]);

  const totalDebt = debtAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  // Leemos ambas propiedades por seguridad
  const totalLimit = debtAccounts.reduce((sum, acc) => sum + (Number(acc.creditLimit) || Number(acc.credit_limit) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto animate-fade-in">
      <div className="max-w-md mx-auto min-h-screen bg-slate-950 relative">
        
        {/* Cabecera */}
        <div className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4 flex items-center gap-3 z-10">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-800/50 text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-slate-300 font-semibold tracking-wide">Gestión de Créditos</span>
        </div>

        {/* Resumen Global */}
        <div className="p-6 flex flex-col items-center border-b border-slate-800/30 bg-gradient-to-b from-slate-900/50 to-transparent">
          <span className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-2">
            Deuda Global Actual
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-rose-400">
            {formatMXN(totalDebt)}
          </h1>
          <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Límite Combinado:</span>
            <span className="text-emerald-400 font-semibold">{formatMXN(totalLimit)}</span>
          </div>
        </div>

        {/* Tarjetas Individuales (Aquí puedes editar cada una por separado) */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-3 ml-1">
            <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase">
              Mis Tarjetas ({debtAccounts.length})
            </h3>
            <button 
              onClick={() => setIsAddingAccount(true)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors border border-emerald-500/20"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {debtAccounts.map(acc => (
              <div key={acc.id} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-bold text-sm">{acc.name}</p>
                    <div className="flex gap-2 text-[10px] mt-0.5">
                      <span className="text-rose-400 font-medium">Uso: {formatMXN(Math.abs(acc.balance))}</span>
                      <span className="text-slate-600">•</span>
                      {/* Leemos ambas propiedades aquí también */}
                      <span className="text-emerald-400 font-medium">Tope: {formatMXN(acc.creditLimit || acc.credit_limit || 0)}</span>
                    </div>
                  </div>
                </div>
                {/* Botón para editar esta tarjeta específica */}
                <button 
                  onClick={() => setEditingAccount(acc)}
                  className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Historial Global de Crédito */}
        <div className="p-4 pb-20">
          <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 ml-1">
            Historial de Crédito
          </h3>
          {history.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-4">No hay movimientos registrados.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map(tx => {
                const isExpense = tx.type === 'RETIRO' || (tx.type === 'TRANSFERENCIA' && tx.originAccountId !== null && debtAccounts.some(a => a.id === tx.originAccountId));
                const sign = isExpense ? '-' : '+';
                const color = isExpense ? 'text-slate-100' : 'text-emerald-400';
                return (
                  <div key={tx.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-900/30 border border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-slate-200 text-sm font-semibold">{tx.concept || tx.type}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-slate-500 text-[10px]">{formatDate(tx.timestamp)}</span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span className="text-slate-400 text-[9px] font-bold tracking-wider uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                          {tx.category || tx.type}
                        </span>
                      </div>
                    </div>
                    <span className={`font-bold ${color}`}>
                      {sign}{formatMXN(tx.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Renderizar Modal de Edición si se seleccionó una tarjeta */}
      {editingAccount && (
        <EditAccountModal 
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSuccess={() => {
            setEditingAccount(null);
            loadData();
            window.dispatchEvent(new Event('db-update')); 
          }}
        />
      )}
      {/* Renderizar Modal de Nueva Cuenta */}
      {isAddingAccount && (
        <NewCreditModal 
          onClose={() => setIsAddingAccount(false)}
          onSuccess={() => {
            setIsAddingAccount(false);
            loadData();
            window.dispatchEvent(new Event('db-update')); 
          }}
        />
      )}
    </div>
  );
};