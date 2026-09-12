import React from 'react';

interface Props {
  data: number[];
  color: string;
  totalLimit: number; // Recibe el límite total de la tarjeta
}

export const CreditSparkline = ({ data, color, totalLimit }: Props) => {
  if (!data || data.length === 0) return null;

  const validData = data.map(n => (isNaN(n) ? 0 : n));
  
  // Fijamos el suelo matemático (0 disponibles) y el techo (Límite Total)
  const dataMin = 0;
  const dataMax = totalLimit > 0 ? totalLimit : 1; 
  const range = dataMax - dataMin;

  const height = 40;
  const width = 100;
  const padding = 3; 
  const drawHeight = height - (padding * 2);

  const points = validData.map((val, i) => {
    const x = (i / (validData.length - 1 || 1)) * width;
    
    // Encapsulamos el valor para que jamás rompa el contenedor
    const clampedVal = Math.max(dataMin, Math.min(dataMax, val));
    const normalized = (clampedVal - dataMin) / range;
    
    // Calculamos Y con padding interno
    const y = padding + (drawHeight - (normalized * drawHeight));
    
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-full relative overflow-hidden flex items-end">
      <svg 
        className="w-full h-full"
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" 
        />
      </svg>
    </div>
  );
};