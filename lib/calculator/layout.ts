import type {
  PlannerInput,
  LayoutData,
  LayoutElement,
  ValidationWarning,
  BeamSelection,
  UprightSelection,
} from './types';
import { RACK_TYPES, SPACING } from './config';

// ============================================================
// Layout Calculation Engine — precise spacing rules
// ============================================================

export function calculateLayout(input: PlannerInput): LayoutData {
  const { warehouse, rackType, rack, pallet } = input;
  const config = RACK_TYPES[rackType];

  const effectiveWidth = warehouse.width - 2 * warehouse.wallClearance;
  const effectiveLength = warehouse.length - 2 * warehouse.wallClearance;

  // Frame depth = pallet depth - offset (pallet overhangs frame by 50mm each side)
  const frameDepth = pallet.depth - SPACING.frameDepthOffset;

  // Bay width with precise gaps
  const bayWidth =
    rack.palletsPerLevel * pallet.width +
    (rack.palletsPerLevel - 1) * SPACING.palletToPallet +
    2 * SPACING.palletToUpright;

  // Rack height based on first beam height
  const beamSectionHeight = 120; // default beam section height
  const lastLevelBeamBottom =
    rack.firstBeamHeight +
    (rack.beamLevels - 1) * (pallet.height + SPACING.topClearance);
  const rackHeight = lastLevelBeamBottom + beamSectionHeight + SPACING.topClearance;

  // Validate height
  const clearanceToCeiling = warehouse.height - rackHeight;
  if (clearanceToCeiling < SPACING.topBeamToCeiling && rackHeight > warehouse.height) {
    console.warn(`Rack height ${rackHeight}mm exceeds warehouse height ${warehouse.height}mm`);
  }

  let layoutResult: {
    rackRows: number;
    aisles: number;
    rackBlocks: number;
    baysPerRow: number;
  };

  if (rackType === 'selective') {
    layoutResult = calculateSelectiveLayout(
      effectiveLength,
      effectiveWidth,
      bayWidth,
      frameDepth,
      rack.aisleWidth,
      warehouse.columnSpacing
    );
  } else if (rackType === 'drive-in') {
    layoutResult = calculateDriveInLayout(
      effectiveLength,
      effectiveWidth,
      bayWidth,
      frameDepth,
      rack.aisleWidth
    );
  } else {
    layoutResult = calculateRadioShuttleLayout(
      effectiveLength,
      effectiveWidth,
      bayWidth,
      frameDepth,
      rack.aisleWidth
    );
  }

  const elements = generateLayoutElements(
    effectiveLength,
    effectiveWidth,
    bayWidth,
    frameDepth,
    rack.aisleWidth,
    layoutResult,
    rackType
  );

  // Generate column positions when columnSpacing > 0
  const { columnPositions, rackRowPositions } = generateColumnPositions(
    effectiveLength,
    layoutResult,
    frameDepth,
    rack.aisleWidth,
    warehouse.columnSpacing,
    effectiveWidth
  );

  const warehouseArea = (warehouse.length * warehouse.width) / 1e6;
  const rackingArea =
    (layoutResult.baysPerRow * bayWidth * layoutResult.rackRows * frameDepth) /
    1e6;
  const utilization = warehouseArea > 0 ? (rackingArea / warehouseArea) * 100 : 0;

  return {
    elements,
    warehouseLength: warehouse.length,
    warehouseWidth: warehouse.width,
    rackRows: layoutResult.rackRows,
    aisles: layoutResult.aisles,
    baysPerRow: layoutResult.baysPerRow,
    rackBlocks: layoutResult.rackBlocks,
    rackingArea: Math.round(rackingArea),
    warehouseArea: Math.round(warehouseArea),
    utilization: Math.round(utilization * 10) / 10,
    columnPositions,
    rackRowPositions,
  };
}

function calculateSelectiveLayout(
  effectiveLength: number,
  effectiveWidth: number,
  bayWidth: number,
  frameDepth: number,
  aisleWidth: number,
  columnSpacing: number
) {
  const doubleBlockWidth = 2 * frameDepth + aisleWidth;

  let rackBlocks = 0;
  let remainingWidth = effectiveWidth;

  if (frameDepth < remainingWidth) {
    remainingWidth -= frameDepth;
  }

  while (remainingWidth >= doubleBlockWidth) {
    rackBlocks++;
    remainingWidth -= doubleBlockWidth;
  }

  const endRow = remainingWidth >= frameDepth ? 1 : 0;
  const rackRows = 1 + 2 * rackBlocks + endRow;
  const aisles = rackBlocks + (endRow > 0 ? 1 : 0);

  const baysPerRow = Math.max(1, Math.floor(effectiveLength / bayWidth));

  return { rackRows, aisles, rackBlocks, baysPerRow };
}

