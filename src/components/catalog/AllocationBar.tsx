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

// Mapeo exacto de tus clases de Tailwind a Hexadecimales para el SVG
const HEX_COLORS: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
  'bg-cyan-500': '#06b6d4',
  'bg-indigo-500': '#6366f1',
  'bg-slate-600': '#475569', // Color neutro para "Otros"
};

const MosaicBlock = (props: any) => {
  const { x, y, width, height, name, value, depth } = props;
  
  if (depth === 0 || !name) return null;

  const dotColor = props.dotColor || (props.payload && props.payload.dotColor);
  const fill = HEX_COLORS[dotColor] || '#10b981';
  
  if (width < 10 || height < 10) return null;

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
        rx={10}
        style={{ filter: `drop-shadow(0px 0px 8px ${fill}50)` }}
        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
      />
      
      {width > 60 && height > 50 && (
        <>
          <text 
            x={x + width / 2} 
            y={y + height / 2 - 4} 
            textAnchor="middle" 
            fill="#f8fafc" 
            fontSize={12} 
            fontWeight="bold" 
            className="tracking-widest"
          >
            {name}
          </text>
          <text 
            x={x + width / 2} 
            y={y + height / 2 + 14} 
            textAnchor="middle" 
            fill={fill} 
            fontSize={11} 
            fontWeight="bold"
          >
            {value.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
};

export const AllocationBar = ({ data }: AllocationBarProps) => {
  if (!data || data.length === 0) return null;

  const MAX_DISPLAY = 6;

  // 1. Ordenamos los activos de mayor a menor peso porcentual
  const sortedData = [...data].sort((a, b) => b.pct - a.pct);

  let treeData = [];

  if (sortedData.length <= MAX_DISPLAY) {
    // Si tienes 6 o menos activos, los mostramos todos de forma individual
    treeData = sortedData.map(d => ({
      name: d.id,
      value: d.pct,
      dotColor: d.dotColor
    }));
  } else {
    // 2. Si superas los 6 activos, extraemos estrictamente el Top 6
    const topAssets = sortedData.slice(0, MAX_DISPLAY).map(d => ({
      name: d.id,
      value: d.pct,
      dotColor: d.dotColor
    }));

    // 3. Agrupamos y sumamos el porcentaje de todo el resto en una sola métrica
    const othersValue = sortedData
      .slice(MAX_DISPLAY)
      .reduce((acc, curr) => acc + curr.pct, 0);

    const remainingCount = sortedData.length - MAX_DISPLAY;

    // 4. Añadimos el bloque consolidado de "Otros" al final del arreglo
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
    <div className="w-full h-44 mt-4 animate-fade-in relative z-10">
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