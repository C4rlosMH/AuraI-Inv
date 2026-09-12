import React from 'react';

export const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  // Si no hay datos históricos suficientes, proyectamos el saldo actual como una línea plana
  const safeData = data.length > 1 ? data : (data.length === 1 ? [data[0], data[0]] : [0, 0]);
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1; // Evita división por cero
  
  const points = safeData.map((d, i) => `${(i / (safeData.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-12 overflow-visible" preserveAspectRatio="none">
      <polyline 
        fill="none" 
        stroke={color} 
        strokeWidth="3" 
        points={points} 
        vectorEffect="non-scaling-stroke" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};