function calculateDriveInLayout(
  effectiveLength: number,
  effectiveWidth: number,
  bayWidth: number,
  frameDepth: number,
  _serviceAisleWidth: number
) {
  const laneDepth = 1200 * 6;
  const laneWidth = bayWidth;
  const lanesPerBlock = Math.max(1, Math.floor(laneDepth / laneWidth));

  const entryAisleWidth = 2700;
  const frameSetWidth = frameDepth * 2 + entryAisleWidth;

  let rackBlocks = 0;
  let remainingWidth = effectiveWidth;
  if (frameDepth < remainingWidth) {
    remainingWidth -= frameDepth;
  }
  while (remainingWidth >= frameSetWidth) {
    rackBlocks++;
    remainingWidth -= frameSetWidth;
  }

  const rackRows = rackBlocks * 2 + (remainingWidth >= frameDepth ? 1 : 0);
  const aisles = rackBlocks;
  const baysPerRow = Math.max(1, Math.floor(effectiveLength / bayWidth));

  return { rackRows, aisles, rackBlocks, baysPerRow };
}

function calculateRadioShuttleLayout(
  effectiveLength: number,
  effectiveWidth: number,
  bayWidth: number,
  frameDepth: number,
  _serviceAisleWidth: number
) {
  const laneDepth = 1200 * 8;

  const blockWidth = frameDepth * 2 + 2700;

  let rackBlocks = 0;
  let remainingWidth = effectiveWidth;
  if (frameDepth < remainingWidth) {
    remainingWidth -= frameDepth;
  }
  while (remainingWidth >= blockWidth) {
    rackBlocks++;
    remainingWidth -= blockWidth;
  }

  const rackRows = rackBlocks * 2 + (remainingWidth >= frameDepth ? 1 : 0);
  const aisles = rackBlocks;
  const baysPerRow = Math.max(1, Math.floor(effectiveLength / bayWidth));

  return { rackRows, aisles, rackBlocks, baysPerRow };
}

function generateLayoutElements(
  effectiveLength: number,
  effectiveWidth: number,
  bayWidth: number,
  frameDepth: number,
  aisleWidth: number,
  layout: { rackRows: number; aisles: number; rackBlocks: number; baysPerRow: number },
  rackType: string
): LayoutElement[] {
  const elements: LayoutElement[] = [];
  const startX = 0;
  const startY = 0;

  elements.push({
    type: 'wall',
    x: startX,
    y: startY,
    width: effectiveLength,
    height: effectiveWidth,
    label: 'Warehouse',
    color: '#e2e8f0',
  });

  let currentY = startY;
  let rowIndex = 0;

  elements.push({
    type: 'rack-row',
    x: startX + bayWidth * 0.5,
    y: currentY,
    width: layout.baysPerRow * bayWidth,
    height: frameDepth,
    label: `Row ${rowIndex + 1}`,
    color: rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6',
  });
  currentY += frameDepth;
  rowIndex++;

  for (let block = 0; block < layout.rackBlocks; block++) {
    elements.push({
      type: 'rack-row',
      x: startX + bayWidth * 0.5,
      y: currentY,
      width: layout.baysPerRow * bayWidth,
      height: frameDepth,
      label: `Row ${rowIndex + 1}`,
      color: rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6',
    });
    currentY += frameDepth;
    rowIndex++;

    elements.push({
      type: 'aisle',
      x: startX,
      y: currentY,
      width: effectiveLength,
      height: aisleWidth,
      label: `${(aisleWidth / 1000).toFixed(1)}m aisle`,
      color: '#f1f5f9',
    });
    currentY += aisleWidth;

    elements.push({
      type: 'rack-row',
      x: startX + bayWidth * 0.5,
      y: currentY,
      width: layout.baysPerRow * bayWidth,
      height: frameDepth,
      label: `Row ${rowIndex + 1}`,
      color: rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6',
    });
    currentY += frameDepth;
    rowIndex++;
  }

  if (rackType === 'selective' && effectiveWidth - currentY >= frameDepth) {
    elements.push({
      type: 'aisle',
      x: startX,
      y: currentY,
      width: effectiveLength,
      height: Math.min(aisleWidth, effectiveWidth - currentY - frameDepth),
      label: `${(aisleWidth / 1000).toFixed(1)}m aisle`,
      color: '#f1f5f9',
    });
    currentY += aisleWidth;

    elements.push({
      type: 'rack-row',
      x: startX + bayWidth * 0.5,
      y: currentY,
      width: layout.baysPerRow * bayWidth,
      height: frameDepth,
      label: `Row ${rowIndex + 1}`,
      color: '#3b82f6',
    });
  }

  return elements;
}

