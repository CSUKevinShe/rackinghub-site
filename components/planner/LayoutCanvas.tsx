'use client';

import { useState, useMemo } from 'react';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { formatMm } from '@/lib/utils';

type ViewType = 'top' | 'front' | 'side';

export function LayoutCanvas() {
  const { layout, rackType, rack, pallet, uprightSelection, beamSelection } = usePlannerStore();
  const [view, setView] = useState<ViewType>('top');

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

  const frameDepth = pallet.depth - 100; // mm
  const bayWidth =
    rack.palletsPerLevel * pallet.width +
    (rack.palletsPerLevel - 1) * 100 +
    2 * 100;
  const beamSectionHeight = beamSelection?.heightMm ?? 120;
  const firstBeamBottom = rack.firstBeamHeight;
  const lastLevelBeamBottom = firstBeamBottom + (rack.beamLevels - 1) * (pallet.height + 100);
  const frameHeight = lastLevelBeamBottom + beamSectionHeight + 100;
  const totalLevels = rack.beamLevels + (rack.hasGroundLevel ? 1 : 0);

  const svgWidth = 700;
  const padding = 50;

  if (view === 'top') {
    return (
      <TopView
        layout={layout}
        rackType={rackType}
        svgWidth={svgWidth}
        padding={padding}
        bayWidth={bayWidth}
        frameDepth={frameDepth}
        view={view}
        setView={setView}
      />
    );
  }

  if (view === 'front') {
    return (
      <FrontView
        layout={layout}
        rackType={rackType}
        svgWidth={svgWidth}
        padding={padding}
        bayWidth={bayWidth}
        frameHeight={frameHeight}
        beamSectionHeight={beamSectionHeight}
        firstBeamBottom={firstBeamBottom}
        palletHeight={pallet.height}
        beamLevels={rack.beamLevels}
        hasGroundLevel={rack.hasGroundLevel}
        palletsPerLevel={rack.palletsPerLevel}
        totalLevels={totalLevels}
        view={view}
        setView={setView}
      />
    );
  }

  return (
    <SideView
      layout={layout}
      rackType={rackType}
      svgWidth={svgWidth}
      padding={padding}
      frameDepth={frameDepth}
      frameHeight={frameHeight}
      beamSectionHeight={beamSectionHeight}
      firstBeamBottom={firstBeamBottom}
      palletDepth={pallet.depth}
      palletHeight={pallet.height}
      beamLevels={rack.beamLevels}
      hasGroundLevel={rack.hasGroundLevel}
      palletsPerLevel={rack.palletsPerLevel}
      totalLevels={totalLevels}
      uprightSelection={uprightSelection}
      view={view}
      setView={setView}
    />
  );
}

