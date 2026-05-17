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
function ViewSelector({ view, setView }: { view: ViewType; setView: (v: ViewType) => void }) {
  const views: { key: ViewType; label: string; icon: string }[] = [
    { key: 'top', label: 'Top View', icon: '⊤' },
    { key: 'front', label: 'Front View', icon: '⊥' },
    { key: 'side', label: 'Side View', icon: '◧' },
  ];
  return (
    <div className="flex items-center gap-1">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => setView(v.key)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            view === v.key
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
// Top-down view (existing)
// ============================================================
function TopView({ layout, rackType, svgWidth, padding, bayWidth, frameDepth, view, setView }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2) / (layout.warehouseLength / 1000),
    400 / (layout.warehouseWidth / 1000)
  );
  const svgHeight = Math.max(300, (layout.warehouseWidth / 1000) * scale + padding * 2);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-slate-600">Warehouse Layout</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector view={view} setView={setView} />
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{formatMm(layout.warehouseLength)} × {formatMm(layout.warehouseWidth)}</span>
            <span>{layout.rackRows} rows</span>
            <span>{layout.aisles} aisles</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 300 }}>
        <defs>
          <pattern id="grid" width={1000 * scale} height={1000 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding})`}>
          <rect width={layout.warehouseLength / 1000 * scale} height={layout.warehouseWidth / 1000 * scale} fill="url(#grid)" />
          {layout.elements.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;
            if (el.type === 'wall') {
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="8 4" rx="4" />
                  <text x={x + w / 2} y={y - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{formatMm(layout.warehouseLength)}</text>
                  <text x={x - 8} y={y + h / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" transform={`rotate(-90, ${x - 8}, ${y + h / 2})`}>{formatMm(layout.warehouseWidth)}</text>
                </g>
              );
            }
            if (el.type === 'aisle') {
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill="#f1f5f9" stroke="none" />
                  <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="8" fill="#cbd5e1">{el.label}</text>
                </g>
              );
            }
            if (el.type === 'rack-row') {
              const color = el.color || '#3b82f6';
              const labelX = Math.max(2, x - 4);
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" rx="2" />
                  {Array.from({ length: Math.floor(w / (1000 * scale)) - 1 }).map((_, j) => (
                    <line key={j} x1={x + (j + 1) * 1000 * scale} y1={y} x2={x + (j + 1) * 1000 * scale} y2={y + h} stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
                  ))}
                  {el.label && <text x={labelX} y={y + h / 2 + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{el.label}</text>}
                </g>
              );
            }
            return null;
          })}
        </g>
      </svg>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6', opacity: 0.3, border: `1.5px solid ${rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6'}` }} />
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
