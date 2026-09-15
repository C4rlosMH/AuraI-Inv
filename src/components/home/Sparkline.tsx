import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

export const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  // 1. Protección contra arreglos vacíos o de un solo elemento
  const safeData = data.length > 1 ? data : (data.length === 1 ? [data[0], data[0]] : [0, 0]);
  
  // 2. Mapeo estructural para Recharts
  const chartData = safeData.map((val) => ({
    value: val
  }));

  // 3. Cálculo de márgenes dinámicos
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const padding = (max - min) * 0.1 || 1; 

  // Generamos un ID único para el gradiente basado en el color 
  // (evita conflictos si hay múltiples gráficas renderizándose al mismo tiempo)
  const gradientId = `sparkline-gradient-${color.replace('#', '')}`;

  return (
    <div className="w-full h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          {/* Definición de la sombra / gradiente */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <YAxis 
            domain={[min - padding, max + padding]} 
            hide 
          />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3} 
            fillOpacity={1} 
            fill={`url(#${gradientId})`} // Conectamos el gradiente al área
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};