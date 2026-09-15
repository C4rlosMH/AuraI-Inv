import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

export const CreditSparkline = ({ data, color, totalLimit }: { data: number[], color: string, totalLimit: number }) => {
  const safeData = data.length > 1 ? data : (data.length === 1 ? [data[0], data[0]] : [0, 0]);
  
  const chartData = safeData.map((val) => ({
    value: val
  }));

  const gradientId = `credit-gradient-${color.replace('#', '')}`;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Para el crédito, podemos anclar el máximo al límite total para mayor precisión visual */}
          <YAxis 
            domain={[0, totalLimit || 'auto']} 
            hide 
          />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3} 
            fillOpacity={1} 
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};