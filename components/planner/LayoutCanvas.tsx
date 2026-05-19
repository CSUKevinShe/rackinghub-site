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
const OUTER_MARGIN = 10;
const INNER_MARGIN = 4;
const TITLE_BLOCK_H = 32;
const TITLE_BLOCK_W = 220;

// ============================================================
// Title block — simple: logo, URL, view name
// ============================================================
function TitleBlock({
  view, scale, totalWidth, totalHeight, fontScale,
}: { view: string; scale: number; totalWidth: number; totalHeight: number; fontScale: number }) {
  const viewLabels: Record<string, string> = {
    top: 'PLAN VIEW',
    front: 'FRONT ELEVATION',
    side: 'SIDE ELEVATION',
  };
  const scaleRatio = Math.round(1 / scale * 1000);
  const tbH = 32;
  const tbW = 220;
  const tbX = totalWidth - tbW;
  const tbY = totalHeight - tbH;

  return (
    <g>
      <rect x={tbX} y={tbY} width={tbW} height={tbH} fill="white" stroke={COLORS.borderLight} strokeWidth="0.5" />
      <line x1={tbX + 80} y1={tbY} x2={tbX + 80} y2={tbY + tbH} stroke={COLORS.borderLight} strokeWidth="0.3" />

      {/* Logo + URL */}
      <text x={tbX + 6} y={tbY + 14} fontSize={9 * fontScale} fill={COLORS.border} fontFamily="system-ui, sans-serif" fontWeight="700" letterSpacing="0.5">RACKINGHUB</text>
      <text x={tbX + 6} y={tbY + 25} fontSize={5.5 * fontScale} fill={COLORS.textMuted} fontFamily="system-ui, sans-serif">rackinghub.com</text>

      {/* View name + scale */}
      <text x={tbX + 86} y={tbY + 14} fontSize={7.5 * fontScale} fill={COLORS.textPrimary} fontFamily="system-ui, sans-serif" fontWeight="600">{viewLabels[view] || view.toUpperCase()}</text>
      <text x={tbX + 86} y={tbY + 25} fontSize={6 * fontScale} fill={COLORS.textSecondary} fontFamily="monospace">SCALE 1:{scaleRatio}</text>
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
  const { layout, rackType, rack, pallet, uprightSelection, beamSelection, warehouse, summary } = usePlannerStore();
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

  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgStr = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.download = `rackinghub-${view}-layout.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
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

  const viewProps = { view, setView, rackType, svgRef, handleExportPNG, handleExportSVG, fontScale };

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
          wallThickness={warehouse.wallThickness}
          columnSize={warehouse.columnSize}
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
          warehouseWidth={warehouse.width}
          wallThickness={warehouse.wallThickness}
          columnSize={warehouse.columnSize}
          columnSpacingX={warehouse.columnSpacingX}
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
          warehouseWidth={warehouse.width}
          wallThickness={warehouse.wallThickness}
          columnSize={warehouse.columnSize}
          columnSpacingY={warehouse.columnSpacingY}
          rackType={rackType}
          beamLevelsParam={rack.beamLevels}
          palletsPerLevelParam={rack.palletsPerLevel}
        />
      )}

      {summary && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard icon="📦" label="Pallet Positions" value={summary.totalPalletPositions.toLocaleString()} />
          <MetricCard icon="📐" label="Space Utilization" value={`${summary.spaceUtilization}%`} />
          <MetricCard icon="⚖️" label="Storage Area" value={`${summary.rackingArea.toLocaleString()}㎡`} />
          <MetricCard icon="💰" label="Est. Total Cost" value={`$${summary.estimatedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
        </div>
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
function ViewToolbar({ view, setView, rackType, handleExportPNG, handleExportSVG, fontScale }: { view: ViewType; setView: (v: ViewType) => void; rackType: string; handleExportPNG: () => void; handleExportSVG: () => void; fontScale: number }) {
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
          onClick={handleExportSVG}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          style={{ fontSize: `${11 * fontScale}px` }}
          title="Export as SVG vector"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">SVG</span>
        </button>
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
// Metric card — compact KPI display
// ============================================================
function MetricCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">{value}</div>
    </div>
  );
}

// ============================================================
// Top-down plan view — engineering drawing style
// ============================================================
function TopView(props: any) {
  const { layout, svgRef, containerWidth, fontScale, bayWidth, frameDepth, wallClearance, wallThickness, columnSize, columnSpacingX, columnSpacingY, pallet, rack, rackType, baysPerRow, rackRows, view, setView, handleExportPNG, handleExportSVG } = props;

  const contentW = layout.warehouseLength / 1000;
  const contentH = layout.warehouseWidth / 1000;
  const drawingPad = 30;

  const availW = containerWidth - OUTER_MARGIN * 2 - INNER_MARGIN * 2 - drawingPad * 2 - TITLE_BLOCK_W;
  const availH = 450 - OUTER_MARGIN * 2 - INNER_MARGIN * 2 - drawingPad * 2 - TITLE_BLOCK_H;

  const scale = Math.min(availW / contentW, availH / contentH, 40);
  const contentPxW = contentW * scale;
  const contentPxH = contentH * scale;

  const totalW = containerWidth;
  const totalH = Math.max(350, contentPxH + (OUTER_MARGIN + INNER_MARGIN + drawingPad) * 2 + TITLE_BLOCK_H + 10);

  const innerX = OUTER_MARGIN + INNER_MARGIN;
  const innerY = OUTER_MARGIN + INNER_MARGIN;
  const innerW = totalW - (OUTER_MARGIN + INNER_MARGIN) * 2;
  const innerH = totalH - (OUTER_MARGIN + INNER_MARGIN) * 2;

  const drawingAreaH = innerH - TITLE_BLOCK_H;
  const contentX = innerX + drawingPad + (innerW - drawingPad * 2 - contentPxW) / 2;
  const contentY = innerY + drawingPad + (drawingAreaH - drawingPad * 2 - contentPxH) / 2;

  const lenPx = contentPxW;
  const widPx = contentPxH;
  const hasColumns = layout.columnPositions && layout.columnPositions.length > 0;
  const wallPx = (wallThickness / 1000) * scale;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} handleExportSVG={handleExportSVG} fontScale={fontScale} />

      <svg ref={svgRef} viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ minHeight: 330 }} data-view="top">
        <rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.white} />
        <DrawingFrame totalWidth={totalW} totalHeight={totalH} innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH} />

        <g transform={`translate(${contentX}, ${contentY})`}>
          {/* Wall fill — solid structural walls outside warehouse boundary */}
          <g>
            {/* Top wall */}
            <rect x={-wallPx} y={-wallPx} width={lenPx + wallPx * 2} height={wallPx} fill={COLORS.groundHatch} opacity="0.3" />
            {/* Bottom wall */}
            <rect x={-wallPx} y={widPx} width={lenPx + wallPx * 2} height={wallPx} fill={COLORS.groundHatch} opacity="0.3" />
            {/* Left wall */}
            <rect x={-wallPx} y={0} width={wallPx} height={widPx} fill={COLORS.groundHatch} opacity="0.3" />
            {/* Right wall */}
            <rect x={lenPx} y={0} width={wallPx} height={widPx} fill={COLORS.groundHatch} opacity="0.3" />
            {/* Wall outer boundary */}
            <rect x={-wallPx} y={-wallPx} width={lenPx + wallPx * 2} height={widPx + wallPx * 2} fill="none" stroke={COLORS.borderLight} strokeWidth="0.5" strokeDasharray="2 1" rx="1" />
          </g>

          {/* Warehouse interior outline */}
          <rect x={0} y={0} width={lenPx} height={widPx} fill={COLORS.grid} stroke={COLORS.borderLight} strokeWidth="1" strokeDasharray="4 2" rx="1" />

          {/* Wall thickness dimension */}
          {(() => {
            if (wallPx < 4) return null; // too small to label
            return (
              <g>
                <rect x={lenPx + 4} y={2} width={wallPx} height={8} fill="none" stroke={COLORS.dimension} strokeWidth="0.3" rx="0.5" />
                <text x={lenPx + 4 + wallPx / 2} y={8} textAnchor="middle" fontSize={4.5 * fontScale} fill={COLORS.dimension} fontFamily="monospace">{wallThickness}</text>
              </g>
            );
          })()}

          {/* Wall clearance zone */}
          {(() => {
            const clearPx = (wallClearance / 1000) * scale;
            return (
              <g>
                <rect x={0} y={0} width={lenPx} height={clearPx} fill="rgba(148,163,184,0.05)" />
                <rect x={0} y={widPx - clearPx} width={lenPx} height={clearPx} fill="rgba(148,163,184,0.05)" />
                <rect x={0} y={0} width={clearPx} height={widPx} fill="rgba(148,163,184,0.05)" />
                <rect x={lenPx - clearPx} y={0} width={clearPx} height={widPx} fill="rgba(148,163,184,0.05)" />
              </g>
            );
          })()}

          {/* Warehouse dimensions */}
          <DimensionLine x1={0} y1={0} x2={lenPx} y2={0} label={formatMm(layout.warehouseLength)} offset={16} fontSize={6.5 * fontScale} />
          <DimensionLine x1={0} y1={0} x2={0} y2={widPx} label={formatMm(layout.warehouseWidth)} offset={16} vertical fontSize={6.5 * fontScale} />

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
                return <rect key={i} x={x} y={y} width={w} height={h} fill={COLORS.aisle} />;
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
                const uprightPx = Math.max(2, Math.min(5, frameDepthPx * 0.06));

                return (
                  <g key={i}>
                    <rect x={x} y={y} width={w} height={frameDepthPx} fill={COLORS.rackFill} stroke={color} strokeWidth="0.6" strokeOpacity="0.3" />
                    {Array.from({ length: numBays + 1 }).map((_, j) => (
                      <rect key={`bay-${j}`} x={x + j * bayWidthPx - uprightPx / 2} y={y} width={uprightPx} height={frameDepthPx} fill={COLORS.upright} opacity="0.4" rx="0.5" />
                    ))}
                    {Array.from({ length: numBays }).map((_, bayIdx) => {
                      const bayStartX = x + bayIdx * bayWidthPx + palletToUprightPx;
                      return (
                        <g key={`pallets-${bayIdx}`}>
                          {Array.from({ length: rack.palletsPerLevel }).map((_, pIdx) => {
                            const palletX = bayStartX + pIdx * (palletWPx + palletGapPx);
                            const palletY = y + (frameDepthPx - palletDPx) / 2;
                            return (
                              <rect key={`p-${bayIdx}-${pIdx}`} x={palletX} y={palletY} width={palletWPx} height={palletDPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.4" strokeOpacity="0.45" rx="0.5" />
                            );
                          })}
                        </g>
                      );
                    })}
                    <text x={x + 2} y={y + frameDepthPx / 2 + 3} fontSize={5.5 * fontScale} fill={color} fillOpacity="0.6" fontFamily="monospace">R{rowNum}{isBackToBack ? ' (B2B)' : ''}</text>
                  </g>
                );
              }
              return null;
            });
          })()}

          {/* Column grid — sized squares */}
          {hasColumns && layout.columnPositions.map((col: { x: number; y: number }, i: number) => {
            const cx = (col.x / 1000) * scale;
            const cy = (col.y / 1000) * scale;
            const halfCol = (columnSize / 1000) * scale / 2;
            return (
              <g key={`col-${i}`}>
                <rect x={cx - halfCol} y={cy - halfCol} width={halfCol * 2} height={halfCol * 2} fill={COLORS.groundHatch} opacity="0.4" stroke={COLORS.column} strokeWidth="0.7" strokeOpacity="0.5" rx="0.5" />
                <line x1={cx - halfCol} y1={cy - halfCol} x2={cx + halfCol} y2={cy + halfCol} stroke={COLORS.column} strokeWidth="0.5" strokeOpacity="0.4" />
                <line x1={cx + halfCol} y1={cy - halfCol} x2={cx - halfCol} y2={cy + halfCol} stroke={COLORS.column} strokeWidth="0.5" strokeOpacity="0.4" />
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
                <rect x={cx - 10 * fontScale} y={cy + 7 * fontScale} width={20 * fontScale} height={8 * fontScale} rx={1} fill="white" stroke={COLORS.column} strokeWidth="0.3" strokeOpacity="0.3" />
                <text x={cx} y={cy + 13 * fontScale} textAnchor="middle" fontSize={4.5 * fontScale} fill={COLORS.column} fontFamily="monospace">{columnSize}×{columnSize}</text>
              </g>
            );
          })()}

          {/* North arrow */}
          {(() => {
            const nx = lenPx - 14;
            const ny = 14;
            return (
              <g transform={`translate(${nx}, ${ny})`}>
                <line x1="0" y1="5" x2="0" y2="-5" stroke={COLORS.textMuted} strokeWidth="0.7" />
                <polygon points="0,-7 -2,-3 2,-3" fill={COLORS.textMuted} />
                <text x="0" y="-10" textAnchor="middle" fontSize={5.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">N</text>
              </g>
            );
          })()}
        </g>

        <TitleBlock view="top" scale={scale} totalWidth={totalW} totalHeight={totalH} fontScale={fontScale} />
      </svg>
    </div>
  );
}

