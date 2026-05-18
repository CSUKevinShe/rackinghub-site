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

/**
 * Minimum forklift access aisle width at walls (mm).
 * Used when wall clearance alone is insufficient for forklift access.
 */
const WALL_ACCESS_AISLE_MM = 2000;

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
      rack.aisleWidth
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

  // Generate column positions when columnSpacingX/Y > 0
  const { columnPositions, rackRowPositions } = generateColumnPositions(
    warehouse.length,
    warehouse.width,
    warehouse.columnSpacingX,
    warehouse.columnSpacingY
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
  aisleWidth: number
) {
  // Every rack row must have an access aisle on at least one side.
  // No back-to-back racks against walls — each row is single-deep.
  // Structure: [wall-aisle] [row] [aisle] [row] [aisle] ... [row] [wall-aisle]
  // N rows need N-1 intermediate aisles + 2 wall access aisles.

  let rackRows = 0;
  let remainingWidth = effectiveWidth;

  // Reserve top and bottom wall access aisles
  if (WALL_ACCESS_AISLE_MM * 2 < remainingWidth) {
    remainingWidth -= WALL_ACCESS_AISLE_MM * 2;
  } else {
    return { rackRows: 0, aisles: 0, rackBlocks: 0, baysPerRow: 0 };
  }

  // First row needs only frameDepth (top wall access aisle already reserved)
  if (remainingWidth >= frameDepth) {
    rackRows++;
    remainingWidth -= frameDepth;
  }

  // Each subsequent row needs: 1 aisle + 1 rack row
  while (remainingWidth >= aisleWidth + frameDepth) {
    rackRows++;
    remainingWidth -= aisleWidth + frameDepth;
  }

  const aisles = rackRows + 1; // N-1 intermediate + 2 wall access
  const baysPerRow = Math.max(1, Math.floor(effectiveLength / bayWidth));

  return { rackRows, aisles, rackBlocks: 0, baysPerRow };
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

  // Reserve top wall access aisle
  if (WALL_ACCESS_AISLE_MM < remainingWidth) {
    remainingWidth -= WALL_ACCESS_AISLE_MM;
  }

  while (remainingWidth >= frameSetWidth + WALL_ACCESS_AISLE_MM) {
    rackBlocks++;
    remainingWidth -= frameSetWidth + WALL_ACCESS_AISLE_MM;
  }

  const endRow = remainingWidth >= frameDepth + WALL_ACCESS_AISLE_MM ? 1 : 0;
  const rackRows = rackBlocks * 2 + endRow;
  const aisles = 1 + rackBlocks + (endRow > 0 ? 1 : 0);
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

  // Reserve top wall access aisle
  if (WALL_ACCESS_AISLE_MM < remainingWidth) {
    remainingWidth -= WALL_ACCESS_AISLE_MM;
  }

  while (remainingWidth >= blockWidth + WALL_ACCESS_AISLE_MM) {
    rackBlocks++;
    remainingWidth -= blockWidth + WALL_ACCESS_AISLE_MM;
  }

  const endRow = remainingWidth >= frameDepth + WALL_ACCESS_AISLE_MM ? 1 : 0;
  const rackRows = rackBlocks * 2 + endRow;
  const aisles = 1 + rackBlocks + (endRow > 0 ? 1 : 0);
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
  let currentY = 0;
  let rowIndex = 0;

  const rackColor = rackType === 'drive-in' ? '#fbbf24' : rackType === 'radio-shuttle' ? '#a78bfa' : '#3b82f6';

  // Top wall access aisle
  elements.push({
    type: 'aisle',
    x: startX,
    y: 0,
    width: effectiveLength,
    height: WALL_ACCESS_AISLE_MM,
    label: `${(WALL_ACCESS_AISLE_MM / 1000).toFixed(1)}m aisle (wall access)`,
    color: '#f1f5f9',
  });
  currentY = WALL_ACCESS_AISLE_MM;

  if (rackType === 'selective') {
    // Selective racking: every row is single-deep, aisle between each row
    for (let i = 0; i < layout.rackRows; i++) {
      elements.push({
        type: 'rack-row',
        x: startX + bayWidth * 0.5,
        y: currentY,
        width: layout.baysPerRow * bayWidth,
        height: frameDepth,
        label: `Row ${rowIndex + 1}`,
        color: rackColor,
      });
      currentY += frameDepth;
      rowIndex++;

      if (i < layout.rackRows - 1) {
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
      }
    }
  } else {
    // Drive-in / Radio-shuttle: back-to-back pairs with a single row at the top
    // First row (single, not back-to-back against wall)
    elements.push({
      type: 'rack-row',
      x: startX + bayWidth * 0.5,
      y: currentY,
      width: layout.baysPerRow * bayWidth,
      height: frameDepth,
      label: `Row ${rowIndex + 1}`,
      color: rackColor,
    });
    currentY += frameDepth;
    rowIndex++;

    // Back-to-back pairs
    for (let block = 0; block < layout.rackBlocks; block++) {
      // Aisle before this pair
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

      // First row of pair
      elements.push({
        type: 'rack-row',
        x: startX + bayWidth * 0.5,
        y: currentY,
        width: layout.baysPerRow * bayWidth,
        height: frameDepth,
        label: `Row ${rowIndex + 1}`,
        color: rackColor,
      });
      currentY += frameDepth;
      rowIndex++;

      // Aisle between back-to-back rows
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

      // Second row of pair
      elements.push({
        type: 'rack-row',
        x: startX + bayWidth * 0.5,
        y: currentY,
        width: layout.baysPerRow * bayWidth,
        height: frameDepth,
        label: `Row ${rowIndex + 1}`,
        color: rackColor,
      });
      currentY += frameDepth;
      rowIndex++;
    }

    // Closing row
    if (layout.rackRows > 1 + layout.rackBlocks * 2) {
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
        color: rackColor,
      });
      currentY += frameDepth;
      rowIndex++;
    }
  }

  // Bottom wall access aisle — fill remaining space
  const bottomAisleY = currentY;
  const bottomAisleHeight = effectiveWidth - bottomAisleY;
  if (bottomAisleHeight > 0) {
    elements.push({
      type: 'aisle',
      x: startX,
      y: bottomAisleY,
      width: effectiveLength,
      height: bottomAisleHeight,
      label: bottomAisleHeight >= WALL_ACCESS_AISLE_MM
        ? `${(bottomAisleHeight / 1000).toFixed(1)}m aisle (wall access)`
        : `${(bottomAisleHeight / 1000).toFixed(1)}m clearance`,
      color: '#f1f5f9',
    });
  }

  return elements;
}

