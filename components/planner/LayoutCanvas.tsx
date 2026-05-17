'use client';

import { useMemo } from 'react';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { formatMm } from '@/lib/utils';

export function LayoutCanvas() {
  const { layout, rackType } = usePlannerStore();

  if (!layout || layout.elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
          </div>
          <p className="text-sm text-slate-400">
            Adjust parameters to generate layout
          </p>
        </div>
      </div>
    );
  }

  const svgWidth = 700;
  const padding = 50; // Increased from 40 to give room for row labels
  const maxLayoutWidth = layout.warehouseLength;
  const maxLayoutHeight = layout.warehouseWidth;
  const scale = Math.min(
    (svgWidth - padding * 2) / (maxLayoutWidth / 1000),
    400 / (maxLayoutHeight / 1000)
  );

  const svgHeight = Math.max(300, (maxLayoutHeight / 1000) * scale + padding * 2);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-slate-600">
            Top-Down Layout
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>
            {formatMm(layout.warehouseLength)} x {formatMm(layout.warehouseWidth)}
          </span>
          <span>{layout.rackRows} rows</span>
          <span>{layout.aisles} aisles</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ minHeight: 300 }}
      >
        {/* #8 Fix: Single <defs> block for all reusable definitions */}
        <defs>
          <pattern
            id="grid"
            width={1000 * scale}
            height={1000 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          </pattern>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="4"
            refX="6"
            refY="2"
            orient="auto"
          >
            <polygon
              points="0 0, 6 2, 0 4"
              fill="#cbd5e1"
            />
          </marker>
          {/* Clip path to prevent labels from overflowing the SVG */}
          <clipPath id="svg-clip">
            <rect x="0" y="0" width={svgWidth} height={svgHeight} />
          </clipPath>
        </defs>

        <g transform={`translate(${padding}, ${padding})`} clipPath="url(#svg-clip)">
          {/* Grid background */}
          <rect
            width={maxLayoutWidth / 1000 * scale}
            height={maxLayoutHeight / 1000 * scale}
            fill="url(#grid)"
          />

          {/* Layout elements */}
          {layout.elements.map((el, i) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;

            if (el.type === 'wall') {
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="8 4"
                    rx="4"
                  />
                  {/* Dimension labels */}
                  <text
                    x={x + w / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400"
                    fontSize="9"
                  >
                    {formatMm(layout.warehouseLength)}
                  </text>
                  <text
                    x={x - 8}
                    y={y + h / 2}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400"
                    fontSize="9"
                    transform={`rotate(-90, ${x - 8}, ${y + h / 2})`}
                  >
                    {formatMm(layout.warehouseWidth)}
                  </text>
                </g>
              );
            }

            if (el.type === 'aisle') {
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="#f1f5f9"
                    stroke="none"
                  />
                  {/* Aisle arrows */}
                  <line
                    x1={x + w * 0.3}
                    y1={y + h / 2}
                    x2={x + w * 0.7}
                    y2={y + h / 2}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2 + 3}
                    textAnchor="middle"
                    className="text-[8px] fill-slate-300"
                    fontSize="8"
                  >
                    {el.label}
                  </text>
                </g>
              );
            }

            if (el.type === 'rack-row') {
              const color = el.color || '#3b82f6';
              // #9 Fix: clamp label position inside SVG bounds
              const labelX = Math.max(2, x - 4);
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={color}
                    fillOpacity="0.15"
                    stroke={color}
                    strokeWidth="1.5"
                    rx="2"
                  />
                  {/* Bay dividers */}
                  {Array.from({ length: Math.floor(w / (1000 * scale)) - 1 }).map(
                    (_, j) => (
                      <line
                        key={j}
                        x1={x + (j + 1) * 1000 * scale}
                        y1={y}
                        x2={x + (j + 1) * 1000 * scale}
                        y2={y + h}
                        stroke={color}
                        strokeWidth="0.5"
                        strokeOpacity="0.4"
                      />
                    )
                  )}
                  {/* #9 Fix: Row label with overflow protection */}
                  {el.label && (
                    <text
                      x={labelX}
                      y={y + h / 2 + 3}
                      textAnchor="end"
                      fontSize="8"
                      fill="#94a3b8"
                    >
                      {el.label}
                    </text>
                  )}
                </g>
              );
            }

            return null;
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor:
                rackType === 'drive-in'
                  ? '#fbbf24'
                  : rackType === 'radio-shuttle'
                  ? '#a78bfa'
                  : '#3b82f6',
              opacity: 0.3,
              border: `1.5px solid ${
                rackType === 'drive-in'
                  ? '#fbbf24'
                  : rackType === 'radio-shuttle'
                  ? '#a78bfa'
                  : '#3b82f6'
              }`,
            }}
          />
          Rack Row
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
          Aisle
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-slate-300" />
          Wall
        </div>
      </div>
    </div>
  );
}