// Single height dimension X position (relative to content transform)
const HEIGHT_DIM_X = 16;

// ============================================================
// Front elevation view — simplified engineering drawing style
// ============================================================
function FrontView(props: any) {
  const { svgRef, containerWidth, fontScale, bayWidth, frameHeight, beamSectionHeight, firstBeamBottom, palletHeight, palletWidth, beamLevels, hasGroundLevel, palletsPerLevel, baysPerRow, warehouseHeight, warehouseWidth, wallThickness, columnSize, columnSpacingX, rackType, view, setView, handleExportPNG, handleExportSVG } = props;

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
  const wallPx = (wallThickness / 1000) * scale;
  const colPx = (columnSize / 1000) * scale;

  const groundY = frameHPx + 40;
  const ceilY = groundY - ceilPx;
  const rackTopY = groundY - frameHPx;

  const contentH = groundY + 30;
  const totalW = containerWidth;
  const totalH = contentH + OUTER_MARGIN * 2 + INNER_MARGIN * 2 + TITLE_BLOCK_H + 10;

  const innerX = OUTER_MARGIN + INNER_MARGIN;
  const innerY = OUTER_MARGIN + INNER_MARGIN;
  const innerW = totalW - (OUTER_MARGIN + INNER_MARGIN) * 2;
  const innerH = totalH - (OUTER_MARGIN + INNER_MARGIN) * 2;

  const contentX = innerX + Math.max(0, (innerW - totalPx) / 2);
  const contentY = innerY + 40;

  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) levels.push({ bottomMm: 0, isGround: true });
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

  // Show columns if columnSpacingX > 0 — render first column at left edge
  const hasColumns = columnSpacingX > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} handleExportSVG={handleExportSVG} fontScale={fontScale} />

      <svg ref={svgRef} viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ minHeight: 330 }} data-view="front">
        <defs>
          <pattern id="ground-hatch-front" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={COLORS.groundHatch} strokeWidth="0.6" />
          </pattern>
          <pattern id="wall-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={COLORS.groundHatch} strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.white} />
        <DrawingFrame totalWidth={totalW} totalHeight={totalH} innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH} />

        <g transform={`translate(${contentX}, ${contentY})`}>
          {/* Roof structure — beam/steel deck */}
          <line x1={-wallPx} y1={ceilY} x2={totalPx + wallPx} y2={ceilY} stroke={COLORS.textMuted} strokeWidth="0.8" strokeDasharray="5 3" />
          {(() => {
            const roofH = 8 * fontScale;
            return (
              <g>
                <rect x={-wallPx} y={ceilY - roofH} width={totalPx + wallPx * 2} height={roofH} fill="rgba(148,163,184,0.08)" stroke={COLORS.textMuted} strokeWidth="0.3" />
                <text x={totalPx / 2} y={ceilY - roofH - 2} textAnchor="middle" fontSize={4.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">Roof Structure</text>
              </g>
            );
          })()}

          {/* Side walls — vertical sections */}
          {wallPx > 0 && (
            <g>
              <rect x={-wallPx} y={groundY - ceilPx - 10} width={wallPx} height={ceilPx + 10} fill="url(#wall-hatch)" stroke={COLORS.borderLight} strokeWidth="0.3" />
              <rect x={totalPx} y={groundY - ceilPx - 10} width={wallPx} height={ceilPx + 10} fill="url(#wall-hatch)" stroke={COLORS.borderLight} strokeWidth="0.3" />
            </g>
          )}

          {/* Column cross-sections along the wall */}
          {hasColumns && colPx > 0 && (() => {
            const colBottom = groundY - ceilPx - 10;
            const colTop = groundY;
            return (
              <g>
                {/* Left column at wall edge */}
                <rect x={-wallPx - colPx / 2} y={colBottom} width={colPx} height={ceilPx + 10} fill={COLORS.groundHatch} opacity="0.3" stroke={COLORS.column} strokeWidth="0.6" strokeOpacity="0.4" rx="0.5" />
                {/* Label */}
                <text x={-wallPx - colPx / 2} y={colBottom - 3} textAnchor="middle" fontSize={4.5 * fontScale} fill={COLORS.column} fontFamily="monospace">{columnSize}×{columnSize}</text>
              </g>
            );
          })()}

          {/* Ceiling line */}
          <line x1={0} y1={ceilY} x2={totalPx} y2={ceilY} stroke={COLORS.textMuted} strokeWidth="0.5" strokeDasharray="3 2" />

          {/* Floor line with hatch */}
          <line x1={-wallPx - 4} y1={groundY} x2={totalPx + wallPx + 4} y2={groundY} stroke={COLORS.ground} strokeWidth="1.5" />
          <rect x={-wallPx - 4} y={groundY} width={totalPx + wallPx * 2 + 8} height="10" fill="url(#ground-hatch-front)" />

          {/* Height dimension — warehouse clearance */}
          {(() => {
            const dimX = -wallPx - 8;
            return (
              <g>
                <line x1={dimX} y1={groundY} x2={dimX} y2={ceilY} stroke={COLORS.dimension} strokeWidth="0.3" strokeDasharray="2 2" />
                <text x={dimX - 2} y={(groundY + ceilY) / 2 + 3} textAnchor="end" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{formatMm(warehouseHeight)}</text>
              </g>
            );
          })()}

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

          {/* Break lines when more bays than displayed */}
          {baysPerRow > displayBays && (() => {
            const zigW = 3; const zigN = 6;
            const zigH = frameHPx / (zigN * 2);
            const leftPath = Array.from({ length: zigN * 2 + 1 }).map((_, i) => `${i % 2 === 0 ? -uprightPx / 2 - zigW : -uprightPx / 2 + zigW},${rackTopY + i * zigH}`).join(' ');
            const rightPath = Array.from({ length: zigN * 2 + 1 }).map((_, i) => `${i % 2 === 0 ? totalPx + uprightPx / 2 - zigW : totalPx + uprightPx / 2 + zigW},${rackTopY + i * zigH}`).join(' ');
            return <g><polyline points={leftPath} fill="none" stroke={COLORS.textMuted} strokeWidth="0.4" /><polyline points={rightPath} fill="none" stroke={COLORS.textMuted} strokeWidth="0.4" /></g>;
          })()}

          {/* Single height dimension — total rack height */}
          {(() => {
            const x = HEIGHT_DIM_X;
            return (
              <g>
                <line x1={x} y1={groundY} x2={x} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.5" />
                <line x1={x - 2.5} y1={groundY} x2={x + 2.5} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={x - 2.5} y1={rackTopY} x2={x + 2.5} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={0} y1={groundY} x2={x - 3} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <line x1={totalPx} y1={rackTopY} x2={x - 3} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <text x={x + 3} y={(groundY + rackTopY) / 2 + 3} textAnchor="start" fontSize={7 * fontScale} fill={COLORS.upright} fontFamily="monospace" fontWeight="600">{formatMm(frameHeight)}</text>
              </g>
            );
          })()}
        </g>

        <TitleBlock view="front" scale={scale} totalWidth={totalW} totalHeight={totalH} fontScale={fontScale} />
      </svg>
    </div>
  );
}