// ============================================================
// Shared view selector component
// ============================================================
function ViewSelector({ view, setView }: { view: string; setView: (v: string) => void }) {
  const views: { key: string; label: string; icon: string; disabled?: boolean }[] = [
    { key: 'top', label: 'Top View', icon: '⊤' },
    { key: 'front', label: 'Front View', icon: '⊥' },
    { key: 'side', label: 'Side View', icon: '◧' },
    { key: '3d', label: '3D View', icon: '◎', disabled: true },
  ];
  return (
    <div className="flex items-center gap-1">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          disabled={v.disabled}
          title={v.disabled ? 'Coming soon — 3D visualization in development' : v.label}
          onClick={() => !v.disabled && setView(v.key)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            v.disabled
              ? 'text-slate-300 cursor-not-allowed'
              : view === v.key
              ? 'bg-primary-950 text-white'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Top-down view — block-based layout with column grid
// ============================================================
function TopView({ layout, rackType, svgWidth, padding, bayWidth, frameDepth, view, setView }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2 - 60) / (layout.warehouseLength / 1000),
    500 / (layout.warehouseWidth / 1000)
  );
  const svgHeight = Math.max(350, (layout.warehouseWidth / 1000) * scale + padding * 2 + 20);
  const warehouse = usePlannerStore.getState().warehouse;

  // Group elements by type
  const walls = layout.elements.filter((e: any) => e.type === 'wall');
  const columns = layout.elements.filter((e: any) => e.type === 'column');
  const transferAisles = layout.elements.filter((e: any) => e.type === 'transfer-aisle');
  const aisles = layout.elements.filter((e: any) => e.type === 'aisle');
  const rackRows = layout.elements.filter((e: any) => e.type === 'rack-row');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-slate-600">Top View — Block Layout</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector view={view} setView={setView} />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{formatMm(layout.warehouseLength)} × {formatMm(layout.warehouseWidth)}</span>
            <span>{layout.rackRows} rows</span>
            <span>{layout.aisles} aisles</span>
            <span>{layout.rackBlocks} blocks</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 350 }}>
        <defs>
          <marker id="arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,6 L3,0 L6,6" fill="#3b82f6" />
          </marker>
          <marker id="arrow-down" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L3,6 L6,0" fill="#2563eb" />
          </marker>
        </defs>

        <g transform={`translate(${padding + 40}, ${padding})`}>
          {/* Wall */}
          {walls.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;
            return (
              <g key={`wall-${i}`}>
                <rect x={x} y={y} width={w} height={h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="8 4" rx="2" />
                {/* Overall dimension labels */}
                <text x={x + w / 2} y={y - 8} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
                  {formatMm(layout.warehouseLength)}
                </text>
                <text x={x - 10} y={y + h / 2} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600" transform={`rotate(-90, ${x - 10}, ${y + h / 2})`}>
                  {formatMm(layout.warehouseWidth)}
                </text>
              </g>
            );
          })}

          {/* Transfer aisles (background layer) */}
          {transferAisles.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;
            return (
              <g key={`ta-${i}`}>
                <rect x={x} y={y} width={w} height={h} fill="#dbeafe" fillOpacity="0.5" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 2" />
                <text x={x + w / 2} y={y + h / 2 - 8} textAnchor="middle" fontSize="7" fill="#3b82f6" fontWeight="500">
                  {el.label}
                </text>
              </g>
            );
          })}

          {/* Working aisles */}
          {aisles.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;
            return (
              <g key={`aisle-${i}`}>
                <rect x={x} y={y} width={w} height={h} fill="#f0f9ff" fillOpacity="0.6" />
                <text x={x + 6} y={y + h / 2 + 3} textAnchor="start" fontSize="7" fill="#94a3b8">
                  {el.label}
                </text>
              </g>
            );
          })}

          {/* Rack rows with block grouping */}
          {(() => {
            // Group rack rows by block index
            const blockMap = new Map<number, any[]>();
            rackRows.forEach((el: any) => {
              const idx = el.blockIndex ?? 0;
              if (!blockMap.has(idx)) blockMap.set(idx, []);
              blockMap.get(idx)!.push(el);
            });

            const blockColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#6366f1'];

            return Array.from(blockMap.entries()).map(([blockIdx, rows]) => {
              const color = blockColors[blockIdx % blockColors.length];
              // Calculate block bounding box
              const minX = Math.min(...rows.map((r: any) => r.x));
              const minY = Math.min(...rows.map((r: any) => r.y));
              const maxX = Math.max(...rows.map((r: any) => r.x + r.width));
              const maxY = Math.max(...rows.map((r: any) => r.y + r.height));

              const bx = (minX / 1000) * scale;
              const by = (minY / 1000) * scale;
              const bw = ((maxX - minX) / 1000) * scale;
              const bh = ((maxY - minY) / 1000) * scale;

              return (
                <g key={`block-${blockIdx}`}>
                  {/* Block background */}
                  <rect x={bx - 3} y={by - 3} width={bw + 6} height={bh + 6} fill={color} fillOpacity="0.05" stroke={color} strokeWidth="0.5" strokeDasharray="3 2" rx="3" />
                  <text x={bx + 2} y={by + bh / 2} textAnchor="start" fontSize="7" fill={color} fontWeight="600">
                    Block {blockIdx + 1}
                  </text>

                  {/* Individual rack rows */}
                  {rows.map((el: any, ri: number) => {
                    const rx = (el.x / 1000) * scale;
                    const ry = (el.y / 1000) * scale;
                    const rw = (el.width / 1000) * scale;
                    const rh = (el.height / 1000) * scale;
                    const isDark = ri === 1; // back row (darker shade)
                    const rowColor = isDark ? '#2563eb' : color;

                    return (
                      <g key={`row-${blockIdx}-${ri}`}>
                        {/* Row background */}
                        <rect x={rx} y={ry} width={rw} height={rh} fill={rowColor} fillOpacity="0.12" stroke={rowColor} strokeWidth="1.2" rx="1" />

                        {/* Bay divider lines */}
                        {Array.from({ length: Math.max(0, el.width / bayWidth - 1) }).map((_, j) => {
                          const dividerX = rx + ((j + 1) * bayWidth / 1000) * scale;
                          return (
                            <line
                              key={`div-${j}`}
                              x1={dividerX}
                              y1={ry}
                              x2={dividerX}
                              y2={ry + rh}
                              stroke={rowColor}
                              strokeWidth="0.5"
                              strokeOpacity="0.3"
                            />
                          );
                        })}

                        {/* Face direction arrow */}
                        {el.faceDirection && (
                          <g>
                            {Array.from({ length: Math.max(1, Math.floor(el.width / bayWidth)) }).map((_, j) => {
                              const arrowX = rx + ((j + 0.5) * bayWidth / 1000) * scale;
                              const arrowY = el.faceDirection === -1
                                ? ry + rh + 4  // arrow above row
                                : ry - 4;       // arrow below row
                              const dir = el.faceDirection === -1 ? '↑' : '↓';
                              return (
                                <text
                                  key={`arrow-${j}`}
                                  x={arrowX}
                                  y={arrowY + 6}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill={rowColor}
                                  fillOpacity="0.6"
                                >
                                  {dir}
                                </text>
                              );
                            })}
                          </g>
                        )}

                        {/* Row label */}
                        {el.label && (
                          <text
                            x={rx + 4}
                            y={ry + rh / 2 + 3}
                            textAnchor="start"
                            fontSize="6"
                            fill="#64748b"
                            fontWeight="500"
                          >
                            {el.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            });
          })()}

          {/* Columns */}
          {columns.map((el: any, i: number) => {
            const cx = (el.x / 1000) * scale;
            const cy = (el.y / 1000) * scale;
            const cw = (el.width / 1000) * scale;
            const ch = (el.height / 1000) * scale;
            if (cw < 1 || ch < 1) return null;
            return (
              <g key={`col-${i}`}>
                <rect x={cx} y={cy} width={cw} height={ch} fill="#94a3b8" fillOpacity="0.5" stroke="#64748b" strokeWidth="1" rx="1" />
              </g>
            );
          })}
        </g>
      </svg>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6', opacity: 0.3, border: `1.5px solid ${rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6'}` }} />
          Rack Row
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-sky-50 border border-sky-200" />
          Working Aisle
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-100 border border-dashed border-blue-300" />
          Transfer Aisle
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-400 border border-slate-500" />
          Column
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-slate-300" />
          Wall
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Front elevation view
// ============================================================
function FrontView({ layout, rackType, svgWidth, padding, bayWidth, frameHeight, beamSectionHeight, firstBeamBottom, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, view, setView }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2) / (bayWidth / 1000 * Math.min(layout.baysPerRow, 8)),
    400 / (frameHeight / 1000)
  );

  const displayBays = Math.min(layout.baysPerRow, 8);
  const displayWidth = bayWidth * displayBays;
  const svgHeight = Math.max(350, (frameHeight / 1000) * scale + padding * 2 + 30);

  const beamLevelYPositions: number[] = [];
  if (hasGroundLevel) {
    beamLevelYPositions.push(0); // ground level at bottom
  }
  for (let i = 0; i < beamLevels; i++) {
    const beamBottom = firstBeamBottom + i * (palletHeight + 100);
    beamLevelYPositions.push(beamBottom);
  }

  const frameW = 30; // upright width in px (visual)
  const palletW = (bayWidth / palletsPerLevel - 100 - 200 / palletsPerLevel) / 1000 * scale;
  const palletH = palletHeight / 1000 * scale;
  const beamH = beamSectionHeight / 1000 * scale;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-slate-600">Front Elevation</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector view={view} setView={setView} />
          <span className="text-xs text-slate-400">
            {displayBays} bay{displayBays > 1 ? 's' : ''} shown · {totalLevels} levels ({beamLevels} beam{hasGroundLevel ? ' + ground' : ''})
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 350 }}>
        <defs>
          <pattern id="grid-front" width={1000 * scale} height={1000 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`} fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding + 10})`}>
          <rect width={displayWidth / 1000 * scale} height={frameHeight / 1000 * scale} fill="url(#grid-front)" />

          {/* Upright frames */}
          {Array.from({ length: displayBays + 1 }).map((_, i) => {
            const xPos = (i * bayWidth / 1000 * scale);
            return (
              <rect
                key={`upright-${i}`}
                x={xPos - frameW / 2}
                y={0}
                width={frameW}
                height={frameHeight / 1000 * scale}
                fill="#64748b"
                rx="2"
              />
            );
          })}

          {/* Pallets and beams per level */}
          {beamLevelYPositions.map((beamBottom, levelIdx) => {
            const yPos = (frameHeight - beamBottom - palletHeight) / 1000 * scale;
            const beamY = (frameHeight - beamBottom) / 1000 * scale - beamH / 2;

            // Ground level has no beams
            const isGround = hasGroundLevel && levelIdx === 0;

            return (
              <g key={`level-${levelIdx}`}>
                {/* Beam (skip for ground level) */}
                {!isGround && (
                  <rect
                    x={0}
                    y={beamY}
                    width={displayWidth / 1000 * scale}
                    height={beamH}
                    fill="#f59e0b"
                    fillOpacity="0.8"
                    rx="1"
                  />
                )}

                {/* Pallets */}
                {Array.from({ length: palletsPerLevel }).map((_, pi) => {
                  const pxStart = ((pi * bayWidth / palletsPerLevel + 100) / 1000 * scale);
                  return (
                    <g key={`pallet-${levelIdx}-${pi}`}>
                      <rect
                        x={pxStart}
                        y={yPos}
                        width={palletW}
                        height={palletH}
                        fill="#3b82f6"
                        fillOpacity="0.2"
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeOpacity="0.5"
                        rx="2"
                      />
                      {/* Pallet base line */}
                      <line
                        x1={pxStart}
                        y1={yPos + palletH}
                        x2={pxStart + palletW}
                        y2={yPos + palletH}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                      />
                    </g>
                  );
                })}

                {/* Level label */}
                <text
                  x={-4}
                  y={beamY + beamH / 2 + 3}
                  textAnchor="end"
                  fontSize="7"
                  fill="#94a3b8"
                >
                  {isGround ? 'G' : `L${levelIdx}`}
                </text>
              </g>
            );
          })}

          {/* Dimension: frame height */}
          <line
            x1={displayWidth / 1000 * scale + 15}
            y1={0}
            x2={displayWidth / 1000 * scale + 15}
            y2={frameHeight / 1000 * scale}
            stroke="#cbd5e1"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={displayWidth / 1000 * scale + 20}
            y={frameHeight / 1000 * scale / 2}
            textAnchor="start"
            fontSize="8"
            fill="#94a3b8"
            transform={`rotate(90, ${displayWidth / 1000 * scale + 20}, ${frameHeight / 1000 * scale / 2})`}
          >
            {formatMm(frameHeight)}
          </text>
        </g>
      </svg>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-500" />
          Upright Frame
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400" />
          Beam
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6', opacity: 0.2, border: '1.5px solid #3b82f6' }} />
          Pallet
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Side elevation view
// ============================================================
function SideView({ layout, rackType, svgWidth, padding, frameDepth, frameHeight, beamSectionHeight, firstBeamBottom, palletDepth, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, uprightSelection, view, setView }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2) / (frameDepth / 1000),
    400 / (frameHeight / 1000)
  );

  const svgHeight = Math.max(350, (frameHeight / 1000) * scale + padding * 2 + 30);
  const displayDepth = frameDepth / 1000 * scale;
  const uprightW = 12; // upright face width in px

  const beamLevelYPositions: number[] = [];
  if (hasGroundLevel) beamLevelYPositions.push(0);
  for (let i = 0; i < beamLevels; i++) {
    beamLevelYPositions.push(firstBeamBottom + i * (palletHeight + 100));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-slate-600">Side Elevation</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector view={view} setView={setView} />
          <span className="text-xs text-slate-400">
            Depth {formatMm(frameDepth)} · {totalLevels} levels · {uprightSelection?.bracingType || 'D'}-bracing
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 350 }}>
        <defs>
          <pattern id="grid-side" width={500 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${500 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding + 10})`}>
          <rect width={displayDepth} height={frameHeight / 1000 * scale} fill="url(#grid-side)" />

          {/* Upright faces (left and right) */}
          <rect x={0} y={0} width={uprightW} height={frameHeight / 1000 * scale} fill="#64748b" rx="1" />
          <rect x={displayDepth - uprightW} y={0} width={uprightW} height={frameHeight / 1000 * scale} fill="#64748b" rx="1" />

          {/* Bracing (Z or D type) */}
          {uprightSelection && beamLevels > 0 && (
            <g opacity="0.4">
              {(() => {
                const { bracingCount, bracingType } = uprightSelection;
                const nDiag = bracingCount.diagonal;
                const nHoriz = bracingCount.horizontal;
                const braceLeft = uprightW;
                const braceRight = displayDepth - uprightW;
                const braceWidth = braceRight - braceLeft;
                const braceHeight = frameHeight / 1000 * scale;
                const diagSpacing = braceHeight / (nDiag + 1);

                const lines: JSX.Element[] = [];
                // Diagonal lines
                for (let d = 0; d < nDiag; d++) {
                  const y1 = (d + 0.5) * diagSpacing;
                  const y2 = (d + 1.5) * diagSpacing;
                  lines.push(
                    <line
                      key={`diag-${d}`}
                      x1={braceLeft}
                      y1={y1}
                      x2={braceRight}
                      y2={y2}
                      stroke="#94a3b8"
                      strokeWidth="1"
                    />
                  );
                }
                // Horizontal lines
                for (let h = 0; h < nHoriz; h++) {
                  const y = h * (braceHeight / (nHoriz + 1));
                  lines.push(
                    <line
                      key={`horiz-${h}`}
                      x1={braceLeft}
                      y1={y}
                      x2={braceRight}
                      y2={y}
                      stroke="#94a3b8"
                      strokeWidth="1"
                    />
                  );
                }
                return lines;
              })()}
            </g>
          )}

          {/* Pallets per level */}
          {beamLevelYPositions.map((beamBottom, levelIdx) => {
            const isGround = hasGroundLevel && levelIdx === 0;
            const palletTopY = (frameHeight - beamBottom - palletHeight) / 1000 * scale;
            const palletDepthPx = (palletDepth / 1000 * scale);
            const palletX = (displayDepth - palletDepthPx) / 2;

            // Beam line (skip ground)
            const beamY = (frameHeight - beamBottom) / 1000 * scale - (beamSectionHeight / 1000 * scale) / 2;

            return (
              <g key={`side-level-${levelIdx}`}>
                {!isGround && (
                  <>
                    <rect x={uprightW - 2} y={beamY} width={displayDepth - uprightW * 2 + 4} height={beamSectionHeight / 1000 * scale} fill="#f59e0b" fillOpacity="0.7" rx="1" />
                  </>
                )}
                <rect
                  x={palletX}
                  y={palletTopY}
                  width={palletDepthPx}
                  height={palletHeight / 1000 * scale}
                  fill="#3b82f6"
                  fillOpacity="0.15"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  rx="2"
                />
                {/* Level label */}
                <text
                  x={displayDepth + 8}
                  y={beamY + 3}
                  textAnchor="start"
                  fontSize="7"
                  fill="#94a3b8"
                >
                  {isGround ? 'G' : `L${levelIdx}`}
                </text>
              </g>
            );
          })}

          {/* Dimension: depth */}
          <line x1={0} y1={frameHeight / 1000 * scale + 15} x2={displayDepth} y2={frameHeight / 1000 * scale + 15} stroke="#cbd5e1" strokeWidth="1" />
          <text x={displayDepth / 2} y={frameHeight / 1000 * scale + 28} textAnchor="middle" fontSize="8" fill="#94a3b8">{formatMm(frameDepth)}</text>
        </g>
      </svg>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-500" />
          Upright
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400" />
          Beam
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6', opacity: 0.15, border: '1.5px solid #3b82f6' }} />
          Pallet
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-slate-400" />
          Bracing
        </div>
      </div>
    </div>
  );
}
