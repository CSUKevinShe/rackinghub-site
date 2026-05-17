'use client';

import { useState } from 'react';
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

  const viewProps = { view, setView, rackType };

  if (view === 'top') {
    return (
      <TopView
        {...viewProps}
        layout={layout}
        svgWidth={svgWidth}
        padding={padding}
        bayWidth={bayWidth}
        frameDepth={frameDepth}
      />
    );
  }

  if (view === 'front') {
    return (
      <FrontView
        {...viewProps}
        svgWidth={svgWidth}
        padding={padding}
        bayWidth={bayWidth}
        frameHeight={frameHeight}
        beamSectionHeight={beamSectionHeight}
        firstBeamBottom={firstBeamBottom}
        palletHeight={pallet.height}
        palletWidth={pallet.width}
        beamLevels={rack.beamLevels}
        hasGroundLevel={rack.hasGroundLevel}
        palletsPerLevel={rack.palletsPerLevel}
        totalLevels={totalLevels}
        baysPerRow={layout.baysPerRow}
        uprightSelection={uprightSelection}
      />
    );
  }

  return (
    <SideView
      {...viewProps}
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
    />
  );
}

// ============================================================
// Shared view selector
// ============================================================
function ViewSelector({ view, setView }: { view: ViewType; setView: (v: ViewType) => void }) {
  const views: { key: ViewType; label: string }[] = [
    { key: 'top', label: 'Plan' },
    { key: 'front', label: 'Front' },
    { key: 'side', label: 'Side' },
  ];
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => setView(v.key)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            view === v.key
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Top-down plan view
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
          <span className="text-xs font-medium text-slate-600">Floor Plan</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector view={view} setView={setView} />
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{formatMm(layout.warehouseLength)} x {formatMm(layout.warehouseWidth)}</span>
            <span>{layout.rackRows} row{layout.rackRows > 1 ? 's' : ''}</span>
            <span>{layout.aisles} aisle{layout.aisles > 1 ? 's' : ''}</span>
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
          {/* Warehouse outline */}
          <rect
            x={0} y={0}
            width={layout.warehouseLength / 1000 * scale}
            height={layout.warehouseWidth / 1000 * scale}
            fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="8 4" rx="4"
          />
          {/* Dimension labels */}
          <text x={layout.warehouseLength / 1000 * scale / 2} y={-8} textAnchor="middle" fontSize="9" fill="#94a3b8">{formatMm(layout.warehouseLength)}</text>
          <text x={-8} y={layout.warehouseWidth / 1000 * scale / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" transform={`rotate(-90, -8, ${layout.warehouseWidth / 1000 * scale / 2})`}>{formatMm(layout.warehouseWidth)}</text>

          {layout.elements.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;

            if (el.type === 'aisle') {
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill="#f1f5f9" />
                  <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="8" fill="#cbd5e1">{el.label}</text>
                </g>
              );
            }
            if (el.type === 'rack-row') {
              const color = el.color || '#3b82f6';
              // Draw rack row with individual bay dividers
              const bayWidthPx = (bayWidth / 1000) * scale;
              const frameDepthPx = (frameDepth / 1000) * scale;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.08" />
                  {/* Bay dividers (upright positions) */}
                  {Array.from({ length: Math.floor(w / bayWidthPx) + 1 }).map((_, j) => (
                    <line key={`bay-${j}`} x1={x + j * bayWidthPx} y1={y} x2={x + j * bayWidthPx} y2={y + frameDepthPx} stroke={color} strokeWidth="2" strokeOpacity="0.6" />
                  ))}
                  {/* Top/bottom edges */}
                  <line x1={x} y1={y} x2={x + w} y2={y} stroke={color} strokeWidth="1" strokeOpacity="0.4" />
                  <line x1={x} y1={y + frameDepthPx} x2={x + w} y2={y + frameDepthPx} stroke={color} strokeWidth="1" strokeOpacity="0.4" />
                  {/* Row label */}
                  <text x={x + 4} y={y + frameDepthPx / 2 + 3} fontSize="7" fill={color} fillOpacity="0.7">{el.label}</text>
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
function FrontView({ rackType, svgWidth, padding, bayWidth, frameHeight, beamSectionHeight, firstBeamBottom, palletHeight, palletWidth, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, baysPerRow, uprightSelection, view, setView }: any) {
  const maxDisplayBays = Math.min(baysPerRow, 10);
  const totalWidthMm = bayWidth * maxDisplayBays;

  const scale = Math.min(
    (svgWidth - padding * 2) / (totalWidthMm / 1000),
    450 / (frameHeight / 1000)
  );

  const svgHeight = Math.max(400, (frameHeight / 1000) * scale + padding * 2 + 40);
  const totalPx = totalWidthMm / 1000 * scale;
  const frameHPx = frameHeight / 1000 * scale;
  const uprightPx = Math.max(6, Math.min(16, totalPx / maxDisplayBays * 0.04));
  const beamHPx = Math.max(3, Math.min(10, beamSectionHeight / 1000 * scale));
  const palletHPx = palletHeight / 1000 * scale;
  const palletWPx = palletWidth / 1000 * scale;

  // Calculate beam level positions from bottom (y=0 at ground)
  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) {
    levels.push({ bottomMm: 0, isGround: true });
  }
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

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
            {maxDisplayBays} of {baysPerRow} bays shown
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 400 }}>
        <defs>
          <pattern id="grid-front" width={1000 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${1000 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke="#f1f5f9" strokeWidth="0.3" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding + 10})`}>
          {/* Grid background */}
          <rect width={totalPx} height={frameHPx} fill="url(#grid-front)" />

          {/* Floor line */}
          <line x1={-10} y1={frameHPx} x2={totalPx + 10} y2={frameHPx} stroke="#94a3b8" strokeWidth="2" />
          <line x1={-10} y1={frameHPx + 2} x2={totalPx + 10} y2={frameHPx + 2} stroke="#cbd5e1" strokeWidth="0.5" />

          {/* Each bay */}
          {Array.from({ length: maxDisplayBays }).map((_, bayIdx) => {
            const bayStartX = bayIdx * bayWidth / 1000 * scale;
            const bayEndX = (bayIdx + 1) * bayWidth / 1000 * scale;
            const bayCenterX = (bayStartX + bayEndX) / 2;

            return (
              <g key={`bay-${bayIdx}`}>
                {/* Left upright */}
                {bayIdx === 0 && (
                  <rect x={-uprightPx / 2} y={0} width={uprightPx} height={frameHPx} fill="#475569" rx="1" />
                )}
                <rect x={bayStartX - uprightPx / 2} y={0} width={uprightPx} height={frameHPx} fill="#475569" rx="1" />
                {/* Right upright (last bay only) */}
                {bayIdx === maxDisplayBays - 1 && (
                  <rect x={bayEndX - uprightPx / 2} y={0} width={uprightPx} height={frameHPx} fill="#475569" rx="1" />
                )}

                {/* Pallets and beams at each level */}
                {levels.map((lvl, lvlIdx) => {
                  const beamBottomPx = (frameHeight - lvl.bottomMm) / 1000 * scale;
                  const palletTopPx = beamBottomPx - palletHPx;
                  const beamTopPx = beamBottomPx - beamHPx;

                  return (
                    <g key={`lvl-${lvlIdx}`}>
                      {/* Beam (skip ground level) */}
                      {!lvl.isGround && (
                        <>
                          <rect x={bayStartX} y={beamTopPx} width={bayEndX - bayStartX} height={beamHPx} fill="#d97706" fillOpacity="0.7" rx="0.5" />
                          {/* Beam connector dots at upright */}
                          <circle cx={bayStartX} cy={beamTopPx + beamHPx / 2} r={1.5} fill="#b45309" />
                        </>
                      )}

                      {/* Pallets in this bay */}
                      {Array.from({ length: palletsPerLevel }).map((_, pIdx) => {
                        const palletGap = 100 / 1000 * scale;
                        const palletStartX = bayStartX + 100 / 1000 * scale + pIdx * (palletWPx + palletGap);
                        return (
                          <g key={`p-${lvlIdx}-${pIdx}`}>
                            <rect x={palletStartX} y={palletTopPx} width={palletWPx} height={palletHPx} fill="#3b82f6" fillOpacity="0.12" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.4" rx="1" />
                            {/* Pallet base line */}
                            <line x1={palletStartX} y1={palletTopPx + palletHPx} x2={palletStartX + palletWPx} y2={palletTopPx + palletHPx} stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.5" />
                            {/* Load indicator */}
                            <text x={palletStartX + palletWPx / 2} y={palletTopPx + palletHPx / 2 + 3} textAnchor="middle" fontSize="6" fill="#3b82f6" fillOpacity="0.5">
                              {palletWPx > 20 ? `${(palletWPx / scale * 1000).toFixed(0)}` : ''}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Height dimension on right */}
          <line x1={totalPx + 12} y1={0} x2={totalPx + 12} y2={frameHPx} stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1={totalPx + 8} y1={0} x2={totalPx + 16} y2={0} stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1={totalPx + 8} y1={frameHPx} x2={totalPx + 16} y2={frameHPx} stroke="#cbd5e1" strokeWidth="0.8" />
          <text x={totalPx + 18} y={frameHPx / 2 + 3} textAnchor="start" fontSize="8" fill="#94a3b8">{formatMm(frameHeight)}</text>

          {/* Level labels on left */}
          {levels.map((lvl, i) => {
            const y = (frameHeight - lvl.bottomMm) / 1000 * scale;
            return (
              <g key={`lbl-${i}`}>
                <text x={-6} y={y + 3} textAnchor="end" fontSize="7" fill="#94a3b8">
                  {lvl.isGround ? 'G' : `L${lvl.isGround ? '' : i - (hasGroundLevel ? 1 : 0)}`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-600" />
          Upright Frame
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-600" />
          Beam
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6', opacity: 0.12, border: '1px solid #3b82f6' }} />
          Pallet
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Side elevation view
// ============================================================
function SideView({ rackType, svgWidth, padding, frameDepth, frameHeight, beamSectionHeight, firstBeamBottom, palletDepth, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, uprightSelection, view, setView }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2) / Math.max(frameDepth / 1000, 0.8),
    450 / (frameHeight / 1000)
  );

  const svgHeight = Math.max(400, (frameHeight / 1000) * scale + padding * 2 + 40);
  const depthPx = frameDepth / 1000 * scale;
  const frameHPx = frameHeight / 1000 * scale;
  const uprightPx = Math.max(8, Math.min(14, depthPx * 0.06));
  const beamHPx = Math.max(3, Math.min(8, beamSectionHeight / 1000 * scale));
  const palletDPx = palletDepth / 1000 * scale;
  const palletHPx = palletHeight / 1000 * scale;

  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) levels.push({ bottomMm: 0, isGround: true });
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

  const { bracingType, bracingCount } = uprightSelection || { bracingType: 'D', bracingCount: { diagonal: 8, horizontal: 2 } };
  const nDiag = bracingCount?.diagonal || 8;
  const nHoriz = bracingCount?.horizontal || 2;

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
            Depth {formatMm(frameDepth)} x {bracingType}-bracing ({nDiag}d {nHoriz}h)
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 400 }}>
        <defs>
          <pattern id="grid-side" width={500 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${500 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke="#f1f5f9" strokeWidth="0.3" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding + 10})`}>
          {/* Grid background */}
          <rect width={depthPx} height={frameHPx} fill="url(#grid-side)" />

          {/* Floor line */}
          <line x1={-10} y1={frameHPx} x2={depthPx + uprightPx + 10} y2={frameHPx} stroke="#94a3b8" strokeWidth="2" />

          {/* Left upright (front column) */}
          <rect x={0} y={0} width={uprightPx} height={frameHPx} fill="#475569" rx="1" />
          {/* Right upright (back column) */}
          <rect x={depthPx - uprightPx} y={0} width={uprightPx} height={frameHPx} fill="#475569" rx="1" />

          {/* Bracing between uprights */}
          <g opacity="0.35">
            {(() => {
              const innerLeft = uprightPx;
              const innerRight = depthPx - uprightPx;
              const innerW = innerRight - innerLeft;
              const lines: JSX.Element[] = [];

              if (bracingType === 'D') {
                // D-type: horizontals at regular intervals, diagonals between them
                const totalH = nHoriz + nDiag;
                const spacing = frameHPx / totalH;
                // Horizontal bracing
                for (let h = 0; h < nHoriz; h++) {
                  const y = (h + 1) * spacing * 2;
                  lines.push(<line key={`h-${h}`} x1={innerLeft} y1={y} x2={innerRight} y2={y} stroke="#64748b" strokeWidth="1" />);
                }
                // Diagonal bracing
                for (let d = 0; d < nDiag; d++) {
                  const y1 = d * spacing * 2;
                  const y2 = (d + 1) * spacing * 2;
                  lines.push(<line key={`d-${d}`} x1={innerLeft} y1={y1} x2={innerRight} y2={y2} stroke="#64748b" strokeWidth="1" />);
                }
              } else {
                // Z-type: similar but with zigzag pattern
                const totalSegments = nDiag;
                const segH = frameHPx / totalSegments;
                for (let d = 0; d < nDiag; d++) {
                  const y1 = d * segH;
                  const y2 = (d + 1) * segH;
                  const goRight = d % 2 === 0;
                  lines.push(
                    <line key={`d-${d}`}
                      x1={goRight ? innerLeft : innerRight} y1={y1}
                      x2={goRight ? innerRight : innerLeft} y2={y2}
                      stroke="#64748b" strokeWidth="1"
                    />
                  );
                }
                for (let h = 0; h < nHoriz; h++) {
                  const y = h * (frameHPx / (nHoriz + 1));
                  lines.push(<line key={`h-${h}`} x1={innerLeft} y1={y} x2={innerRight} y2={y} stroke="#64748b" strokeWidth="1" />);
                }
              }
              return lines;
            })()}
          </g>

          {/* Beams and pallets at each level */}
          {levels.map((lvl, lvlIdx) => {
            const beamBottomPx = (frameHeight - lvl.bottomMm) / 1000 * scale;
            const palletTopPx = beamBottomPx - palletHPx;
            const beamTopPx = beamBottomPx - beamHPx;
            const palletX = (depthPx - palletDPx) / 2;

            return (
              <g key={`side-lvl-${lvlIdx}`}>
                {/* Beam (skip ground) */}
                {!lvl.isGround && (
                  <rect x={0} y={beamTopPx} width={depthPx} height={beamHPx} fill="#d97706" fillOpacity="0.6" rx="0.5" />
                )}
                {/* Pallet (centered on frame depth) */}
                <rect x={palletX} y={palletTopPx} width={palletDPx} height={palletHPx} fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.4" rx="1" />
                {/* Pallet base line */}
                <line x1={palletX} y1={palletTopPx + palletHPx} x2={palletX + palletDPx} y2={palletTopPx + palletHPx} stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
                {/* Level label */}
                <text x={depthPx + 6} y={beamTopPx + beamHPx / 2 + 3} textAnchor="start" fontSize="7" fill="#94a3b8">
                  {lvl.isGround ? 'G' : `L${lvl.isGround ? '' : lvlIdx - (hasGroundLevel ? 1 : 0)}`}
                </text>
              </g>
            );
          })}

          {/* Depth dimension */}
          <line x1={0} y1={frameHPx + 12} x2={depthPx} y2={frameHPx + 12} stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1={0} y1={frameHPx + 8} x2={0} y2={frameHPx + 16} stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1={depthPx} y1={frameHPx + 8} x2={depthPx} y2={frameHPx + 16} stroke="#cbd5e1" strokeWidth="0.8" />
          <text x={depthPx / 2} y={frameHPx + 25} textAnchor="middle" fontSize="8" fill="#94a3b8">{formatMm(frameDepth)}</text>
        </g>
      </svg>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-600" />
          Upright
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-600" />
          Beam
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6', opacity: 0.1, border: '1px solid #3b82f6' }} />
          Pallet
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-slate-400" />
          Bracing ({bracingType}-type)
        </div>
      </div>
    </div>
  );
}