/** Generate column positions when columnSpacing > 0 — full 2D grid */
function generateColumnPositions(
  effectiveLength: number,
  layout: { rackRows: number; aisles: number; rackBlocks: number; baysPerRow: number },
  frameDepth: number,
  aisleWidth: number,
  columnSpacing: number,
  effectiveWidth: number
): { columnPositions: { x: number; y: number }[]; rackRowPositions: { index: number; y: number; height: number }[] } {
  if (columnSpacing <= 0) {
    return { columnPositions: [], rackRowPositions: [] };
  }

  // Calculate rack row Y positions (same logic as generateLayoutElements)
  const rackRowPositions: { index: number; y: number; height: number }[] = [];
  let currentY = 0;

  // First row
  rackRowPositions.push({ index: 0, y: currentY, height: frameDepth });
  currentY += frameDepth;

  for (let block = 0; block < layout.rackBlocks; block++) {
    rackRowPositions.push({ index: rackRowPositions.length, y: currentY, height: frameDepth });
    currentY += frameDepth;
    currentY += aisleWidth;
    rackRowPositions.push({ index: rackRowPositions.length, y: currentY, height: frameDepth });
    currentY += frameDepth;
  }

  // For selective: check if there's an end row
  if (layout.rackRows > rackRowPositions.length) {
    currentY += aisleWidth;
    rackRowPositions.push({ index: rackRowPositions.length, y: currentY, height: frameDepth });
  }

  // Generate column positions at columnSpacing intervals in BOTH directions
  // X: along the length, Y: along the width (full warehouse area)
  const columnPositions: { x: number; y: number }[] = [];
  for (let x = columnSpacing; x < effectiveLength; x += columnSpacing) {
    for (let y = columnSpacing; y < effectiveWidth; y += columnSpacing) {
      columnPositions.push({ x, y });
    }
  }

  return { columnPositions, rackRowPositions };
}

/** Validate layout and generate warnings */
export function validateLayout(
  input: PlannerInput,
  layout: LayoutData,
  beamSelection: BeamSelection | null,
  uprightSelection: UprightSelection | null
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { warehouse, rack, pallet } = input;

  const beamSectionHeight = beamSelection?.heightMm ?? 120;
  const lastLevelBeamBottom =
    rack.firstBeamHeight +
    (rack.beamLevels - 1) * (pallet.height + SPACING.topClearance);
  const rackHeight = lastLevelBeamBottom + beamSectionHeight + SPACING.topClearance;

  const clearanceToCeiling = warehouse.height - rackHeight;
  if (clearanceToCeiling < SPACING.topBeamToCeiling) {
    warnings.push({
      type: 'height',
      message: `Top clearance to ceiling is ${clearanceToCeiling}mm (min ${SPACING.topBeamToCeiling}mm). Consider reducing levels or using lower beams.`,
      severity: 'warning',
    });
  }

  if (rackHeight > warehouse.height) {
    warnings.push({
      type: 'height',
      message: `Rack height ${rackHeight}mm exceeds warehouse height ${warehouse.height}mm.`,
      severity: 'error',
    });
  }

  if (!beamSelection) {
    warnings.push({
      type: 'beam',
      message: 'No beam profile found that meets capacity requirements.',
      severity: 'error',
    });
  }

  if (!uprightSelection) {
    warnings.push({
      type: 'frame',
      message: 'No upright profile found that meets capacity and thickness requirements.',
      severity: 'error',
    });
  }

  return warnings;
}
