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
  const { layout, rackType, rack, pallet, uprightSelection, beamSelection, warehouse } = usePlannerStore();
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
          columnSpacingX={warehouse.columnSpacingX}
          columnSpacingY={warehouse.columnSpacingY}
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
          rackRows={layout.rackRows}
          aisleWidth={rack.aisleWidth}
          bayWidth={bayWidth}
          baysPerRow={layout.baysPerRow}
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
// Dimension line helper — AutoCAD style with tick marks
// ============================================================
function DimensionLine({
  x1, y1, x2, y2, label, offset = 0, vertical = false, fontSize = 8,
}: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; vertical?: boolean; fontSize?: number }) {
  const off = vertical ? -offset : offset;
  const ex1 = vertical ? x1 + off : x1;
  const ey1 = vertical ? y1 : y1 + off;
  const ex2 = vertical ? x2 + off : x2;
  const ey2 = vertical ? y2 : y2 + off;
  const tick = 3;

  return (
    <g>
      <line x1={ex1} y1={ey1} x2={ex2} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.5" />
      {/* Extension lines */}
      {vertical ? (
        <>
          <line x1={x1} y1={y1} x2={ex1} y2={ey1} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={x2} y1={y2} x2={ex2} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.3" />
          {/* Tick marks */}
          <line x1={ex1 - tick} y1={ey1} x2={ex1 + tick} y2={ey1} stroke={COLORS.dimension} strokeWidth="0.6" />
          <line x1={ex2 - tick} y1={ey2} x2={ex2 + tick} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.6" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={ex1} y2={ey1} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={x2} y1={y2} x2={ex2} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={ex1} y1={ey1 - tick} x2={ex1} y2={ey1 + tick} stroke={COLORS.dimension} strokeWidth="0.6" />
          <line x1={ex2} y1={ey2 - tick} x2={ex2} y2={ey2 + tick} stroke={COLORS.dimension} strokeWidth="0.6" />
        </>
      )}
      {/* Label */}
      <text
        x={vertical ? ex1 + 5 : (ex1 + ex2) / 2}
        y={vertical ? (ey1 + ey2) / 2 + 3 : ey1 - 4}
        textAnchor="middle"
        fontSize={fontSize}
        fill={COLORS.textSecondary}
        fontFamily="monospace"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  );
}

