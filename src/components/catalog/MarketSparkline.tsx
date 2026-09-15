import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

export const MarketSparkline = ({ data, color }: { data: number[], color: string }) => {
  const safeData = data.length > 1 ? data : [0, 0];
  const chartData = safeData.map(val => ({ value: val }));
  
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const padding = (max - min) * 0.1 || 1;

  const cleanColor = color.replace('#', '');
  const glowId = `neon-glow-${cleanColor}`;
  const gradientId = `neon-gradient-${cleanColor}`;

  return (
    <div className="w-full h-32 -mx-2"> {/* Altura generosa y márgenes negativos para expandir */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, bottom: 0, left: 0, right: 0 }}>
          <defs>
            {/* Filtro para el resplandor de la línea */}
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Gradiente translúcido */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <YAxis domain={[min - padding, max + padding]} hide />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            filter={`url(#${glowId})`}
            isAnimationActive={true}
            animationDuration={1500} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};