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
  borderLight: '#94a3b8',
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  upright: '#374151',
  beam: '#b45309',
  beamFill: 'rgba(217,119,6,0.65)',
  palletFill: 'rgba(59,130,246,0.10)',
  palletStroke: '#3b82f6',
  palletStrokeOpacity: 0.45,
  aisle: '#f8fafc',
  rackFill: 'rgba(59,130,246,0.05)',
  rackStroke: '#3b82f6',
  column: '#ef4444',
  dimension: '#64748b',
  bracing: '#64748b',
  ground: '#1e293b',
  groundHatch: '#cbd5e1',
  titleBlockBg: '#f8fafc',
  titleBlockBorder: '#cbd5e1',
} as const;

// Drawing frame margins (px at 1:1 SVG scale)
const OUTER_MARGIN = 12;
const INNER_MARGIN = 4;
const TITLE_BLOCK_H = 48;
const TITLE_BLOCK_W = 260;

// ============================================================
// Title block component — standard engineering drawing format
// ============================================================
function TitleBlock({
  view, scale, totalWidth, totalHeight, innerX, innerY, innerW, innerH,
  warehouseLength, warehouseWidth, frameHeight, bayWidth, frameDepth,
  rackType, beamLevels, palletsPerLevel, baysPerRow, rackRows,
  fontScale,
}: {
  view: string;
  scale: number;
  totalWidth: number;
  totalHeight: number;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
  warehouseLength: number;
  warehouseWidth: number;
  frameHeight: number;
  bayWidth: number;
  frameDepth: number;
  rackType: string;
  beamLevels: number;
  palletsPerLevel: number;
  baysPerRow: number;
  rackRows: number;
  fontScale: number;
}) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const viewLabels: Record<string, string> = {
    top: 'PLAN VIEW',
    front: 'FRONT ELEVATION',
    side: 'SIDE ELEVATION',
  };
  const rackTypeLabels: Record<string, string> = {
    'selective': 'Selective Racking',
    'drive-in': 'Drive-In Racking',
    'radio-shuttle': 'Radio Shuttle',
  };
  const scaleRatio = Math.round(1 / scale * 1000);

  const tbX = totalWidth - TITLE_BLOCK_W;
  const tbY = totalHeight - TITLE_BLOCK_H;

  return (
    <g>
      {/* Title block background */}
      <rect x={tbX} y={tbY} width={TITLE_BLOCK_W} height={TITLE_BLOCK_H} fill={COLORS.titleBlockBg} stroke={COLORS.titleBlockBorder} strokeWidth="0.5" />

      {/* Divider lines */}
      <line x1={tbX} y1={tbY + 16} x2={tbX + TITLE_BLOCK_W} y2={tbY + 16} stroke={COLORS.titleBlockBorder} strokeWidth="0.3" />
      <line x1={tbX} y1={tbY + 32} x2={tbX + TITLE_BLOCK_W} y2={tbY + 32} stroke={COLORS.titleBlockBorder} strokeWidth="0.3" />
      <line x1={tbX + 100} y1={tbY} x2={tbX + 100} y2={tbY + 16} stroke={COLORS.titleBlockBorder} strokeWidth="0.3" />
      <line x1={tbX + 180} y1={tbY} x2={tbX + 180} y2={tbY + 16} stroke={COLORS.titleBlockBorder} strokeWidth="0.3" />
      <line x1={tbX + 100} y1={tbY + 16} x2={tbX + 100} y2={tbY + 32} stroke={COLORS.titleBlockBorder} strokeWidth="0.3" />
      <line x1={tbX + 100} y1={tbY + 32} x2={tbX + 100} y2={totalHeight} stroke={COLORS.titleBlockBorder} strokeWidth="0.3" />

      {/* RackingHub branding */}
      <text x={tbX + 4} y={tbY + 11} fontSize={9 * fontScale} fill={COLORS.border} fontFamily="system-ui, sans-serif" fontWeight="700" letterSpacing="0.5">RACKINGHUB</text>
      <text x={tbX + 4} y={tbY + 26} fontSize={5.5 * fontScale} fill={COLORS.textMuted} fontFamily="system-ui, sans-serif">rackinghub.com</text>

      {/* Drawing title */}
      <text x={tbX + 104} y={tbY + 11} fontSize={8 * fontScale} fill={COLORS.textPrimary} fontFamily="system-ui, sans-serif" fontWeight="600">{viewLabels[view] || view.toUpperCase()}</text>

      {/* Scale */}
      <text x={tbX + 184} y={tbY + 11} fontSize={7 * fontScale} fill={COLORS.textSecondary} fontFamily="monospace">SCALE 1:{scaleRatio}</text>

      {/* Date */}
      <text x={tbX + 4} y={tbY + 43} fontSize={6 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{dateStr}</text>

      {/* Racking type */}
      <text x={tbX + 104} y={tbY + 43} fontSize={6 * fontScale} fill={COLORS.textSecondary} fontFamily="system-ui, sans-serif">{rackTypeLabels[rackType] || rackType}</text>

      {/* Units note — bottom row spanning full width */}
      <text x={tbX + 4} y={totalHeight - 4} fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="system-ui, sans-serif" fontStyle="italic">ALL DIMENSIONS IN MM UNLESS NOTED</text>

      {/* Configuration summary */}
      {view === 'top' && (
        <text x={tbX + 184} y={tbY + 43} fontSize={5.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
          {baysPerRow}×{rackRows} bays
        </text>
      )}
      {view === 'front' && (
        <text x={tbX + 184} y={tbY + 43} fontSize={5.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
          {beamLevels}L × {palletsPerLevel}P
        </text>
      )}
      {view === 'side' && (
        <text x={tbX + 184} y={tbY + 43} fontSize={5.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
          {rackRows} rows
        </text>
      )}
    </g>
  );
}

// ============================================================
// Drawing frame — outer + inner border
// ============================================================
function DrawingFrame({ totalWidth, totalHeight, innerX, innerY, innerW, innerH }: { totalWidth: number; totalHeight: number; innerX: number; innerY: number; innerW: number; innerH: number }) {
  return (
    <g>
      {/* Outer border */}
      <rect x={0} y={0} width={totalWidth} height={totalHeight} fill="none" stroke={COLORS.border} strokeWidth="1.5" />
      {/* Inner border */}
      <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="none" stroke={COLORS.borderLight} strokeWidth="0.5" />
    </g>
  );
}

// ============================================================
// Scale bar — professional engineering style
// ============================================================
function ScaleBar({ x, y, lengthMm, scale, fontScale, label }: { x: number; y: number; lengthMm: number; scale: number; fontScale: number; label?: string }) {
  const px = (lengthMm / 1000) * scale;
  return (
    <g>
      <line x1={x} y1={y} x2={x + px} y2={y} stroke={COLORS.textMuted} strokeWidth="0.8" />
      <line x1={x} y1={y - 3} x2={x} y2={y + 3} stroke={COLORS.textMuted} strokeWidth="0.8" />
      <line x1={x + px} y1={y - 3} x2={x + px} y2={y + 3} stroke={COLORS.textMuted} strokeWidth="0.8" />
      {/* Mid tick */}
      <line x1={x + px / 2} y1={y - 2} x2={x + px / 2} y2={y + 2} stroke={COLORS.textMuted} strokeWidth="0.5" />
      <text x={x + px / 2} y={y + 10} textAnchor="middle" fontSize={6 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">
        {label ?? `${lengthMm / 1000}m`}
      </text>
    </g>
  );
}

// ============================================================
// Dimension line helper — AutoCAD style with tick marks
// ============================================================
function DimensionLine({
  x1, y1, x2, y2, label, offset = 0, vertical = false, fontSize = 8, tickLen = 3,
}: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; vertical?: boolean; fontSize?: number; tickLen?: number }) {
  const off = vertical ? -offset : offset;
  const ex1 = vertical ? x1 + off : x1;
  const ey1 = vertical ? y1 : y1 + off;
  const ex2 = vertical ? x2 + off : x2;
  const ey2 = vertical ? y2 : y2 + off;

  return (
    <g>
      <line x1={ex1} y1={ey1} x2={ex2} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.5" />
      {vertical ? (
        <>
          <line x1={x1} y1={y1} x2={ex1} y2={ey1} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={x2} y1={y2} x2={ex2} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={ex1 - tickLen} y1={ey1} x2={ex1 + tickLen} y2={ey1} stroke={COLORS.dimension} strokeWidth="0.6" />
          <line x1={ex2 - tickLen} y1={ey2} x2={ex2 + tickLen} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.6" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={ex1} y2={ey1} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={x2} y1={y2} x2={ex2} y2={ey2} stroke={COLORS.dimension} strokeWidth="0.3" />
          <line x1={ex1} y1={ey1 - tickLen} x2={ex1} y2={ey1 + tickLen} stroke={COLORS.dimension} strokeWidth="0.6" />
          <line x1={ex2} y1={ey2 - tickLen} x2={ex2} y2={ey2 + tickLen} stroke={COLORS.dimension} strokeWidth="0.6" />
        </>
      )}
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

export function LayoutCanvas() {
  const { layout, rackType, rack, pallet, uprightSelection, beamSelection, warehouse } = usePlannerStore();
  const [view, setView] = useState<ViewType>('top');
  const [showQuotePrompt, setShowQuotePrompt] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

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
          <p className="text-sm text-slate-400">Adjust parameters to generate layout</p>
        </div>
      </div>
    );
  }

  const frameDepth = pallet.depth - 100;
  const bayWidth = rack.palletsPerLevel * pallet.width + (rack.palletsPerLevel - 1) * 100 + 2 * 100;
  const beamSectionHeight = beamSelection?.heightMm ?? 120;
  const firstBeamBottom = rack.firstBeamHeight;
  const lastLevelBeamBottom = firstBeamBottom + (rack.beamLevels - 1) * (pallet.height + 100);
  const frameHeight = lastLevelBeamBottom + beamSectionHeight + 100;
  const totalLevels = rack.beamLevels + (rack.hasGroundLevel ? 1 : 0);

  const isMobile = containerWidth < 640;
  const fontScale = isMobile ? 1.3 : 1;

  const viewProps = { view, setView, rackType, svgRef, handleExportPNG, fontScale };

  return (
    <div ref={containerRef} className="space-y-0">
      {view === 'top' && (
        <TopView
          {...viewProps}
          layout={layout}
          containerWidth={containerWidth}
          bayWidth={bayWidth}
          frameDepth={frameDepth}
          columnSpacingX={warehouse.columnSpacingX}
          columnSpacingY={warehouse.columnSpacingY}
          pallet={pallet}
          rack={rack}
          wallClearance={warehouse.wallClearance}
          warehouseLength={warehouse.length}
          warehouseWidth={warehouse.width}
          rackType={rackType}
          beamLevels={rack.beamLevels}
          palletsPerLevel={rack.palletsPerLevel}
          baysPerRow={layout.baysPerRow}
          rackRows={layout.rackRows}
        />
      )}
      {view === 'front' && (
        <FrontView
          {...viewProps}
          containerWidth={containerWidth}
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
          warehouseHeight={warehouse.height}
          rackType={rackType}
          beamLevelsParam={rack.beamLevels}
          palletsPerLevelParam={rack.palletsPerLevel}
        />
      )}
      {view === 'side' && (
        <SideView
          {...viewProps}
          containerWidth={containerWidth}
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
          rackRows={layout.rackRows}
          aisleWidth={rack.aisleWidth}
          warehouseHeight={warehouse.height}
          rackType={rackType}
          beamLevelsParam={rack.beamLevels}
          palletsPerLevelParam={rack.palletsPerLevel}
        />
      )}

      {showQuotePrompt && (
        <div className="animate-fade-in bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Need a formal quotation?</p>
              <p className="text-xs text-amber-700 mt-1">
                Our engineering team will review your specs and provide CAD drawings,
                structural calculations, and a binding quote within 24 hours.
              </p>
            </div>
            <button type="button" onClick={() => setShowQuotePrompt(false)} className="text-amber-400 hover:text-amber-600 shrink-0 ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => { setShowQuotePrompt(false); document.querySelector('[data-cta]')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Request Free Quote
            </button>
            <button type="button" onClick={() => setShowQuotePrompt(false)} className="px-4 py-2 text-sm text-amber-600 hover:text-amber-800 font-medium">
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Shared view toolbar (HTML, not part of drawing)
// ============================================================
function ViewToolbar({ view, setView, rackType, handleExportPNG, fontScale }: { view: ViewType; setView: (v: ViewType) => void; rackType: string; handleExportPNG: () => void; fontScale: number }) {
  const views: { key: ViewType; label: string }[] = [
    { key: 'top', label: 'Plan' },
    { key: 'front', label: 'Front' },
    { key: 'side', label: 'Side' },
  ];

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
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${view === v.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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

// ============================================================
// Top-down plan view — engineering drawing style
// ============================================================
function TopView(props: any) {
  const { layout, svgRef, containerWidth, fontScale, bayWidth, frameDepth, wallClearance, columnSpacingX, columnSpacingY, pallet, rack, warehouseLength, warehouseWidth, rackType, beamLevels, palletsPerLevel, baysPerRow, rackRows, view, setView, handleExportPNG } = props;

  // Content area sizing
  const contentPad = 20; // padding inside inner border
  const contentW = layout.warehouseLength / 1000; // meters
  const contentH = layout.warehouseWidth / 1000; // meters
  const availW = containerWidth - OUTER_MARGIN * 2 - INNER_MARGIN * 2 - contentPad * 2 - TITLE_BLOCK_W;
  const availH = 500 - OUTER_MARGIN * 2 - INNER_MARGIN * 2 - contentPad * 2 - TITLE_BLOCK_H;

  const scale = Math.min(availW / contentW, availH / contentH, 40);
  const contentPxW = contentW * scale;
  const contentPxH = contentH * scale;

  // Total SVG dimensions
  const totalW = containerWidth;
  const totalH = Math.max(400, contentPxH + (OUTER_MARGIN + INNER_MARGIN + contentPad) * 2 + TITLE_BLOCK_H + 10);

  // Inner drawing area
  const innerX = OUTER_MARGIN + INNER_MARGIN;
  const innerY = OUTER_MARGIN + INNER_MARGIN;
  const innerW = totalW - (OUTER_MARGIN + INNER_MARGIN) * 2;
  const innerH = totalH - (OUTER_MARGIN + INNER_MARGIN) * 2;

  // Content position (centered within inner area, above title block)
  const drawingAreaH = innerH - TITLE_BLOCK_H;
  const contentX = innerX + contentPad + (innerW - contentPad * 2 - TITLE_BLOCK_W - contentPxW) / 2;
  const contentY = innerY + contentPad + (drawingAreaH - contentPad * 2 - contentPxH) / 2;

  const lenPx = contentPxW;
  const widPx = contentPxH;
  const hasColumns = layout.columnPositions && layout.columnPositions.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} fontScale={fontScale} />

      <svg ref={svgRef} viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ minHeight: 380 }} data-view="top">
        <defs>
          <pattern id="grid-top" width={1000 / 1000 * scale} height={1000 / 1000 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke={COLORS.gridLine} strokeWidth="0.3" />
          </pattern>
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.white} />

        {/* Drawing frame */}
        <DrawingFrame totalWidth={totalW} totalHeight={totalH} innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH} />

        <g transform={`translate(${contentX}, ${contentY})`}>
          {/* Warehouse outline */}
          <rect x={0} y={0} width={lenPx} height={widPx} fill={COLORS.grid} stroke={COLORS.borderLight} strokeWidth="1" strokeDasharray="4 2" rx="1" />
          <rect x={0} y={0} width={lenPx} height={widPx} fill="url(#grid-top)" />

          {/* Wall clearance zone */}
          {(() => {
            const clearPx = (wallClearance / 1000) * scale;
            return (
              <g>
                <rect x={0} y={0} width={lenPx} height={clearPx} fill="rgba(148,163,184,0.06)" />
                <rect x={0} y={widPx - clearPx} width={lenPx} height={clearPx} fill="rgba(148,163,184,0.06)" />
                <rect x={0} y={0} width={clearPx} height={widPx} fill="rgba(148,163,184,0.06)" />
                <rect x={lenPx - clearPx} y={0} width={clearPx} height={widPx} fill="rgba(148,163,184,0.06)" />
              </g>
            );
          })()}

          {/* Warehouse dimension lines */}
          <DimensionLine x1={0} y1={0} x2={lenPx} y2={0} label={formatMm(layout.warehouseLength)} offset={14} fontSize={7 * fontScale} />
          <DimensionLine x1={0} y1={0} x2={0} y2={widPx} label={formatMm(layout.warehouseWidth)} offset={14} vertical fontSize={7 * fontScale} />

          {/* Wall clearance dims */}
          {(() => {
            const clearPx = (wallClearance / 1000) * scale;
            return (
              <g>
                <DimensionLine x1={clearPx / 2} y1={0} x2={clearPx / 2} y2={clearPx} label={formatMm(wallClearance)} offset={-8} vertical fontSize={5.5 * fontScale} />
                <DimensionLine x1={0} y1={clearPx / 2} x2={clearPx} y2={clearPx / 2} label={formatMm(wallClearance)} offset={-8} fontSize={5.5 * fontScale} />
              </g>
            );
          })()}

          {/* Column spacing dimensions */}
          {hasColumns && layout.columnPositions.length > 0 && (() => {
            const xSet = new Set<number>();
            const ySet = new Set<number>();
            layout.columnPositions.forEach((c: { x: number; y: number }) => { xSet.add(c.x); ySet.add(c.y); });
            const xPositions = Array.from(xSet).sort((a, b) => a - b);
            const yPositions = Array.from(ySet).sort((a, b) => a - b);
            const els: JSX.Element[] = [];
            for (let i = 0; i < xPositions.length - 1; i++) {
              const x1 = xPositions[i], x2 = xPositions[i + 1];
              const y = yPositions.length > 0 ? yPositions[0] : 0;
              els.push(<DimensionLine key={`csx-${i}`} x1={(x1 / 1000) * scale} y1={(y / 1000) * scale - 6} x2={(x2 / 1000) * scale} y2={(y / 1000) * scale - 6} label={formatMm(x2 - x1)} offset={6} fontSize={5.5 * fontScale} />);
            }
            for (let i = 0; i < yPositions.length - 1; i++) {
              const y1 = yPositions[i], y2 = yPositions[i + 1];
              const x = xPositions.length > 0 ? xPositions[0] : 0;
              els.push(<DimensionLine key={`csy-${i}`} x1={(x / 1000) * scale - 6} y1={(y1 / 1000) * scale} x2={(x / 1000) * scale - 6} y2={(y2 / 1000) * scale} label={formatMm(y2 - y1)} offset={6} vertical fontSize={5.5 * fontScale} />);
            }
            return els;
          })()}

          {/* Rack rows and pallets */}
          {(() => {
            const els = layout.elements;
            let rowNum = 0;
            const wcOffsetX = (wallClearance / 1000) * scale;
            const wcOffsetY = (wallClearance / 1000) * scale;

            return els.map((el: any, i: number) => {
              const x = (el.x / 1000) * scale + wcOffsetX;
              const y = (el.y / 1000) * scale + wcOffsetY;
              const w = (el.width / 1000) * scale;
              const h = (el.height / 1000) * scale;

              if (el.type === 'aisle') {
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={w} height={h} fill={COLORS.aisle} />
                    <text x={x + 4} y={y + h / 2 + 3} fontSize={6.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{el.label}</text>
                  </g>
                );
              }
              if (el.type === 'rack-row') {
                rowNum++;
                const isBackToBack = els[i + 1]?.type === 'rack-row';
                const color = el.color || COLORS.rackStroke;
                const frameDepthPx = (frameDepth / 1000) * scale;
                const bayWidthPx = (bayWidth / 1000) * scale;
                const numBays = Math.floor(w / bayWidthPx);
                const palletWPx = (pallet.width / 1000) * scale;
                const palletDPx = (pallet.depth / 1000) * scale;
                const palletGapPx = (100 / 1000) * scale;
                const palletToUprightPx = (100 / 1000) * scale;
                const uprightPx = Math.max(2, Math.min(6, frameDepthPx * 0.07));

                return (
                  <g key={i}>
                    <rect x={x} y={y} width={w} height={frameDepthPx} fill={COLORS.rackFill} stroke={color} strokeWidth="0.8" strokeOpacity="0.35" />
                    {Array.from({ length: numBays + 1 }).map((_, j) => (
                      <rect key={`bay-${j}`} x={x + j * bayWidthPx - uprightPx / 2} y={y} width={uprightPx} height={frameDepthPx} fill={COLORS.upright} opacity="0.45" rx="0.5" />
                    ))}
                    {Array.from({ length: numBays }).map((_, bayIdx) => {
                      const bayStartX = x + bayIdx * bayWidthPx + palletToUprightPx;
                      return (
                        <g key={`pallets-${bayIdx}`}>
                          {Array.from({ length: rack.palletsPerLevel }).map((_, pIdx) => {
                            const palletX = bayStartX + pIdx * (palletWPx + palletGapPx);
                            const palletY = y + (frameDepthPx - palletDPx) / 2;
                            return (
                              <rect key={`p-${bayIdx}-${pIdx}`} x={palletX} y={palletY} width={palletWPx} height={palletDPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.5" strokeOpacity="0.5" rx="0.5" />
                            );
                          })}
                        </g>
                      );
                    })}
                    <text x={x + 3} y={y + frameDepthPx / 2 + 3} fontSize={6 * fontScale} fill={color} fillOpacity="0.65" fontFamily="monospace">R{rowNum}{isBackToBack ? ' (B2B)' : ''}</text>
                    <DimensionLine key={`bw-${i}`} x1={x} y1={y + frameDepthPx + 12} x2={x + bayWidthPx} y2={y + frameDepthPx + 12} label={formatMm(bayWidth)} offset={-6} fontSize={5.5 * fontScale} />
                  </g>
                );
              }
              return null;
            });
          })()}

          {/* Column markers */}
          {hasColumns && layout.columnPositions.map((col: { x: number; y: number }, i: number) => {
            const cx = (col.x / 1000) * scale;
            const cy = (col.y / 1000) * scale;
            const s = 3.5 * fontScale;
            return (
              <g key={`col-${i}`}>
                <circle cx={cx} cy={cy} r={2.5 * fontScale} fill="none" stroke={COLORS.column} strokeWidth="0.8" strokeOpacity="0.5" />
                <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={COLORS.column} strokeWidth="1.2" strokeOpacity="0.5" />
                <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={COLORS.column} strokeWidth="1.2" strokeOpacity="0.5" />
              </g>
            );
          })}

          {/* Column grid label */}
          {hasColumns && (() => {
            const cx = (columnSpacingX / 1000) * scale / 2;
            const cy = (columnSpacingY / 1000) * scale / 2;
            return (
              <g>
                <rect x={cx - 24 * fontScale} y={cy - 7 * fontScale} width={48 * fontScale} height={14 * fontScale} rx={2} fill="white" stroke={COLORS.column} strokeWidth="0.4" strokeOpacity="0.4" />
                <text x={cx} y={cy + 3 * fontScale} textAnchor="middle" fontSize={5.5 * fontScale} fill={COLORS.column} fontFamily="monospace" fontWeight="600">{formatMm(columnSpacingX)}×{formatMm(columnSpacingY)}</text>
              </g>
            );
          })()}

          {/* North arrow */}
          {(() => {
            const nx = lenPx - 16;
            const ny = 16;
            return (
              <g transform={`translate(${nx}, ${ny})`}>
                <line x1="0" y1="6" x2="0" y2="-6" stroke={COLORS.textMuted} strokeWidth="0.8" />
                <polygon points="0,-8 -2.5,-3 2.5,-3" fill={COLORS.textMuted} />
                <text x="0" y="-11" textAnchor="middle" fontSize={6 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">N</text>
              </g>
            );
          })()}

          {/* Scale bar */}
          <ScaleBar x={4} y={widPx + 14} lengthMm={10000} scale={scale} fontScale={fontScale} />
        </g>

        {/* Title block */}
        <TitleBlock
          view="top" scale={scale} totalWidth={totalW} totalHeight={totalH}
          innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH}
          warehouseLength={warehouseLength} warehouseWidth={warehouseWidth}
          frameHeight={0} bayWidth={bayWidth} frameDepth={frameDepth}
          rackType={rackType} beamLevels={beamLevels} palletsPerLevel={palletsPerLevel}
          baysPerRow={baysPerRow} rackRows={rackRows} fontScale={fontScale}
        />
      </svg>
    </div>
  );
}

// ============================================================
// Front elevation view — engineering drawing style
// ============================================================
function FrontView(props: any) {
  const { svgRef, containerWidth, fontScale, bayWidth, frameHeight, beamSectionHeight, firstBeamBottom, palletHeight, palletWidth, beamLevels, hasGroundLevel, palletsPerLevel, baysPerRow, uprightSelection, warehouseHeight, rackType, view, setView, handleExportPNG } = props;

  const displayBays = baysPerRow >= 2 ? 2 : 1;
  const totalWidthMm = bayWidth * displayBays;
  const scale = Math.min((containerWidth - OUTER_MARGIN * 2 - INNER_MARGIN * 2 - 60 - TITLE_BLOCK_W) / (totalWidthMm / 1000), 500 / (frameHeight / 1000), 40);

  const totalPx = totalWidthMm / 1000 * scale;
  const frameHPx = frameHeight / 1000 * scale;
  const uprightPx = Math.max(5, Math.min(12, totalPx / displayBays * 0.035));
  const beamHPx = Math.max(3, Math.min(8, beamSectionHeight / 1000 * scale));
  const palletHPx = palletHeight / 1000 * scale;
  const palletWPx = palletWidth / 1000 * scale;
  const ceilPx = warehouseHeight / 1000 * scale;

  const groundY = frameHPx + 40;
  const ceilY = groundY - ceilPx;
  const rackTopY = groundY - frameHPx;

  const contentH = groundY + 60;
  const totalW = containerWidth;
  const totalH = contentH + OUTER_MARGIN * 2 + INNER_MARGIN * 2 + TITLE_BLOCK_H + 10;

  const innerX = OUTER_MARGIN + INNER_MARGIN;
  const innerY = OUTER_MARGIN + INNER_MARGIN;
  const innerW = totalW - (OUTER_MARGIN + INNER_MARGIN) * 2;
  const innerH = totalH - (OUTER_MARGIN + INNER_MARGIN) * 2;

  const leftLabelSpace = 24;
  const contentX = innerX + leftLabelSpace;

  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) levels.push({ bottomMm: 0, isGround: true });
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

  const heightDimX = totalPx + 16;
  const bayClearSpanPx = bayWidth / 1000 * scale - uprightPx;
  const bayClearSpanMm = Math.round(bayClearSpanPx / scale * 1000);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} fontScale={fontScale} />

      <svg ref={svgRef} viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ minHeight: 380 }} data-view="front">
        <defs>
          <pattern id="ground-hatch-front" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={COLORS.groundHatch} strokeWidth="0.6" />
          </pattern>
        </defs>

        <rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.white} />
        <DrawingFrame totalWidth={totalW} totalHeight={totalH} innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH} />

        <g transform={`translate(${contentX}, ${innerY})`}>
          {/* Ceiling line */}
          <line x1={-8} y1={ceilY} x2={totalPx + 8} y2={ceilY} stroke={COLORS.textMuted} strokeWidth="0.8" strokeDasharray="5 3" />

          {/* Floor line with hatch */}
          <line x1={-8} y1={groundY} x2={totalPx + 8} y2={groundY} stroke={COLORS.ground} strokeWidth="1.5" />
          <rect x={-8} y={groundY} width={totalPx + 16} height="10" fill="url(#ground-hatch-front)" />

          {/* Each bay */}
          {Array.from({ length: displayBays }).map((_, bayIdx) => {
            const bayStartX = bayIdx * bayWidth / 1000 * scale;
            const bayEndX = (bayIdx + 1) * bayWidth / 1000 * scale;

            return (
              <g key={`bay-${bayIdx}`}>
                {bayIdx === 0 && <rect x={-uprightPx / 2} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />}
                <rect x={bayStartX - uprightPx / 2} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />
                {bayIdx === displayBays - 1 && <rect x={bayEndX - uprightPx / 2} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />}

                {levels.map((lvl, lvlIdx) => {
                  const beamTopY = groundY - lvl.bottomMm / 1000 * scale;
                  const beamBottomY = beamTopY + beamHPx;
                  const palletBottomY = lvl.isGround ? groundY : beamTopY;
                  const palletTopY = palletBottomY - palletHPx;

                  return (
                    <g key={`lvl-${lvlIdx}`}>
                      {!lvl.isGround && <rect x={bayStartX} y={beamTopY} width={bayEndX - bayStartX} height={beamHPx} fill={COLORS.beamFill} rx="0.3" />}
                      {Array.from({ length: palletsPerLevel }).map((_, pIdx) => {
                        const palletGap = 100 / 1000 * scale;
                        const palletStartX = bayStartX + 100 / 1000 * scale + pIdx * (palletWPx + palletGap);
                        return (
                          <g key={`p-${lvlIdx}-${pIdx}`}>
                            <rect x={palletStartX} y={palletTopY} width={palletWPx} height={palletHPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.6" strokeOpacity={COLORS.palletStrokeOpacity} rx="0.5" />
                            <line x1={palletStartX} y1={palletBottomY} x2={palletStartX + palletWPx} y2={palletBottomY} stroke={COLORS.palletStroke} strokeWidth="0.8" strokeOpacity="0.35" />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Break lines */}
          {baysPerRow > displayBays && (() => {
            const zigW = 3; const zigN = 6;
            const zigH = frameHPx / (zigN * 2);
            const leftPath = Array.from({ length: zigN * 2 + 1 }).map((_, i) => `${i % 2 === 0 ? -uprightPx / 2 - zigW : -uprightPx / 2 + zigW},${rackTopY + i * zigH}`).join(' ');
            const rightPath = Array.from({ length: zigN * 2 + 1 }).map((_, i) => `${i % 2 === 0 ? totalPx + uprightPx / 2 - zigW : totalPx + uprightPx / 2 + zigW},${rackTopY + i * zigH}`).join(' ');
            return <g><polyline points={leftPath} fill="none" stroke={COLORS.textMuted} strokeWidth="0.4" /><polyline points={rightPath} fill="none" stroke={COLORS.textMuted} strokeWidth="0.4" /></g>;
          })()}

          {/* Height dimensions */}
          {(() => {
            const x = heightDimX;
            return (
              <g>
                <line x1={x} y1={groundY} x2={x} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.5" />
                <line x1={x - 2.5} y1={groundY} x2={x + 2.5} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={x - 2.5} y1={rackTopY} x2={x + 2.5} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={0} y1={groundY} x2={x - 3} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <line x1={totalPx} y1={rackTopY} x2={x - 3} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <text x={x + 3} y={(groundY + rackTopY) / 2 + 3} textAnchor="start" fontSize={6.5 * fontScale} fill={COLORS.upright} fontFamily="monospace" fontWeight="600">{formatMm(frameHeight)}</text>
              </g>
            );
          })()}

          {/* Per-level dimensions */}
          {(() => {
            const dimX = heightDimX + 38 * fontScale;
            const els: JSX.Element[] = [];

            for (let i = 0; i < levels.length; i++) {
              const lvl = levels[i];
              const beamTopY = groundY - lvl.bottomMm / 1000 * scale;
              const levelLabel = lvl.isGround ? 'G' : `L${i - (hasGroundLevel ? 1 : 0)}`;

              els.push(<text key={`ll-${i}`} x={-6} y={beamTopY + 3} textAnchor="end" fontSize={6.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{levelLabel}</text>);

              if (!lvl.isGround) {
                els.push(
                  <g key={`btl-${i}`}>
                    <line x1={totalPx} y1={beamTopY} x2={totalPx + 3} y2={beamTopY} stroke={COLORS.beam} strokeWidth="0.4" />
                    <text x={totalPx + 5} y={beamTopY + 3} textAnchor="start" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(lvl.bottomMm)}</text>
                  </g>
                );
              }

              if (!lvl.isGround && i > 0) {
                const prevLvl = levels[i - 1];
                const prevBeamTopY = groundY - prevLvl.bottomMm / 1000 * scale;
                const prevPalletTopY = prevBeamTopY - palletHPx;
                const levelGapMm = lvl.bottomMm - prevLvl.bottomMm;
                const midY = (prevPalletTopY + beamTopY) / 2;

                els.push(
                  <g key={`hdim-${i}`}>
                    <line x1={dimX} y1={prevPalletTopY} x2={dimX} y2={beamTopY} stroke={COLORS.dimension} strokeWidth="0.5" />
                    <line x1={dimX - 2} y1={prevPalletTopY} x2={dimX + 2} y2={prevPalletTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                    <line x1={dimX - 2} y1={beamTopY} x2={dimX + 2} y2={beamTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                    <text x={dimX + 3} y={midY + 3} textAnchor="start" fontSize={5.5 * fontScale} fill={COLORS.textSecondary} fontFamily="monospace" fontWeight="600">{formatMm(levelGapMm)}</text>
                  </g>
                );

                const beamMidY = beamTopY + beamHPx / 2;
                const spanLabelY = beamTopY + 12;
                els.push(
                  <g key={`bspan-${i}`}>
                    <line x1={uprightPx / 2} y1={spanLabelY} x2={bayWidth / 1000 * scale - uprightPx / 2} y2={spanLabelY} stroke={COLORS.beam} strokeWidth="0.5" />
                    <line x1={uprightPx / 2} y1={spanLabelY - 2} x2={uprightPx / 2} y2={spanLabelY + 2} stroke={COLORS.beam} strokeWidth="0.7" />
                    <line x1={bayWidth / 1000 * scale - uprightPx / 2} y1={spanLabelY - 2} x2={bayWidth / 1000 * scale - uprightPx / 2} y2={spanLabelY + 2} stroke={COLORS.beam} strokeWidth="0.7" />
                    <text x={bayWidth / 1000 * scale / 2} y={spanLabelY + 10} textAnchor="middle" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(bayClearSpanMm)}</text>
                  </g>
                );
              }
            }
            return els;
          })()}

          {/* Bay width dimension */}
          {(() => {
            const bayW = bayWidth / 1000 * scale;
            const bayY = groundY + 20;
            return (
              <g>
                <line x1={0} y1={bayY} x2={bayW} y2={bayY} stroke={COLORS.dimension} strokeWidth="0.5" />
                <line x1={0} y1={bayY - 2} x2={0} y2={bayY + 2} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={bayW} y1={bayY - 2} x2={bayW} y2={bayY + 2} stroke={COLORS.dimension} strokeWidth="0.7" />
                <text x={bayW / 2} y={bayY + 10} textAnchor="middle" fontSize={5.5 * fontScale} fill={COLORS.textSecondary} fontFamily="monospace" fontWeight="600">{formatMm(bayWidth)}</text>
              </g>
            );
          })()}

          {/* First beam height — left */}
          {(() => {
            if (levels.length > 1 && !levels[0].isGround) {
              const firstLvl = levels[0];
              const firstBeamTopY = groundY - firstLvl.bottomMm / 1000 * scale;
              return (
                <g>
                  <line x1={-10} y1={groundY} x2={-10} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.5" />
                  <line x1={-12} y1={groundY} x2={-8} y2={groundY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <line x1={-12} y1={firstBeamTopY} x2={-8} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <text x={-13} y={(groundY + firstBeamTopY) / 2 + 3} textAnchor="end" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(firstLvl.bottomMm)}</text>
                </g>
              );
            }
            if (hasGroundLevel && levels.length > 1) {
              const firstBeamLvl = levels[1];
              const firstBeamTopY = groundY - firstBeamLvl.bottomMm / 1000 * scale;
              const groundPalletTopY = groundY - palletHPx;
              const gapMm = firstBeamLvl.bottomMm - palletHeight;
              return (
                <g>
                  <line x1={-10} y1={groundPalletTopY} x2={-10} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.5" />
                  <line x1={-12} y1={groundPalletTopY} x2={-8} y2={groundPalletTopY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <line x1={-12} y1={firstBeamTopY} x2={-8} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <text x={-13} y={(groundPalletTopY + firstBeamTopY) / 2 + 3} textAnchor="end" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(gapMm)}</text>
                </g>
              );
            }
            return null;
          })()}

          {/* Scale bar */}
          <ScaleBar x={4} y={groundY + 40} lengthMm={2000} scale={scale} fontScale={fontScale} />
        </g>

        <TitleBlock
          view="front" scale={scale} totalWidth={totalW} totalHeight={totalH}
          innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH}
          warehouseLength={0} warehouseWidth={0} frameHeight={frameHeight}
          bayWidth={bayWidth} frameDepth={0} rackType={rackType}
          beamLevels={beamLevels} palletsPerLevel={palletsPerLevel}
          baysPerRow={baysPerRow} rackRows={0} fontScale={fontScale}
        />
      </svg>
    </div>
  );
}

// ============================================================
// Side elevation view — engineering drawing style
// ============================================================
function SideView(props: any) {
  const { svgRef, containerWidth, fontScale, frameDepth, frameHeight, beamSectionHeight, firstBeamBottom, palletDepth, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, rackRows, aisleWidth, warehouseHeight, rackType, view, setView, handleExportPNG } = props;

  const hasBackToBack = rackRows >= 2;
  const displayRows = hasBackToBack ? 3 : 1;
  const backToBackGap = 200;
  const palletOverhang = 50;
  const totalWidthMm = frameDepth * displayRows + (hasBackToBack ? aisleWidth + backToBackGap : 0);

  const scale = Math.min((containerWidth - OUTER_MARGIN * 2 - INNER_MARGIN * 2 - 60 - TITLE_BLOCK_W) / Math.max(totalWidthMm / 1000, 0.8), 500 / (frameHeight / 1000), 40);

  const totalPx = totalWidthMm / 1000 * scale;
  const frameHPx = frameHeight / 1000 * scale;
  const uprightPx = Math.max(4, Math.min(10, frameDepth / 1000 * scale * 0.05));
  const beamHPx = Math.max(3, Math.min(7, beamSectionHeight / 1000 * scale));
  const palletDPx = palletDepth / 1000 * scale;
  const palletHPx = palletHeight / 1000 * scale;
  const ceilPx = warehouseHeight / 1000 * scale;

  const groundY = frameHPx + 40;
  const ceilY = groundY - ceilPx;
  const rackTopY = groundY - frameHPx;

  const contentH = groundY + 60;
  const totalW = containerWidth;
  const totalH = contentH + OUTER_MARGIN * 2 + INNER_MARGIN * 2 + TITLE_BLOCK_H + 10;

  const innerX = OUTER_MARGIN + INNER_MARGIN;
  const innerY = OUTER_MARGIN + INNER_MARGIN;
  const innerW = totalW - (OUTER_MARGIN + INNER_MARGIN) * 2;
  const innerH = totalH - (OUTER_MARGIN + INNER_MARGIN) * 2;

  const leftLabelSpace = 20;
  const contentX = innerX + leftLabelSpace;

  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) levels.push({ bottomMm: 0, isGround: true });
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

  const heightDimX = totalPx + 16;
  const frameClearSpanPx = frameDepth / 1000 * scale - uprightPx;
  const frameClearSpanMm = Math.round(frameClearSpanPx / scale * 1000);

  const rowOffsets: number[] = [];
  let currentX = 0;
  for (let i = 0; i < displayRows; i++) {
    rowOffsets.push(currentX);
    currentX += frameDepth / 1000 * scale;
    if (hasBackToBack && i === 0) currentX += aisleWidth / 1000 * scale;
    if (hasBackToBack && i === 1) currentX += backToBackGap / 1000 * scale;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} fontScale={fontScale} />

      <svg ref={svgRef} viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ minHeight: 380 }} data-view="side">
        <defs>
          <pattern id="ground-hatch-side" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={COLORS.groundHatch} strokeWidth="0.6" />
          </pattern>
        </defs>

        <rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.white} />
        <DrawingFrame totalWidth={totalW} totalHeight={totalH} innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH} />

        <g transform={`translate(${contentX}, ${innerY})`}>
          {/* Ceiling line */}
          <line x1={-8} y1={ceilY} x2={totalPx + 8} y2={ceilY} stroke={COLORS.textMuted} strokeWidth="0.8" strokeDasharray="5 3" />

          {/* Floor */}
          <line x1={-8} y1={groundY} x2={totalPx + 8} y2={groundY} stroke={COLORS.ground} strokeWidth="1.5" />
          <rect x={-8} y={groundY} width={totalPx + 16} height="10" fill="url(#ground-hatch-side)" />

          {/* Each rack row */}
          {rowOffsets.map((rowX, rowIdx) => {
            const rowEndX = rowX + frameDepth / 1000 * scale;
            return (
              <g key={`row-${rowIdx}`}>
                <rect x={rowX} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />
                <rect x={rowEndX - uprightPx} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />

                {levels.map((lvl, lvlIdx) => {
                  const beamTopY = groundY - lvl.bottomMm / 1000 * scale;
                  const beamBottomY = beamTopY + beamHPx;
                  const palletBottomY = lvl.isGround ? groundY : beamTopY;
                  const palletTopY = palletBottomY - palletHPx;

                  const overhangPx = palletOverhang / 1000 * scale;
                  let palletX: number;
                  if (hasBackToBack && rowIdx === 1) palletX = rowEndX + overhangPx - palletDPx;
                  else if (hasBackToBack && rowIdx === 2) palletX = rowX - overhangPx;
                  else palletX = rowX + (frameDepth / 1000 * scale - palletDPx) / 2;

                  return (
                    <g key={`side-r${rowIdx}-l${lvlIdx}`}>
                      {!lvl.isGround && <rect x={rowX} y={beamTopY} width={frameDepth / 1000 * scale} height={beamHPx} fill={COLORS.beamFill} rx="0.3" />}
                      <rect x={palletX} y={palletTopY} width={palletDPx} height={palletHPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.6" strokeOpacity={COLORS.palletStrokeOpacity} rx="0.5" />
                      <line x1={palletX} y1={palletBottomY} x2={palletX + palletDPx} y2={palletBottomY} stroke={COLORS.palletStroke} strokeWidth="0.8" strokeOpacity="0.35" />
                    </g>
                  );
                })}

                {rowIdx === 0 && <text x={rowX + frameDepth / 1000 * scale / 2} y={groundY + 10} textAnchor="middle" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">R1</text>}
                {rowIdx === 1 && <text x={rowX + frameDepth / 1000 * scale / 2} y={groundY + 10} textAnchor="middle" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">R2</text>}
                {rowIdx === 2 && <text x={rowX + frameDepth / 1000 * scale / 2} y={groundY + 10} textAnchor="middle" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">R{rackRows}</text>}
              </g>
            );
          })}

          {/* Height dimensions */}
          {(() => {
            const x = heightDimX;
            return (
              <g>
                <line x1={x} y1={groundY} x2={x} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.5" />
                <line x1={x - 2.5} y1={groundY} x2={x + 2.5} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={x - 2.5} y1={rackTopY} x2={x + 2.5} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={0} y1={groundY} x2={x - 3} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <line x1={totalPx} y1={rackTopY} x2={x - 3} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <text x={x + 3} y={(groundY + rackTopY) / 2 + 3} textAnchor="start" fontSize={6.5 * fontScale} fill={COLORS.upright} fontFamily="monospace" fontWeight="600">{formatMm(frameHeight)}</text>
              </g>
            );
          })()}

          {/* Per-level dimensions and beam top height labels */}
          {(() => {
            const dimX = heightDimX + 38 * fontScale;
            const els: JSX.Element[] = [];
            const r0x = rowOffsets[0];
            const r0end = r0x + frameDepth / 1000 * scale;

            for (let i = 0; i < levels.length; i++) {
              const lvl = levels[i];
              const beamTopY = groundY - lvl.bottomMm / 1000 * scale;
              const levelLabel = lvl.isGround ? 'G' : `L${i - (hasGroundLevel ? 1 : 0)}`;

              els.push(<text key={`ll-${i}`} x={-5} y={beamTopY + 3} textAnchor="end" fontSize={6.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{levelLabel}</text>);

              if (!lvl.isGround) {
                els.push(
                  <g key={`btl-${i}`}>
                    <line x1={r0end - uprightPx} y1={beamTopY} x2={r0end - uprightPx + 3} y2={beamTopY} stroke={COLORS.beam} strokeWidth="0.4" />
                    <text x={r0end - uprightPx + 5} y={beamTopY + 3} textAnchor="start" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(lvl.bottomMm)}</text>
                  </g>
                );
              }

              if (!lvl.isGround && i > 0) {
                const prevLvl = levels[i - 1];
                const prevBeamTopY = groundY - prevLvl.bottomMm / 1000 * scale;
                const prevPalletTopY = prevBeamTopY - palletHPx;
                const levelGapMm = lvl.bottomMm - prevLvl.bottomMm;
                const midY = (prevPalletTopY + beamTopY) / 2;

                els.push(
                  <g key={`hdim-${i}`}>
                    <line x1={dimX} y1={prevPalletTopY} x2={dimX} y2={beamTopY} stroke={COLORS.dimension} strokeWidth="0.5" />
                    <line x1={dimX - 2} y1={prevPalletTopY} x2={dimX + 2} y2={prevPalletTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                    <line x1={dimX - 2} y1={beamTopY} x2={dimX + 2} y2={beamTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                    <text x={dimX + 3} y={midY + 3} textAnchor="start" fontSize={5.5 * fontScale} fill={COLORS.textSecondary} fontFamily="monospace" fontWeight="600">{formatMm(levelGapMm)}</text>
                  </g>
                );

                // Frame clear span
                const spanLabelY = beamTopY + 12;
                els.push(
                  <g key={`fspan-${i}`}>
                    <line x1={r0x + uprightPx / 2} y1={spanLabelY} x2={r0end - uprightPx / 2} y2={spanLabelY} stroke={COLORS.beam} strokeWidth="0.5" />
                    <line x1={r0x + uprightPx / 2} y1={spanLabelY - 2} x2={r0x + uprightPx / 2} y2={spanLabelY + 2} stroke={COLORS.beam} strokeWidth="0.7" />
                    <line x1={r0end - uprightPx / 2} y1={spanLabelY - 2} x2={r0end - uprightPx / 2} y2={spanLabelY + 2} stroke={COLORS.beam} strokeWidth="0.7" />
                    <text x={(r0x + uprightPx / 2 + r0end - uprightPx / 2) / 2} y={spanLabelY + 10} textAnchor="middle" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(frameClearSpanMm)}</text>
                  </g>
                );
              }
            }
            return els;
          })()}

          {/* Aisle dimension */}
          {hasBackToBack && (() => {
            const aisleStartX = rowOffsets[1] + frameDepth / 1000 * scale;
            const aisleEndX = rowOffsets[2];
            const aisleY = groundY + 20;
            return (
              <g>
                <line x1={aisleStartX} y1={aisleY} x2={aisleEndX} y2={aisleY} stroke={COLORS.dimension} strokeWidth="0.5" />
                <line x1={aisleStartX} y1={aisleY - 2} x2={aisleStartX} y2={aisleY + 2} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={aisleEndX} y1={aisleY - 2} x2={aisleEndX} y2={aisleY + 2} stroke={COLORS.dimension} strokeWidth="0.7" />
                <text x={(aisleStartX + aisleEndX) / 2} y={aisleY + 10} textAnchor="middle" fontSize={5.5 * fontScale} fill={COLORS.textSecondary} fontFamily="monospace" fontWeight="600">{formatMm(aisleWidth)}</text>
              </g>
            );
          })()}

          {/* Row spacer */}
          {hasBackToBack && (() => {
            const spacerStartX = rowOffsets[1] + frameDepth / 1000 * scale;
            const spacerEndX = rowOffsets[2];
            return (
              <g>
                <line x1={spacerStartX} y1={rackTopY} x2={spacerStartX} y2={groundY} stroke={COLORS.column} strokeWidth="0.4" strokeDasharray="3 2" strokeOpacity="0.4" />
                <line x1={spacerEndX} y1={rackTopY} x2={spacerEndX} y2={groundY} stroke={COLORS.column} strokeWidth="0.4" strokeDasharray="3 2" strokeOpacity="0.4" />
                <DimensionLine x1={spacerStartX} y1={rackTopY + 6} x2={spacerEndX} y2={rackTopY + 6} label={formatMm(backToBackGap)} offset={-4} fontSize={5.5 * fontScale} />
              </g>
            );
          })()}

          {/* First beam height — left */}
          {(() => {
            if (levels.length > 1 && !levels[0].isGround) {
              const firstLvl = levels[0];
              const firstBeamTopY = groundY - firstLvl.bottomMm / 1000 * scale;
              return (
                <g>
                  <line x1={-9} y1={groundY} x2={-9} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.5" />
                  <line x1={-11} y1={groundY} x2={-7} y2={groundY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <line x1={-11} y1={firstBeamTopY} x2={-7} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <text x={-12} y={(groundY + firstBeamTopY) / 2 + 3} textAnchor="end" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(firstLvl.bottomMm)}</text>
                </g>
              );
            }
            if (hasGroundLevel && levels.length > 1) {
              const firstBeamLvl = levels[1];
              const firstBeamTopY = groundY - firstBeamLvl.bottomMm / 1000 * scale;
              const groundPalletTopY = groundY - palletHPx;
              const gapMm = firstBeamLvl.bottomMm - palletHeight;
              return (
                <g>
                  <line x1={-9} y1={groundPalletTopY} x2={-9} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.5" />
                  <line x1={-11} y1={groundPalletTopY} x2={-7} y2={groundPalletTopY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <line x1={-11} y1={firstBeamTopY} x2={-7} y2={firstBeamTopY} stroke={COLORS.beam} strokeWidth="0.7" />
                  <text x={-12} y={(groundPalletTopY + firstBeamTopY) / 2 + 3} textAnchor="end" fontSize={5.5 * fontScale} fill={COLORS.beam} fontFamily="monospace" fontWeight="600">{formatMm(gapMm)}</text>
                </g>
              );
            }
            return null;
          })()}

          {/* Scale bar */}
          <ScaleBar x={4} y={groundY + 40} lengthMm={2000} scale={scale} fontScale={fontScale} />
        </g>

        <TitleBlock
          view="side" scale={scale} totalWidth={totalW} totalHeight={totalH}
          innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH}
          warehouseLength={0} warehouseWidth={0} frameHeight={frameHeight}
          bayWidth={0} frameDepth={frameDepth} rackType={rackType}
          beamLevels={beamLevels} palletsPerLevel={palletsPerLevel}
          baysPerRow={0} rackRows={rackRows} fontScale={fontScale}
        />
      </svg>
    </div>
  );
}
