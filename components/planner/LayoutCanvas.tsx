'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { formatMm } from '@/lib/utils';
import { Download, X } from 'lucide-react';

type ViewType = 'top' | 'front' | 'side';

// Engineering drawing style constants
const COLORS = {
  white: '#ffffff',
  grid: '#f8fafc',
  gridLine: '#f1f5f9',
  border: '#1e293b',
  borderLight: '#cbd5e1',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  upright: '#475569',
  beam: '#d97706',
  beamFill: 'rgba(217,119,6,0.6)',
  palletFill: 'rgba(59,130,246,0.10)',
  palletStroke: '#3b82f6',
  palletStrokeOpacity: 0.4,
  aisle: '#f1f5f9',
  rackFill: 'rgba(59,130,246,0.06)',
  rackStroke: '#3b82f6',
  column: '#ef4444',
  dimension: '#94a3b8',
  bracing: '#64748b',
  ground: '#1e293b',
  groundHatch: '#cbd5e1',
} as const;

export function LayoutCanvas() {
  const { layout, rackType, rack, pallet, uprightSelection, beamSelection } = usePlannerStore();
  const [view, setView] = useState<ViewType>('top');
  const [showQuotePrompt, setShowQuotePrompt] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container width for responsive SVG
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setContainerWidth(w);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.download = `rackinghub-${view}-layout.png`;
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
        setShowQuotePrompt(true);
      }, 'image/png');
    };
    img.onerror = () => {
      // Fallback: try without base64 encoding
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.download = `rackinghub-${view}-layout.png`;
          a.href = URL.createObjectURL(b);
          a.click();
        }, 'image/png');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  }, [view]);

  // Early return after all hooks
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

  const frameDepth = pallet.depth - 100;
  const bayWidth =
    rack.palletsPerLevel * pallet.width +
    (rack.palletsPerLevel - 1) * 100 +
    2 * 100;
  const beamSectionHeight = beamSelection?.heightMm ?? 120;
  const firstBeamBottom = rack.firstBeamHeight;
  const lastLevelBeamBottom = firstBeamBottom + (rack.beamLevels - 1) * (pallet.height + 100);
  const frameHeight = lastLevelBeamBottom + beamSectionHeight + 100;
  const totalLevels = rack.beamLevels + (rack.hasGroundLevel ? 1 : 0);

  // Responsive padding based on container width
  const padding = containerWidth < 640 ? 20 : 40;
  const svgWidth = containerWidth;

  // Font size scaling for mobile
  const isMobile = containerWidth < 640;
  const fontScale = isMobile ? 1.3 : 1;

  const viewProps = { view, setView, rackType, svgRef, handleExportPNG, fontScale };

  return (
    <div ref={containerRef} className="space-y-0">
      {view === 'top' && (
        <TopView
          {...viewProps}
          layout={layout}
          svgWidth={svgWidth}
          padding={padding}
          bayWidth={bayWidth}
          frameDepth={frameDepth}
        />
      )}
      {view === 'front' && (
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
      )}
      {view === 'side' && (
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
      )}

      {/* Quote prompt after export */}
      {showQuotePrompt && (
        <div className="animate-fade-in bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Need a formal quotation?
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Our engineering team will review your specs and provide CAD drawings,
                structural calculations, and a binding quote within 24 hours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotePrompt(false)}
              className="text-amber-400 hover:text-amber-600 shrink-0 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowQuotePrompt(false);
                // Scroll to CTA section
                document.querySelector('[data-cta]')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Request Free Quote
            </button>
            <button
              type="button"
              onClick={() => setShowQuotePrompt(false)}
              className="px-4 py-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Shared view toolbar
// ============================================================
function ViewToolbar({ view, setView, rackType, handleExportPNG, fontScale }: { view: ViewType; setView: (v: ViewType) => void; rackType: string; handleExportPNG: () => void; fontScale: number }) {
  const views: { key: ViewType; label: string }[] = [
    { key: 'top', label: 'Plan' },
    { key: 'front', label: 'Front' },
    { key: 'side', label: 'Side' },
  ];

  const rackColor = rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6';

  return (
    <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium text-slate-600" style={{ fontSize: `${12 * fontScale}px` }}>
          {view === 'top' ? 'Floor Plan' : view === 'front' ? 'Front Elevation' : 'Side Elevation'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                view === v.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ fontSize: `${11 * fontScale}px` }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExportPNG}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          style={{ fontSize: `${11 * fontScale}px` }}
          title="Export as PNG"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">PNG</span>
        </button>
      </div>
    </div>
  );
}

function Legend({ rackType, hasColumn, fontScale }: { rackType: string; hasColumn?: boolean; fontScale: number }) {
  const rackColor = rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6';

  return (
    <div className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: rackColor, opacity: 0.3, border: `1.5px solid ${rackColor}` }} />
        <span style={{ fontSize: `${11 * fontScale}px` }}>Rack Row</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
        <span style={{ fontSize: `${11 * fontScale}px` }}>Aisle</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm border-2 border-dashed border-slate-300" />
        <span style={{ fontSize: `${11 * fontScale}px` }}>Wall</span>
      </div>
      {hasColumn && (
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 font-bold" style={{ fontSize: `${12 * fontScale}px`, lineHeight: 1 }}>×</span>
          <span style={{ fontSize: `${11 * fontScale}px` }}>Column</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Top-down plan view
// ============================================================
function TopView({ layout, rackType, svgWidth, padding, bayWidth, frameDepth, view, setView, svgRef, handleExportPNG, fontScale }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2) / (layout.warehouseLength / 1000),
    400 / (layout.warehouseWidth / 1000)
  );
  const svgHeight = Math.max(300, (layout.warehouseWidth / 1000) * scale + padding * 2);
  const hasColumns = layout.columnPositions && layout.columnPositions.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} fontScale={fontScale} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ minHeight: 300 }}
        data-view="top"
      >
        <defs>
          <pattern id="grid" width={1000 * scale} height={1000 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`} fill="none" stroke={COLORS.gridLine} strokeWidth="0.5" />
          </pattern>
          {/* Ground hatch pattern */}
          <pattern id="ground-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={COLORS.groundHatch} strokeWidth="1" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding})`}>
          {/* Warehouse outline */}
          <rect
            x={0} y={0}
            width={layout.warehouseLength / 1000 * scale}
            height={layout.warehouseWidth / 1000 * scale}
            fill={COLORS.grid} stroke={COLORS.borderLight} strokeWidth="1.5" strokeDasharray="6 3" rx="2"
          />
          {/* Grid overlay */}
          <rect x={0} y={0} width={layout.warehouseLength / 1000 * scale} height={layout.warehouseWidth / 1000 * scale} fill="url(#grid)" />

          {/* Dimension labels */}
          <text x={layout.warehouseLength / 1000 * scale / 2} y={-8} textAnchor="middle" fontSize={9 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{formatMm(layout.warehouseLength)}</text>
          <text x={-8} y={layout.warehouseWidth / 1000 * scale / 2} textAnchor="middle" fontSize={9 * fontScale} fill={COLORS.textMuted} fontFamily="monospace" transform={`rotate(-90, -8, ${layout.warehouseWidth / 1000 * scale / 2})`}>{formatMm(layout.warehouseWidth)}</text>

          {layout.elements.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;

            if (el.type === 'aisle') {
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill={COLORS.aisle} />
                  <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{el.label}</text>
                </g>
              );
            }
            if (el.type === 'rack-row') {
              const color = el.color || COLORS.rackStroke;
              const frameDepthPx = (frameDepth / 1000) * scale;
              const bayWidthPx = (bayWidth / 1000) * scale;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={frameDepthPx} fill={COLORS.rackFill} stroke={color} strokeWidth="1" strokeOpacity="0.3" />
                  {/* Bay dividers */}
                  {Array.from({ length: Math.floor(w / bayWidthPx) + 1 }).map((_, j) => (
                    <line key={`bay-${j}`} x1={x + j * bayWidthPx} y1={y} x2={x + j * bayWidthPx} y2={y + frameDepthPx} stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
                  ))}
                  <text x={x + 3} y={y + frameDepthPx / 2 + 3} fontSize={7 * fontScale} fill={color} fillOpacity="0.7" fontFamily="monospace">{el.label}</text>
                </g>
              );
            }
            return null;
          })}

          {/* Column markers */}
          {hasColumns && layout.columnPositions.map((col: { x: number; y: number }, i: number) => {
            const cx = (col.x / 1000) * scale;
            const cy = (col.y / 1000) * scale;
            const s = 4 * fontScale;
            return (
              <g key={`col-${i}`}>
                <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={COLORS.column} strokeWidth="1.5" strokeOpacity="0.5" />
                <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={COLORS.column} strokeWidth="1.5" strokeOpacity="0.5" />
              </g>
            );
          })}

          {/* North arrow */}
          {(() => {
            const nx = layout.warehouseLength / 1000 * scale - 20;
            const ny = 20;
            return (
              <g transform={`translate(${nx}, ${ny})`}>
                <line x1="0" y1="8" x2="0" y2="-8" stroke={COLORS.textMuted} strokeWidth="1" />
                <polygon points="0,-10 -3,-4 3,-4" fill={COLORS.textMuted} />
                <text x="0" y="-14" textAnchor="middle" fontSize={7 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">N</text>
              </g>
            );
          })()}

          {/* Scale bar */}
          {(() => {
            const scaleBarM = 10; // 10 meters
            const scaleBarPx = scaleBarM * 1000 / 1000 * scale;
            const barY = layout.warehouseWidth / 1000 * scale + 16;
            return (
              <g>
                <line x1={0} y1={barY} x2={scaleBarPx} y2={barY} stroke={COLORS.textMuted} strokeWidth="1" />
                <line x1={0} y1={barY - 3} x2={0} y2={barY + 3} stroke={COLORS.textMuted} strokeWidth="1" />
                <line x1={scaleBarPx} y1={barY - 3} x2={scaleBarPx} y2={barY + 3} stroke={COLORS.textMuted} strokeWidth="1" />
                <text x={scaleBarPx / 2} y={barY + 12} textAnchor="middle" fontSize={7 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{scaleBarM}m</text>
              </g>
            );
          })()}
        </g>
      </svg>

      <Legend rackType={rackType} hasColumn={hasColumns} fontScale={fontScale} />
    </div>
  );
}

