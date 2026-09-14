import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatMXN } from '../../utils/formatters';

interface Props {
  data: any[];
  showBalance: boolean;
}

export const NetWorthChart = ({ data, showBalance }: Props) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-28 w-full opacity-90"> {/* Quitamos el margin-top para que encaje en la tarjeta */}
      <ResponsiveContainer width="100%" height="100%">
        {/* Añadimos un pequeño margen superior interno para que la línea no se corte arriba */}
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="id" hide />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                // Forzamos zona horaria UTC para evitar desfasajes en los días
                const dateStr = new Date(payload[0].payload.id).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
                return (
                  <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-widest">{dateStr}</p>
                    <p className="text-sm text-sky-400 font-bold tracking-tight">
                      {showBalance ? formatMXN(Number(payload[0].value) || 0) : '***'}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#38bdf8"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorNetWorth)"
            activeDot={{ r: 5, fill: "#38bdf8", stroke: "#0f172a", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};