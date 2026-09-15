import React from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';

interface AllocationData {
  id: string;
  pct: number;
  dotColor: string;
}

interface AllocationBarProps {
  data: AllocationData[];
}

const HEX_COLORS: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
  'bg-cyan-500': '#06b6d4',
  'bg-indigo-500': '#6366f1',
  'bg-slate-600': '#475569',
};

const MosaicBlock = (props: any) => {
  const { x, y, width, height, name, value, depth } = props;
  
  if (depth === 0 || !name) return null;

  const dotColor = props.dotColor || (props.payload && props.payload.dotColor);
  const fill = HEX_COLORS[dotColor] || '#10b981';
  
  // Si la caja es absurdamente pequeña (menos de 10px), no renderiza nada
  if (width < 10 || height < 10) return null;

  // 1. Detección Inteligente de Orientación
  const isVertical = height > width * 1.2;
  
  // Redujimos el padding a 8 para no penalizar tanto a las cajas pequeñas
  const padding = 8; 
  const maxLength = isVertical ? height - padding : width - padding; 
  const maxThickness = isVertical ? width - padding : height - padding; 

  // 2. Motor de Multilínea Inteligente (Ignora sufijos bursátiles cortos)
  const words = name.split(' ');
  let line1 = name;
  let line2 = '';
  let isTwoLines = false;

  // Solo dividimos si es largo (> 9 letras) y la última palabra no es un sufijo de 1 o 2 letras (ej. O, *, 12)
  if (words.length > 1 && name.length > 9) {
    const lastWord = words[words.length - 1];
    if (lastWord.length > 2) { 
      isTwoLines = true;
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }
  }

  const maxLineChars = isTwoLines ? Math.max(line1.length, line2.length) : line1.length;
  
  // 3. Algoritmo de Auto-Escalado (Con piso mínimo)
  const lengthConstraint = maxLength / Math.max(1, maxLineChars * 0.55);
  const linesCount = isTwoLines ? 2.5 : 1.8; 
  const thicknessConstraint = maxThickness / linesCount; 
  
  // Calculamos el tamaño ideal, pero le ponemos un tope máximo de 14 y un mínimo de 8.5 para asegurar legibilidad
  const calculatedFontSize = Math.min(lengthConstraint, thicknessConstraint, 14);
  const fontSize = Math.max(calculatedFontSize, 8.5); 
  const pctSize = Math.max(fontSize * 0.85, 8); // El porcentaje es un poco menor, pero nunca baja de 8px

  const cx = x + width / 2;
  const cy = y + height / 2;

  // Solo ocultamos el texto si la caja realmente no da para más (menos de 25px de grosor)
  const showText = maxThickness > 15;

  return (
    <g>
      <rect
        x={x + 3}
        y={y + 3}
        width={width - 6}
        height={height - 6}
        fill={fill}
        fillOpacity={0.15}
        stroke={fill}
        strokeWidth={1.5}
        rx={8}
        style={{ filter: `drop-shadow(0px 0px 8px ${fill}50)` }}
        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
      />
      
      {showText && (
        <g transform={isVertical ? `translate(${cx}, ${cy}) rotate(-90)` : `translate(${cx}, ${cy})`}>
          
          {isTwoLines ? (
            <>
              <text x={0} y={-fontSize * 0.6} textAnchor="middle" fill="#f8fafc" fontSize={fontSize} fontWeight="bold" className="tracking-widest">
                {line1}
              </text>
              <text x={0} y={fontSize * 0.6} textAnchor="middle" fill="#f8fafc" fontSize={fontSize} fontWeight="bold" className="tracking-widest">
                {line2}
              </text>
              <text x={0} y={fontSize * 1.8} textAnchor="middle" fill={fill} fontSize={pctSize} fontWeight="bold">
                {value.toFixed(1)}%
              </text>
            </>
          ) : (
            <>
              <text x={0} y={-2} textAnchor="middle" fill="#f8fafc" fontSize={fontSize} fontWeight="bold" className="tracking-widest">
                {line1}
              </text>
              <text x={0} y={fontSize + 2} textAnchor="middle" fill={fill} fontSize={pctSize} fontWeight="bold">
                {value.toFixed(1)}%
              </text>
            </>
          )}
        </g>
      )}
    </g>
  );
};

export const AllocationBar = ({ data }: AllocationBarProps) => {
  if (!data || data.length === 0) return null;

  const MAX_DISPLAY = 6;
  const sortedData = [...data].sort((a, b) => b.pct - a.pct);

  let treeData = [];

  if (sortedData.length <= MAX_DISPLAY) {
    treeData = sortedData.map(d => ({
      name: d.id,
      value: d.pct,
      dotColor: d.dotColor
    }));
  } else {
    const topAssets = sortedData.slice(0, MAX_DISPLAY).map(d => ({
      name: d.id,
      value: d.pct,
      dotColor: d.dotColor
    }));

    const othersValue = sortedData
      .slice(MAX_DISPLAY)
      .reduce((acc, curr) => acc + curr.pct, 0);

    const remainingCount = sortedData.length - MAX_DISPLAY;

    treeData = [
      ...topAssets,
      {
        name: `Otros (${remainingCount})`,
        value: Number(othersValue.toFixed(1)),
        dotColor: 'bg-slate-600'
      }
    ];
  }

  return (
    <div className="w-full h-60 mt-6 animate-fade-in relative z-10">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treeData}
          dataKey="value"
          content={<MosaicBlock />}
          isAnimationActive={true}
          animationDuration={1200}
        />
      </ResponsiveContainer>
    </div>
  );
};