// ============================================================
// Front elevation view
// ============================================================
function FrontView({ rackType, svgWidth, padding, bayWidth, frameHeight, beamSectionHeight, firstBeamBottom, palletHeight, palletWidth, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, baysPerRow, uprightSelection, view, setView, svgRef, handleExportPNG, fontScale }: any) {
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

  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) levels.push({ bottomMm: 0, isGround: true });
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} fontScale={fontScale} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ minHeight: 400 }}
        data-view="front"
      >
        <defs>
          <pattern id="grid-front" width={1000 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${1000 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke={COLORS.gridLine} strokeWidth="0.3" />
          </pattern>
          <pattern id="ground-hatch-front" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={COLORS.groundHatch} strokeWidth="0.8" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding + 10})`}>
          {/* Grid background */}
          <rect width={totalPx} height={frameHPx} fill={COLORS.grid} />

          {/* Floor line with hatch */}
          <line x1={-10} y1={frameHPx} x2={totalPx + 10} y2={frameHPx} stroke={COLORS.ground} strokeWidth="2" />
          <rect x={-10} y={frameHPx} width={totalPx + 20} height="12" fill="url(#ground-hatch-front)" />

          {/* Each bay */}
          {Array.from({ length: maxDisplayBays }).map((_, bayIdx) => {
            const bayStartX = bayIdx * bayWidth / 1000 * scale;
            const bayEndX = (bayIdx + 1) * bayWidth / 1000 * scale;

            return (
              <g key={`bay-${bayIdx}`}>
                {/* Upright columns */}
                {bayIdx === 0 && (
                  <rect x={-uprightPx / 2} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />
                )}
                <rect x={bayStartX - uprightPx / 2} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />
                {bayIdx === maxDisplayBays - 1 && (
                  <rect x={bayEndX - uprightPx / 2} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />
                )}

                {/* Pallets and beams at each level */}
                {levels.map((lvl, lvlIdx) => {
                  const beamBottomPx = (frameHeight - lvl.bottomMm) / 1000 * scale;
                  const palletTopPx = beamBottomPx - palletHPx;
                  const beamTopPx = beamBottomPx - beamHPx;
                  const beamYLabel = lvl.isGround ? 'G' : `L${lvlIdx - (hasGroundLevel ? 1 : 0)}`;

                  return (
                    <g key={`lvl-${lvlIdx}`}>
                      {/* Beam */}
                      {!lvl.isGround && (
                        <>
                          <rect x={bayStartX} y={beamTopPx} width={bayEndX - bayStartX} height={beamHPx} fill={COLORS.beamFill} rx="0.5" />
                          <circle cx={bayStartX} cy={beamTopPx + beamHPx / 2} r={1.5} fill={COLORS.beam} />
                        </>
                      )}

                      {/* Pallets */}
                      {Array.from({ length: palletsPerLevel }).map((_, pIdx) => {
                        const palletGap = 100 / 1000 * scale;
                        const palletStartX = bayStartX + 100 / 1000 * scale + pIdx * (palletWPx + palletGap);
                        return (
                          <g key={`p-${lvlIdx}-${pIdx}`}>
                            <rect x={palletStartX} y={palletTopPx} width={palletWPx} height={palletHPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.8" strokeOpacity={COLORS.palletStrokeOpacity} rx="1" />
                            <line x1={palletStartX} y1={palletTopPx + palletHPx} x2={palletStartX + palletWPx} y2={palletTopPx + palletHPx} stroke={COLORS.palletStroke} strokeWidth="1" strokeOpacity="0.4" />
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
          <g>
            <line x1={totalPx + 16} y1={0} x2={totalPx + 16} y2={frameHPx} stroke={COLORS.dimension} strokeWidth="0.8" />
            <line x1={totalPx + 12} y1={0} x2={totalPx + 20} y2={0} stroke={COLORS.dimension} strokeWidth="0.8" />
            <line x1={totalPx + 12} y1={frameHPx} x2={totalPx + 20} y2={frameHPx} stroke={COLORS.dimension} strokeWidth="0.8" />
            <text x={totalPx + 22} y={frameHPx / 2 + 3} textAnchor="start" fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{formatMm(frameHeight)}</text>
          </g>

          {/* Level labels on left */}
          {levels.map((lvl, i) => {
            const y = (frameHeight - lvl.bottomMm) / 1000 * scale;
            return (
              <g key={`lbl-${i}`}>
                <line x1={-4} y1={y} x2={0} y2={y} stroke={COLORS.dimension} strokeWidth="0.5" />
                <text x={-6} y={y + 3} textAnchor="end" fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
                  {lvl.isGround ? 'G' : `L${i - (hasGroundLevel ? 1 : 0)}`}
                </text>
              </g>
            );
          })}

          {/* Scale bar */}
          {(() => {
            const scaleBarM = 2;
            const scaleBarPx = scaleBarM * 1000 / 1000 * scale;
            const barY = frameHPx + 24;
            return (
              <g>
                <line x1={0} y1={barY} x2={scaleBarPx} y2={barY} stroke={COLORS.textMuted} strokeWidth="1" />
                <line x1={0} y1={barY - 3} x2={0} y2={barY + 3} stroke={COLORS.textMuted} strokeWidth="1" />
                <line x1={scaleBarPx} y1={barY - 3} x2={scaleBarPx} y2={barY + 3} stroke={COLORS.textMuted} strokeWidth="1" />
                <text x={scaleBarPx / 2} y={barY + 12} textAnchor="middle" fontSize={7 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{scaleBarM}m</text>
              </g>
            );
          })()}
        </g>
      </svg>

      <Legend rackType={rackType} fontScale={fontScale} />
    </div>
  );
}

// ============================================================
// Side elevation view
// ============================================================
function SideView({ rackType, svgWidth, padding, frameDepth, frameHeight, beamSectionHeight, firstBeamBottom, palletDepth, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, uprightSelection, view, setView, svgRef, handleExportPNG, fontScale }: any) {
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
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} fontScale={fontScale} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ minHeight: 400 }}
        data-view="side"
      >
        <defs>
          <pattern id="grid-side" width={500 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${500 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke={COLORS.gridLine} strokeWidth="0.3" />
          </pattern>
          <pattern id="ground-hatch-side" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={COLORS.groundHatch} strokeWidth="0.8" />
          </pattern>
        </defs>
        <g transform={`translate(${padding}, ${padding + 10})`}>
          {/* Grid background */}
          <rect width={depthPx} height={frameHPx} fill={COLORS.grid} />

          {/* Floor line with hatch */}
          <line x1={-10} y1={frameHPx} x2={depthPx + uprightPx + 10} y2={frameHPx} stroke={COLORS.ground} strokeWidth="2" />
          <rect x={-10} y={frameHPx} width={depthPx + uprightPx + 20} height="12" fill="url(#ground-hatch-side)" />

          {/* Left upright (front column) */}
          <rect x={0} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />
          {/* Right upright (back column) */}
          <rect x={depthPx - uprightPx} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />

          {/* Bracing between uprights */}
          <g opacity="0.35">
            {(() => {
              const innerLeft = uprightPx;
              const innerRight = depthPx - uprightPx;
              const innerW = innerRight - innerLeft;
              const lines: JSX.Element[] = [];

              if (bracingType === 'D') {
                const totalH = nHoriz + nDiag;
                const spacing = frameHPx / (totalH + 1);
                for (let d = 0; d < nDiag; d++) {
                  const y1 = spacing * (d * 2 + 1);
                  const y2 = spacing * (d * 2 + 3);
                  lines.push(<line key={`d-${d}`} x1={innerLeft} y1={y1} x2={innerRight} y2={y2} stroke={COLORS.bracing} strokeWidth="1" />);
                }
                for (let h = 0; h < nHoriz; h++) {
                  const y = spacing * (h * 2 + 2);
                  if (y < frameHPx) {
                    lines.push(<line key={`h-${h}`} x1={innerLeft} y1={y} x2={innerRight} y2={y} stroke={COLORS.bracing} strokeWidth="1" />);
                  }
                }
              } else {
                const segH = frameHPx / nDiag;
                for (let d = 0; d < nDiag; d++) {
                  const y1 = d * segH;
                  const y2 = (d + 1) * segH;
                  const goRight = d % 2 === 0;
                  lines.push(
                    <line key={`d-${d}`}
                      x1={goRight ? innerLeft : innerRight} y1={y1}
                      x2={goRight ? innerRight : innerLeft} y2={y2}
                      stroke={COLORS.bracing} strokeWidth="1"
                    />
                  );
                }
                for (let h = 0; h < nHoriz; h++) {
                  const y = h * (frameHPx / (nHoriz + 1));
                  lines.push(<line key={`h-${h}`} x1={innerLeft} y1={y} x2={innerRight} y2={y} stroke={COLORS.bracing} strokeWidth="1" />);
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
            const levelLabel = lvl.isGround ? 'G' : `L${lvlIdx - (hasGroundLevel ? 1 : 0)}`;

            return (
              <g key={`side-lvl-${lvlIdx}`}>
                {!lvl.isGround && (
                  <rect x={0} y={beamTopPx} width={depthPx} height={beamHPx} fill={COLORS.beamFill} rx="0.5" />
                )}
                <rect x={palletX} y={palletTopPx} width={palletDPx} height={palletHPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.8" strokeOpacity={COLORS.palletStrokeOpacity} rx="1" />
                <line x1={palletX} y1={palletTopPx + palletHPx} x2={palletX + palletDPx} y2={palletTopPx + palletHPx} stroke={COLORS.palletStroke} strokeWidth="1" strokeOpacity="0.4" />
                <text x={depthPx + 8} y={beamTopPx + beamHPx / 2 + 3} textAnchor="start" fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
                  {levelLabel}
                </text>
              </g>
            );
          })}

          {/* Depth dimension */}
          <g>
            <line x1={0} y1={frameHPx + 16} x2={depthPx} y2={frameHPx + 16} stroke={COLORS.dimension} strokeWidth="0.8" />
            <line x1={0} y1={frameHPx + 12} x2={0} y2={frameHPx + 20} stroke={COLORS.dimension} strokeWidth="0.8" />
            <line x1={depthPx} y1={frameHPx + 12} x2={depthPx} y2={frameHPx + 20} stroke={COLORS.dimension} strokeWidth="0.8" />
            <text x={depthPx / 2} y={frameHPx + 28} textAnchor="middle" fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{formatMm(frameDepth)}</text>
          </g>

          {/* Height dimension on right */}
          <g>
            <line x1={depthPx + uprightPx + 8} y1={0} x2={depthPx + uprightPx + 8} y2={frameHPx} stroke={COLORS.dimension} strokeWidth="0.8" />
            <line x1={depthPx + uprightPx + 4} y1={0} x2={depthPx + uprightPx + 12} y2={0} stroke={COLORS.dimension} strokeWidth="0.8" />
            <line x1={depthPx + uprightPx + 4} y1={frameHPx} x2={depthPx + uprightPx + 12} y2={frameHPx} stroke={COLORS.dimension} strokeWidth="0.8" />
            <text x={depthPx + uprightPx + 14} y={frameHPx / 2 + 3} textAnchor="start" fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{formatMm(frameHeight)}</text>
          </g>

          {/* Scale bar */}
          {(() => {
            const scaleBarM = 1;
            const scaleBarPx = scaleBarM * 1000 / 1000 * scale;
            const barY = frameHPx + 40;
            return (
              <g>
                <line x1={0} y1={barY} x2={scaleBarPx} y2={barY} stroke={COLORS.textMuted} strokeWidth="1" />
                <line x1={0} y1={barY - 3} x2={0} y2={barY + 3} stroke={COLORS.textMuted} strokeWidth="1" />
                <line x1={scaleBarPx} y1={barY - 3} x2={scaleBarPx} y2={barY + 3} stroke={COLORS.textMuted} strokeWidth="1" />
                <text x={scaleBarPx / 2} y={barY + 12} textAnchor="middle" fontSize={7 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{scaleBarM}m</text>
              </g>
            );
          })()}
        </g>
      </svg>

      <Legend rackType={rackType} fontScale={fontScale} />
    </div>
  );
}
