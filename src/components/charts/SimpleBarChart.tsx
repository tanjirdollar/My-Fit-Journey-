import React, { useState } from 'react';

export interface BarDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface SimpleBarChartProps {
  data: BarDataPoint[];
  targetValue?: number;
  unit?: string;
  barColor?: string;
  targetLabel?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  targetValue,
  unit = '',
  barColor = '#10b981',
  targetLabel,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-800/70 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
        No weekly log data available yet.
      </div>
    );
  }

  const width = 450;
  const height = 150;
  const paddingX = 30;
  const paddingY = 24;

  const maxVal = Math.max(...data.map((d) => d.value), targetValue || 0, 10);
  const barWidth = Math.max(14, Math.min(32, (width - 2 * paddingX) / data.length - 12));

  const getY = (val: number) => {
    return height - paddingY - (val / maxVal) * (height - 2 * paddingY);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 sm:h-40 overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Target line */}
        {targetValue !== undefined && (
          <g>
            <line
              x1={paddingX}
              y1={getY(targetValue)}
              x2={width - paddingX}
              y2={getY(targetValue)}
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={width - paddingX}
              y={getY(targetValue) - 3}
              textAnchor="end"
              className="text-[9px] fill-emerald-700 font-semibold"
            >
              {targetLabel || 'Target'}: {targetValue} {unit}
            </text>
          </g>
        )}

        {/* Base line */}
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        {/* Bars */}
        {data.map((d, i) => {
          const x = paddingX + (i / data.length) * (width - 2 * paddingX) + 6;
          const barHeight = Math.max(2, (d.value / maxVal) * (height - 2 * paddingY));
          const y = height - paddingY - barHeight;
          const isTargetMet = targetValue !== undefined ? d.value >= targetValue : true;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={isHovered ? '#047857' : isTargetMet ? barColor : '#94a3b8'}
                className="transition-colors duration-150"
              />
              <text
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                className="text-[10px] fill-neutral-500 font-medium"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute -top-1 bg-neutral-900 text-white text-[11px] px-2 py-1 rounded-md shadow-md pointer-events-none -translate-x-1/2"
          style={{
            left: `${((paddingX + (hoveredIdx / data.length) * (width - 2 * paddingX) + 6 + barWidth / 2) / width) * 100}%`,
          }}
        >
          <div className="font-bold">
            {data[hoveredIdx].value} {unit}
          </div>
          <div className="text-[9px] text-neutral-300">{data[hoveredIdx].label}</div>
        </div>
      )}
    </div>
  );
};
