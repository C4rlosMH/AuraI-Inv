import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings } from 'lucide-react'; // <-- Asegúrate de importar Settings
import { useDB } from '../../db/DBContext';
import { accounts, transactions } from '../../db/schema';
import { eq, desc, or } from 'drizzle-orm';
import { formatMXN, formatDate } from '../../utils/formatters';
import { EditAccountModal } from '../../components/details/EditAccountModal'; // <-- Importa el nuevo modal

interface Props {
  accountId: string;
  onBack: () => void;
}

export const AccountDetails = ({ accountId, onBack }: Props) => {
  const { db } = useDB();
  const [account, setAccount] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false); // <-- Estado para el modal

  const loadData = async () => {
    const accResult = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (accResult.length > 0) setAccount(accResult[0]);

    const txResult = await db.select()
      .from(transactions)
      .where(or(eq(transactions.originAccountId, accountId), eq(transactions.destinationAccountId, accountId)))
      .orderBy(desc(transactions.timestamp));
    setHistory(txResult);
  };

  useEffect(() => {
    loadData();
  }, [accountId, db]);

  if (!account) return null;

  const isDebt = account.type === 'DEUDA';
  const displayBalance = isDebt ? Math.abs(account.balance) : account.balance;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto animate-fade-in">
      <div className="max-w-md mx-auto min-h-screen bg-slate-950 relative">
        
        {/* Cabecera pegajosa */}
        <div className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4 flex items-center justify-between z-10">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-800/50 text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-slate-300 font-semibold tracking-wide">{account.name}</span>
          
          {/* BOTÓN DE EDICIÓN */}
          <button 
            onClick={() => setIsEditing(true)} 
            className="p-2 -mr-2 rounded-full hover:bg-slate-800/50 text-slate-400 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Superior */}
        <div className="p-6 flex flex-col items-center border-b border-slate-800/30 bg-gradient-to-b from-slate-900/50 to-transparent">
          <span className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-2">
            {isDebt ? 'Deuda Actual' : 'Saldo Disponible'}
          </span>
          <h1 className={`text-4xl font-bold tracking-tight ${isDebt ? 'text-rose-400' : 'text-slate-100'}`}>
            {formatMXN(displayBalance)}
          </h1>
          
          {isDebt && account.credit_limit && (
            <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs">
              <span className="text-slate-400">Límite Total:</span>
              <span className="text-slate-200 font-semibold">{formatMXN(account.credit_limit)}</span>
            </div>
          )}
        </div>

        {/* ... Resto de tu código (Lista de Historial) ... */}

      </div>

      {/* Modal Renderizado */}
      {isEditing && (
        <EditAccountModal 
          account={account}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            loadData(); // Refresca los datos locales
            window.dispatchEvent(new Event('db-update')); // Avisa al Home que se recalcule el Net Worth
          }}
        />
      )}
    </div>
  );
};