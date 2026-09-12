import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft } from 'lucide-react';
import { formatMXN, formatDate } from '../../utils/formatters';

interface Props {
  transactions: any[];
}

export const RecentTransactions = ({ transactions }: Props) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 flex justify-center">
        <span className="text-slate-500 text-sm">Aún no hay movimientos registrados.</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-5 mb-6">
      <div className="flex justify-between items-center mb-4 ml-1">
        <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
          Últimos Movimientos
        </h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {transactions.map(tx => {
          // Clasificación para la interfaz
          const isIncome = tx.type === 'DEPOSITO';
          const isExpense = tx.type === 'RETIRO' || tx.type === 'COMPRA';
          const isTransfer = tx.type === 'TRANSFERENCIA';

          // Asignación dinámica de colores y signos
          const sign = isIncome ? '+' : (isExpense ? '-' : '');
          const amountColor = isIncome ? 'text-emerald-400' : (isExpense ? 'text-slate-100' : 'text-blue-400');
          const iconBg = isIncome ? 'bg-emerald-500/10 text-emerald-400' : (isExpense ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400');

          return (
            <div key={tx.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-900/40 border border-slate-800/50 hover:bg-slate-900/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border border-white/5 ${iconBg}`}>
                  {isIncome && <ArrowDownToLine className="w-4 h-4" />}
                  {isExpense && <ArrowUpFromLine className="w-4 h-4" />}
                  {isTransfer && <ArrowRightLeft className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-200 text-sm font-semibold capitalize">
                    {tx.concept || tx.type.toLowerCase()}
                  </span>
                  <span className="text-slate-500 text-[10px] mt-0.5">
                    {formatDate(tx.timestamp)}
                  </span>
                </div>
              </div>
              <span className={`font-bold text-sm ${amountColor}`}>
                {sign}{formatMXN(tx.quantity)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};