// ============================================================
// Top-down plan view
// ============================================================
function TopView({ layout, rackType, svgWidth, padding, bayWidth, frameDepth, view, setView, svgRef, handleExportPNG, fontScale, columnSpacingX, columnSpacingY }: any) {
  const scale = Math.min(
    (svgWidth - padding * 2) / (layout.warehouseLength / 1000),
    400 / (layout.warehouseWidth / 1000)
  );
  const svgHeight = Math.max(300, (layout.warehouseWidth / 1000) * scale + padding * 2 + 50);
  const hasColumns = layout.columnPositions && layout.columnPositions.length > 0;
  const lenPx = layout.warehouseLength / 1000 * scale;
  const widPx = layout.warehouseWidth / 1000 * scale;
  const dimOff = 18;

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
        </defs>
        <g transform={`translate(${padding}, ${padding})`}>
          {/* Warehouse outline */}
          <rect
            x={0} y={0}
            width={lenPx} height={widPx}
            fill={COLORS.grid} stroke={COLORS.borderLight} strokeWidth="1.5" strokeDasharray="6 3" rx="2"
          />
          {/* Grid overlay */}
          <rect x={0} y={0} width={lenPx} height={widPx} fill="url(#grid)" />

          {/* Warehouse dimension lines */}
          <DimensionLine x1={0} y1={0} x2={lenPx} y2={0} label={formatMm(layout.warehouseLength)} offset={dimOff} fontSize={9 * fontScale} />
          <DimensionLine x1={0} y1={0} x2={0} y2={widPx} label={formatMm(layout.warehouseWidth)} offset={dimOff} vertical fontSize={9 * fontScale} />

          {/* Column spacing dimension (X direction) */}
          {hasColumns && layout.columnPositions.length > 0 && (() => {
            const xSet = new Set<number>();
            const ySet = new Set<number>();
            layout.columnPositions.forEach((c: { x: number; y: number }) => { xSet.add(c.x); ySet.add(c.y); });
            const xPositions = Array.from(xSet).sort((a, b) => a - b);
            const yPositions = Array.from(ySet).sort((a, b) => a - b);
            const els: JSX.Element[] = [];
            // Dimension between adjacent column X positions on top row
            for (let i = 0; i < xPositions.length - 1; i++) {
              const x1 = xPositions[i];
              const x2 = xPositions[i + 1];
              const y = yPositions.length > 0 ? yPositions[0] : 0;
              const cx = ((x1 + x2) / 2 / 1000) * scale;
              const sx1 = (x1 / 1000) * scale;
              const sx2 = (x2 / 1000) * scale;
              const sy = (y / 1000) * scale - 8;
              const spacing = x2 - x1;
              els.push(
                <DimensionLine
                  key={`csx-${i}`}
                  x1={sx1} y1={sy} x2={sx2} y2={sy}
                  label={formatMm(spacing)}
                  offset={8}
                  fontSize={7 * fontScale}
                />
              );
            }
            // Dimension between adjacent column Y positions on left column
            for (let i = 0; i < yPositions.length - 1; i++) {
              const y1 = yPositions[i];
              const y2 = yPositions[i + 1];
              const x = xPositions.length > 0 ? xPositions[0] : 0;
              const sx = (x / 1000) * scale - 8;
              const sy1 = (y1 / 1000) * scale;
              const sy2 = (y2 / 1000) * scale;
              const spacing = y2 - y1;
              els.push(
                <DimensionLine
                  key={`csy-${i}`}
                  x1={sx} y1={sy1} x2={sx} y2={sy2}
                  label={formatMm(spacing)}
                  offset={8}
                  vertical
                  fontSize={7 * fontScale}
                />
              );
            }
            return els;
          })()}

          {layout.elements.map((el: any, i: number) => {
            const x = (el.x / 1000) * scale;
            const y = (el.y / 1000) * scale;
            const w = (el.width / 1000) * scale;
            const h = (el.height / 1000) * scale;

            if (el.type === 'aisle') {
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={h} fill={COLORS.aisle} />
                  <text x={x + 6} y={y + h / 2 + 3} fontSize={8 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{el.label}</text>
                </g>
              );
            }
            if (el.type === 'rack-row') {
              const color = el.color || COLORS.rackStroke;
              const frameDepthPx = (frameDepth / 1000) * scale;
              const bayWidthPx = (bayWidth / 1000) * scale;
              const numBays = Math.floor(w / bayWidthPx);
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={frameDepthPx} fill={COLORS.rackFill} stroke={color} strokeWidth="1" strokeOpacity="0.3" />
                  {/* Bay dividers */}
                  {Array.from({ length: numBays + 1 }).map((_, j) => (
                    <line key={`bay-${j}`} x1={x + j * bayWidthPx} y1={y} x2={x + j * bayWidthPx} y2={y + frameDepthPx} stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
                  ))}
                  <text x={x + 3} y={y + frameDepthPx / 2 + 3} fontSize={7 * fontScale} fill={color} fillOpacity="0.7" fontFamily="monospace">{el.label}</text>
                  {/* Bay width dimension on first bay */}
                  <DimensionLine
                    key={`bw-${i}`}
                    x1={x} y1={y + frameDepthPx + 16} x2={x + bayWidthPx} y2={y + frameDepthPx + 16}
                    label={formatMm(bayWidth)}
                    offset={-8}
                    fontSize={7 * fontScale}
                  />
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
                <circle cx={cx} cy={cy} r={3 * fontScale} fill="none" stroke={COLORS.column} strokeWidth="1" strokeOpacity="0.4" />
                <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={COLORS.column} strokeWidth="1.5" strokeOpacity="0.5" />
                <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={COLORS.column} strokeWidth="1.5" strokeOpacity="0.5" />
              </g>
            );
          })}

          {/* Column grid label */}
          {hasColumns && (() => {
            const cx = columnSpacingX / 1000 * scale / 2;
            const cy = columnSpacingY / 1000 * scale / 2;
            return (
              <g>
                <rect x={cx - 30 * fontScale} y={cy - 8 * fontScale} width={60 * fontScale} height={16 * fontScale} rx={3} fill="white" stroke={COLORS.column} strokeWidth="0.5" strokeOpacity="0.3" />
                <text x={cx} y={cy + 3 * fontScale} textAnchor="middle" fontSize={7 * fontScale} fill={COLORS.column} fontFamily="monospace" fontWeight="600">
                  {formatMm(columnSpacingX)}×{formatMm(columnSpacingY)}
                </text>
              </g>
            );
          })()}

          {/* North arrow */}
          {(() => {
            const nx = lenPx - 20;
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
            const scaleBarM = 10;
            const scaleBarPx = scaleBarM * 1000 / 1000 * scale;
            const barY = widPx + 40;
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

  const svgHeight = Math.max(400, (frameHeight / 1000) * scale + padding * 2 + 50);
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

  // Per-level clear height (distance between beam bottom and beam above / ceiling)
  const levelClearances: { y: number; label: string }[] = [];
  for (let i = 0; i < levels.length - 1; i++) {
    const thisBottom = levels[i].bottomMm;
    const nextBottom = levels[i + 1].bottomMm;
    const clear = nextBottom - thisBottom;
    const yPx = (frameHeight - thisBottom - clear / 2) / 1000 * scale;
    levelClearances.push({ y: yPx, label: formatMm(clear) });
  }
  // Top level to top of frame
  if (levels.length > 0) {
    const topBottom = levels[levels.length - 1].bottomMm;
    const clear = frameHeight - topBottom;
    const yPx = (frameHeight - topBottom - clear / 2) / 1000 * scale;
    levelClearances.push({ y: yPx, label: formatMm(clear) });
  }

  const dimOff = 14;

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

          {/* Bay width dimension */}
          <DimensionLine
            x1={0} y1={frameHPx + 28} x2={bayWidth / 1000 * scale} y2={frameHPx + 28}
            label={formatMm(bayWidth)}
            offset={0}
            fontSize={7 * fontScale}
          />

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

          {/* Total height dimension on right */}
          <DimensionLine x1={totalPx} y1={0} x2={totalPx} y2={frameHPx} label={formatMm(frameHeight)} offset={dimOff} vertical fontSize={8 * fontScale} />

          {/* Per-level clear height annotations */}
          {levelClearances.length > 1 && (() => {
            const hx = -dimOff - 6;
            return (
              <g>
                {levelClearances.map((lc, i) => (
                  <text key={`lc-${i}`} x={hx} y={lc.y + 3} textAnchor="end" fontSize={7 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
                    {lc.label}
                  </text>
                ))}
              </g>
            );
          })()}

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
            const barY = frameHPx + 42;
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
// Side elevation view — shows ALL rack rows from the side
// ============================================================
function SideView({ rackType, svgWidth, padding, frameDepth, frameHeight, beamSectionHeight, firstBeamBottom, palletDepth, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, totalLevels, uprightSelection, view, setView, svgRef, handleExportPNG, fontScale, rackRows, aisleWidth, bayWidth, baysPerRow }: any) {
  const maxDisplayRows = Math.min(rackRows, 8);
  const totalWidthMm = frameDepth * maxDisplayRows + aisleWidth * Math.max(0, maxDisplayRows - 1);

  const scale = Math.min(
    (svgWidth - padding * 2) / Math.max(totalWidthMm / 1000, 0.8),
    450 / (frameHeight / 1000)
  );

  const svgHeight = Math.max(400, (frameHeight / 1000) * scale + padding * 2 + 60);
  const totalPx = totalWidthMm / 1000 * scale;
  const frameHPx = frameHeight / 1000 * scale;
  const frameDPx = frameDepth / 1000 * scale;
  const aislePx = aisleWidth / 1000 * scale;
  const uprightPx = Math.max(4, Math.min(10, frameDPx * 0.05));
  const beamHPx = Math.max(2, Math.min(6, beamSectionHeight / 1000 * scale));
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

  const dimOff = 14;

  // Calculate X offset for each row
  const rowOffsets: number[] = [];
  let currentX = 0;
  for (let i = 0; i < maxDisplayRows; i++) {
    rowOffsets.push(currentX);
    currentX += frameDPx + aislePx;
  }

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
          <rect width={totalPx} height={frameHPx} fill={COLORS.grid} />

          {/* Floor line with hatch */}
          <line x1={-10} y1={frameHPx} x2={totalPx + 10} y2={frameHPx} stroke={COLORS.ground} strokeWidth="2" />
          <rect x={-10} y={frameHPx} width={totalPx + 20} height="12" fill="url(#ground-hatch-side)" />

          {/* Each rack row from the side */}
          {rowOffsets.map((rowX, rowIdx) => {
            const rowEndX = rowX + frameDPx;
            const innerLeft = rowX + uprightPx;
            const innerRight = rowEndX - uprightPx;

            return (
              <g key={`row-${rowIdx}`}>
                {/* Left upright */}
                <rect x={rowX} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />
                {/* Right upright */}
                <rect x={rowEndX - uprightPx} y={0} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="1" />

                {/* Bracing */}
                <g opacity="0.35">
                  {(() => {
                    const lines: JSX.Element[] = [];
                    if (bracingType === 'D') {
                      const totalH = nHoriz + nDiag;
                      const spacing = frameHPx / (totalH + 1);
                      for (let d = 0; d < nDiag; d++) {
                        const y1 = spacing * (d * 2 + 1);
                        const y2 = spacing * (d * 2 + 3);
                        lines.push(<line key={`d-${d}`} x1={innerLeft} y1={y1} x2={innerRight} y2={y2} stroke={COLORS.bracing} strokeWidth="0.8" />);
                      }
                      for (let h = 0; h < nHoriz; h++) {
                        const y = spacing * (h * 2 + 2);
                        if (y < frameHPx) {
                          lines.push(<line key={`h-${h}`} x1={innerLeft} y1={y} x2={innerRight} y2={y} stroke={COLORS.bracing} strokeWidth="0.8" />);
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
                            stroke={COLORS.bracing} strokeWidth="0.8"
                          />
                        );
                      }
                      for (let h = 0; h < nHoriz; h++) {
                        const y = h * (frameHPx / (nHoriz + 1));
                        lines.push(<line key={`h-${h}`} x1={innerLeft} y1={y} x2={innerRight} y2={y} stroke={COLORS.bracing} strokeWidth="0.8" />);
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
                  const levelLabel = lvl.isGround ? 'G' : `L${lvlIdx - (hasGroundLevel ? 1 : 0)}`;
                  // Pallet centered on frame (overhangs 50mm each side = frameDepth = palletDepth - 100)
                  const palletX = rowX + (frameDPx - palletDPx) / 2;

                  return (
                    <g key={`side-r${rowIdx}-l${lvlIdx}`}>
                      {/* Beam across full frame depth */}
                      {!lvl.isGround && (
                        <rect x={rowX} y={beamTopPx} width={frameDPx} height={beamHPx} fill={COLORS.beamFill} rx="0.5" />
                      )}
                      {/* Pallet — centered on frame, overhangs slightly */}
                      <rect x={palletX} y={palletTopPx} width={palletDPx} height={palletHPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.8" strokeOpacity={COLORS.palletStrokeOpacity} rx="1" />
                      <line x1={palletX} y1={palletTopPx + palletHPx} x2={palletX + palletDPx} y2={palletTopPx + palletHPx} stroke={COLORS.palletStroke} strokeWidth="1" strokeOpacity="0.4" />
                      {/* Level label on right side of frame */}
                      <text x={rowEndX + 4} y={beamTopPx + beamHPx / 2 + 3} textAnchor="start" fontSize={7 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
                        {levelLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Row label */}
                <text x={rowX + frameDPx / 2} y={frameHPx + 12} textAnchor="middle" fontSize={6 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
                  R{rowIdx + 1}
                </text>
              </g>
            );
          })}

          {/* Total width dimension at bottom */}
          <DimensionLine x1={0} y1={frameHPx} x2={totalPx} y2={frameHPx} label={formatMm(totalWidthMm)} offset={dimOff + 14} fontSize={8 * fontScale} />

          {/* Total height dimension on right */}
          <DimensionLine x1={totalPx} y1={0} x2={totalPx} y2={frameHPx} label={formatMm(frameHeight)} offset={dimOff} vertical fontSize={8 * fontScale} />

          {/* Scale bar */}
          {(() => {
            const scaleBarM = 2;
            const scaleBarPx = scaleBarM * 1000 / 1000 * scale;
            const barY = frameHPx + 44;
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