// ============================================================
// Side elevation view — simplified engineering drawing style
// ============================================================
function SideView(props: any) {
  const { svgRef, containerWidth, fontScale, frameDepth, frameHeight, beamSectionHeight, firstBeamBottom, palletDepth, palletHeight, beamLevels, hasGroundLevel, palletsPerLevel, rackRows, aisleWidth, warehouseHeight, warehouseWidth, wallThickness, columnSize, columnSpacingY, rackType, view, setView, handleExportPNG, handleExportSVG } = props;

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
  const wallPx = (wallThickness / 1000) * scale;
  const colPx = (columnSize / 1000) * scale;

  const groundY = frameHPx + 40;
  const ceilY = groundY - ceilPx;
  const rackTopY = groundY - frameHPx;

  const contentH = groundY + 30;
  const totalW = containerWidth;
  const totalH = contentH + OUTER_MARGIN * 2 + INNER_MARGIN * 2 + TITLE_BLOCK_H + 100;

  const innerX = OUTER_MARGIN + INNER_MARGIN;
  const innerY = OUTER_MARGIN + INNER_MARGIN;
  const innerW = totalW - (OUTER_MARGIN + INNER_MARGIN) * 2;
  const innerH = totalH - (OUTER_MARGIN + INNER_MARGIN) * 2;

  const contentX = innerX + Math.max(0, (innerW - totalPx) / 2);
  const contentY = innerY + 80;

  const levels: { bottomMm: number; isGround: boolean }[] = [];
  if (hasGroundLevel) levels.push({ bottomMm: 0, isGround: true });
  for (let i = 0; i < beamLevels; i++) {
    levels.push({ bottomMm: firstBeamBottom + i * (palletHeight + 100), isGround: false });
  }

  const rowOffsets: number[] = [];
  let currentX = 0;
  for (let i = 0; i < displayRows; i++) {
    rowOffsets.push(currentX);
    currentX += frameDepth / 1000 * scale;
    if (hasBackToBack && i === 0) currentX += aisleWidth / 1000 * scale;
    if (hasBackToBack && i === 1) currentX += backToBackGap / 1000 * scale;
  }

  const hasColumns = columnSpacingY > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ViewToolbar view={view} setView={setView} rackType={rackType} handleExportPNG={handleExportPNG} handleExportSVG={handleExportSVG} fontScale={fontScale} />

      <svg ref={svgRef} viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ minHeight: 330 }} data-view="side">
        <defs>
          <pattern id="ground-hatch-side" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={COLORS.groundHatch} strokeWidth="0.6" />
          </pattern>
          <pattern id="wall-hatch-side" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={COLORS.groundHatch} strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.white} />
        <DrawingFrame totalWidth={totalW} totalHeight={totalH} innerX={innerX} innerY={innerY} innerW={innerW} innerH={innerH} />

        <g transform={`translate(${contentX}, ${contentY})`}>
          {/* Roof structure */}
          <line x1={-wallPx} y1={ceilY} x2={totalPx + wallPx} y2={ceilY} stroke={COLORS.textMuted} strokeWidth="0.8" strokeDasharray="5 3" />
          {(() => {
            const roofH = 8 * fontScale;
            return (
              <g>
                <rect x={-wallPx} y={ceilY - roofH} width={totalPx + wallPx * 2} height={roofH} fill="rgba(148,163,184,0.08)" stroke={COLORS.textMuted} strokeWidth="0.3" />
                <text x={totalPx / 2} y={ceilY - roofH - 2} textAnchor="middle" fontSize={4.5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">Roof Structure</text>
              </g>
            );
          })()}

          {/* Side walls */}
          {wallPx > 0 && (
            <g>
              <rect x={-wallPx} y={groundY - ceilPx - 10} width={wallPx} height={ceilPx + 10} fill="url(#wall-hatch-side)" stroke={COLORS.borderLight} strokeWidth="0.3" />
              <rect x={totalPx} y={groundY - ceilPx - 10} width={wallPx} height={ceilPx + 10} fill="url(#wall-hatch-side)" stroke={COLORS.borderLight} strokeWidth="0.3" />
            </g>
          )}

          {/* Column */}
          {hasColumns && colPx > 0 && (() => {
            const colBottom = groundY - ceilPx - 10;
            return (
              <g>
                <rect x={-wallPx - colPx / 2} y={colBottom} width={colPx} height={ceilPx + 10} fill={COLORS.groundHatch} opacity="0.3" stroke={COLORS.column} strokeWidth="0.6" strokeOpacity="0.4" rx="0.5" />
                <text x={-wallPx - colPx / 2} y={colBottom - 3} textAnchor="middle" fontSize={4.5 * fontScale} fill={COLORS.column} fontFamily="monospace">{columnSize}×{columnSize}</text>
              </g>
            );
          })()}

          {/* Ceiling line */}
          <line x1={0} y1={ceilY} x2={totalPx} y2={ceilY} stroke={COLORS.textMuted} strokeWidth="0.5" strokeDasharray="3 2" />

          {/* Floor */}
          <line x1={-wallPx - 4} y1={groundY} x2={totalPx + wallPx + 4} y2={groundY} stroke={COLORS.ground} strokeWidth="1.5" />
          <rect x={-wallPx - 4} y={groundY} width={totalPx + wallPx * 2 + 8} height="10" fill="url(#ground-hatch-side)" />

          {/* Warehouse height dimension */}
          {(() => {
            const dimX = -wallPx - 8;
            return (
              <g>
                <line x1={dimX} y1={groundY} x2={dimX} y2={ceilY} stroke={COLORS.dimension} strokeWidth="0.3" strokeDasharray="2 2" />
                <text x={dimX - 2} y={(groundY + ceilY) / 2 + 3} textAnchor="end" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">{formatMm(warehouseHeight)}</text>
              </g>
            );
          })()}

          {/* Each rack row */}
          {rowOffsets.map((rowX, rowIdx) => {
            const rowW = frameDepth / 1000 * scale;
            const rowEndX = rowX + rowW;
            const overhangPx = palletOverhang / 1000 * scale;

            let palletX: number;
            if (hasBackToBack && rowIdx === 1) {
              palletX = rowEndX + overhangPx - palletDPx;
            } else if (hasBackToBack && rowIdx === 2) {
              palletX = rowX - overhangPx;
            } else {
              palletX = rowX + (rowW - palletDPx) / 2;
            }

            return (
              <g key={`row-${rowIdx}`}>
                <rect x={rowX} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />
                <rect x={rowEndX - uprightPx} y={rackTopY} width={uprightPx} height={frameHPx} fill={COLORS.upright} rx="0.5" />

                {levels.map((lvl, lvlIdx) => {
                  const beamTopY = groundY - lvl.bottomMm / 1000 * scale;
                  const palletBottomY = lvl.isGround ? groundY : beamTopY;
                  const palletTopY = palletBottomY - palletHPx;

                  return (
                    <g key={`side-r${rowIdx}-l${lvlIdx}`}>
                      {!lvl.isGround && (
                        <rect x={rowX + uprightPx} y={beamTopY} width={rowW - uprightPx * 2} height={beamHPx} fill={COLORS.beamFill} rx="0.3" />
                      )}
                      <rect x={palletX} y={palletTopY} width={palletDPx} height={palletHPx} fill={COLORS.palletFill} stroke={COLORS.palletStroke} strokeWidth="0.6" strokeOpacity={COLORS.palletStrokeOpacity} rx="0.5" />
                      <line x1={palletX} y1={palletBottomY} x2={palletX + palletDPx} y2={palletBottomY} stroke={COLORS.palletStroke} strokeWidth="0.8" strokeOpacity="0.35" />
                    </g>
                  );
                })}

                {rowIdx === 0 && <text x={rowX + rowW / 2} y={groundY + 10} textAnchor="middle" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">R1</text>}
                {rowIdx === 1 && <text x={rowX + rowW / 2} y={groundY + 10} textAnchor="middle" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">R2</text>}
                {rowIdx === 2 && <text x={rowX + rowW / 2} y={groundY + 10} textAnchor="middle" fontSize={5 * fontScale} fill={COLORS.textMuted} fontFamily="monospace">R{rackRows}</text>}
              </g>
            );
          })}

          {/* Single height dimension — total rack height */}
          {(() => {
            const x = HEIGHT_DIM_X;
            return (
              <g>
                <line x1={x} y1={groundY} x2={x} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.5" />
                <line x1={x - 2.5} y1={groundY} x2={x + 2.5} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={x - 2.5} y1={rackTopY} x2={x + 2.5} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.7" />
                <line x1={0} y1={groundY} x2={x - 3} y2={groundY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <line x1={totalPx} y1={rackTopY} x2={x - 3} y2={rackTopY} stroke={COLORS.dimension} strokeWidth="0.25" strokeDasharray="2 2" />
                <text x={x + 3} y={(groundY + rackTopY) / 2 + 3} textAnchor="start" fontSize={7 * fontScale} fill={COLORS.upright} fontFamily="monospace" fontWeight="600">{formatMm(frameHeight)}</text>
              </g>
            );
          })()}
        </g>

        <TitleBlock view="side" scale={scale} totalWidth={totalW} totalHeight={totalH} fontScale={fontScale} />
      </svg>
    </div>
  );
}
