import React from 'react';
import { formatMXN } from '../../utils/formatters';
import { Sparkline } from './Sparkline';

interface Props {
  label: string;
  amount: number;
  color: string;
  isDebt?: boolean;
  showBalance?: boolean;
  history?: number[]; // <-- Añadimos la propiedad opcional
  onClick: () => void; // <-- Añadimos la propiedad onClick
}

export const SummaryCard = ({ label, amount, color, isDebt = false, showBalance = true, history = [], onClick }: Props) => {
  return (
    <div onClick={onClick} className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 cursor-pointer hover:bg-slate-900/80 transition-colors">
      <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase block mb-1">
        {label}
      </span>
      <div className={`mt-1 mb-4 font-semibold text-lg ${isDebt ? 'text-rose-500' : 'text-white'}`}>
        {showBalance ? formatMXN(amount) : '***'}
      </div>
      {/* Pasamos el historial si existe, de lo contrario usamos el monto actual */}
      <Sparkline data={history.length > 0 ? history : [amount]} color={color} />
    </div>
  );
};