/** Generate column positions at columnSpacingX/Y intervals — full 2D grid across entire warehouse */
function generateColumnPositions(
  warehouseLength: number,
  warehouseWidth: number,
  columnSpacingX: number,
  columnSpacingY: number
): { columnPositions: { x: number; y: number }[]; rackRowPositions: { index: number; y: number; height: number }[] } {
  const hasX = columnSpacingX > 0;
  const hasY = columnSpacingY > 0;
  if (!hasX && !hasY) {
    return { columnPositions: [], rackRowPositions: [] };
  }

  // Generate column positions at independent X and Y intervals across the full warehouse
  const columnPositions: { x: number; y: number }[] = [];
  if (hasX && hasY) {
    // Full 2D grid across entire warehouse
    for (let x = columnSpacingX; x < warehouseLength; x += columnSpacingX) {
      for (let y = columnSpacingY; y < warehouseWidth; y += columnSpacingY) {
        columnPositions.push({ x, y });
      }
    }
  } else if (hasX) {
    // Only X spacing — columns along each rack row edge
    for (let x = columnSpacingX; x < warehouseLength; x += columnSpacingX) {
      columnPositions.push({ x, y: 0 });
    }
  } else {
    // Only Y spacing
    for (let y = columnSpacingY; y < warehouseWidth; y += columnSpacingY) {
      columnPositions.push({ x: 0, y });
    }
  }

  // Rack row Y positions (for reference, not used for grid)
  const rackRowPositions: { index: number; y: number; height: number }[] = [];
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
