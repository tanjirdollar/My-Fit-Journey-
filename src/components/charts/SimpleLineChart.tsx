import React, { useState } from 'react';

export interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  targetValue?: number;
  targetLabel?: string;
  lineColor?: string;
  areaColor?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  title,
  unit = '',
  targetValue,
  targetLabel,
  lineColor = '#059669', // emerald-600
  areaColor = 'rgba(16, 185, 129, 0.1)',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
        No measurement history logged yet.
      </div>
    );
  }

  // Chart layout dimensions
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;

  const values = data.map((d) => d.value);
  if (targetValue !== undefined) values.push(targetValue);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || 1;
  const minVal = Math.floor(rawMin - spread * 0.15);
  const maxVal = Math.ceil(rawMax + spread * 0.15);
  const range = maxVal - minVal || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2;
    return paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
  };

  const getY = (val: number) => {
    return height - paddingY - ((val - minVal) / range) * (height - 2 * paddingY);
  };

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPath = `M ${getX(0)},${height - paddingY} L ${points} L ${getX(data.length - 1)},${height - paddingY} Z`;

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-600">{title}</span>
          <span className="text-xs text-neutral-400 font-medium">
            Latest: {data[data.length - 1]?.value} {unit}
          </span>
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-48 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`chart-grad-${title || 'main'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={getY(maxVal)}
            x2={width - paddingX}
            y2={getY(maxVal)}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={getY((maxVal + minVal) / 2)}
            x2={width - paddingX}
            y2={getY((maxVal + minVal) / 2)}
            stroke="#f1f5f9"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={getY(minVal)}
            x2={width - paddingX}
            y2={getY(minVal)}
            stroke="#f1f5f9"
            strokeWidth="1"
          />

          {/* Target guideline */}
          {targetValue !== undefined && (
            <g>
              <line
                x1={paddingX}
                y1={getY(targetValue)}
                x2={width - paddingX}
                y2={getY(targetValue)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={width - paddingX}
                y={getY(targetValue) - 4}
                textAnchor="end"
                className="text-[10px] fill-emerald-700 font-semibold"
              >
                {targetLabel || 'Target'}: {targetValue} {unit}
              </text>
            </g>
          )}

          {/* Area fill */}
          {data.length > 1 && (
            <path d={areaPath} fill={`url(#chart-grad-${title || 'main'})`} />
          )}

          {/* Main stroke line */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data dots */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.value);
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke={lineColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />
                {/* Date label at bottom */}
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[10px] fill-neutral-400 select-none"
                >
                  {d.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute -top-1 bg-neutral-900 text-white text-[11px] px-2 py-1 rounded-md shadow-md pointer-events-none -translate-x-1/2"
            style={{
              left: `${(getX(hoveredIdx) / width) * 100}%`,
            }}
          >
            <div className="font-bold">
              {data[hoveredIdx].value} {unit}
            </div>
            <div className="text-[9px] text-neutral-300">{data[hoveredIdx].date}</div>
          </div>
        )}
      </div>
    </div>
  );
};
