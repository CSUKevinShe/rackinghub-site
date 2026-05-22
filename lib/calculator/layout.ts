import type {
  PlannerInput,
  LayoutData,
  LayoutElement,
  Layout3DData,
  ValidationWarning,
  BeamSelection,
  UprightSelection,
  WarehouseParams,
  RackZone,
} from './types';
import { RACK_TYPES, SPACING } from './config';

// ============================================================
// Layout Calculation Engine v2
// Column-grid-based warehouse model with transfer aisles
// ============================================================

export function calculateLayout(input: PlannerInput): LayoutData {
  const { warehouse, rackType, rack, pallet } = input;
  const config = RACK_TYPES[rackType];

  // Total warehouse dimensions from column grid
  const totalLength = warehouse.columnsX * warehouse.columnSpanX;
  const totalWidth = warehouse.columnsY * warehouse.columnSpanY;

  // Frame depth = pallet depth - offset (pallet overhangs frame by 50mm each side)
  const frameDepth = pallet.depth - SPACING.frameDepthOffset;

  // Bay width with precise gaps
  const bayWidth =
    rack.palletsPerLevel * pallet.width +
    (rack.palletsPerLevel - 1) * SPACING.palletToPallet +
    2 * SPACING.palletToUpright;

  // Rack height
  const beamSectionHeight = 120;
  const lastLevelBeamBottom =
    rack.firstBeamHeight +
    (rack.beamLevels - 1) * (pallet.height + SPACING.topClearance);
  const rackHeight = lastLevelBeamBottom + beamSectionHeight + SPACING.topClearance;

  // Validate height
  const clearanceToCeiling = warehouse.height - rackHeight;
  if (clearanceToCeiling < SPACING.topBeamToCeiling && rackHeight > warehouse.height) {
    console.warn(`Rack height ${rackHeight}mm exceeds warehouse height ${warehouse.height}mm`);
  }

  // --- 2D Block Layout ---
  // Direction: 0 = racks along X (length), working aisles along X, transfer aisles along X
  //            1 = racks along Y (width)

  // For Phase 1, use the first (and only) zone
  const zone = warehouse.zones[0];
  if (!zone) {
    return {
      elements: [],
      warehouseLength: totalLength,
      warehouseWidth: totalWidth,
      rackRows: 0,
      aisles: 0,
      baysPerRow: 0,
      rackBlocks: 0,
      transferAisles: 0,
      rackingArea: 0,
      warehouseArea: 0,
      utilization: 0,
    };
  }

  const direction = zone.direction;
  const workingAisleWidth = zone.rack.aisleWidth;

  // --- Blocks along length (X) ---
  // One block per column bay (aligns with column grid)
  const blocksX = warehouse.columnsX;
  const blockLength = warehouse.columnSpanX - warehouse.columnWidth; // subtract column at right edge
  const baysPerBlock = Math.max(1, Math.floor(blockLength / bayWidth));
  const usedBlockLength = baysPerBlock * bayWidth;

  // --- Double-row blocks along width (Y) ---
  const doubleRowDepth = 2 * frameDepth;
  // With working aisles on both sides: aisle + 2*frameDepth + aisle + 2*frameDepth + ... + aisle
  // blocksY * doubleRowDepth + (blocksY + 1) * workingAisleWidth <= totalWidth - 2*wallClearance
  const effectiveWidth = totalWidth - 2 * warehouse.wallClearance;
  const blocksY = Math.max(1, Math.floor(
    (effectiveWidth + workingAisleWidth) / (doubleRowDepth + workingAisleWidth)
  ));

  // Check if an end single row fits (with aisle on one side)
  const consumedWidth = blocksY * doubleRowDepth + (blocksY + 1) * workingAisleWidth;
  const remainingWidth = effectiveWidth - consumedWidth;
  const hasEndRow = remainingWidth >= frameDepth;

  const rackRows = blocksY * 2 + (hasEndRow ? 1 : 0);
  const workingAisles = blocksY + 1 + (hasEndRow ? 1 : 0);
  const rackBlocks = blocksX * blocksY;

  // --- Generate elements ---
  const elements = generateBlockElements(
    totalLength,
    totalWidth,
    warehouse,
    zone,
    bayWidth,
    usedBlockLength,
    frameDepth,
    workingAisleWidth,
    blocksX,
    blocksY,
    baysPerBlock,
    hasEndRow
  );

  // --- Metrics ---
  const warehouseArea = (totalLength * totalWidth) / 1e6;
  const rackingArea =
    (blocksX * blocksY * baysPerBlock * bayWidth * frameDepth * 2 +
      (hasEndRow ? blocksX * baysPerBlock * bayWidth * frameDepth : 0)) /
    1e6;
  const utilization = warehouseArea > 0 ? (rackingArea / warehouseArea) * 100 : 0;

  // --- 3D payload (for future Three.js) ---
  const layout3D = generate3DPayload(
    totalLength,
    totalWidth,
    warehouse,
    zone,
    usedBlockLength,
    frameDepth,
    workingAisleWidth,
    rackHeight,
    blocksX,
    blocksY,
    baysPerBlock,
    hasEndRow
  );

  return {
    elements,
    warehouseLength: totalLength,
    warehouseWidth: totalWidth,
    rackRows,
    aisles: workingAisles,
    baysPerRow: baysPerBlock,
    rackBlocks,
    transferAisles: blocksX > 1 ? blocksX - 1 : 0,
    rackingArea: Math.round(rackingArea),
    warehouseArea: Math.round(warehouseArea),
    utilization: Math.round(utilization * 10) / 10,
    layout3D,
  };
}

// ============================================================
// Block-based element generation
// ============================================================

function generateBlockElements(
  totalLength: number,
  totalWidth: number,
  warehouse: WarehouseParams,
  zone: RackZone,
  bayWidth: number,
  blockLength: number,
  frameDepth: number,
  workingAisleWidth: number,
  blocksX: number,
  blocksY: number,
  baysPerBlock: number,
  hasEndRow: boolean
): LayoutElement[] {
  const elements: LayoutElement[] = [];
  const wallClearance = warehouse.wallClearance;
  const columnW = warehouse.columnWidth;
  const columnD = warehouse.columnDepth;
  const spanX = warehouse.columnSpanX;
  const spanY = warehouse.columnSpanY;
  const colsX = warehouse.columnsX;
  const colsY = warehouse.columnsY;

  // --- 1. Wall ---
  elements.push({
    type: 'wall',
    x: 0,
    y: 0,
    width: totalLength,
    height: totalWidth,
    label: 'Warehouse',
    color: '#e2e8f0',
  });

  // --- 2. Columns at grid intersections ---
  for (let cx = 0; cx < colsX; cx++) {
    for (let cy = 0; cy < colsY; cy++) {
      // Column at intersection of grid lines (lower-right corner of bay)
      const colX = (cx + 1) * spanX - columnW;
      const colY = (cy + 1) * spanY - columnD;
      // Also columns at start (cx=0, cy=0 = wall edge)
      // Actually columns are usually between bays, not at the corners.
      // Let's place them at the END of each bay.
      elements.push({
        type: 'column',
        x: colX,
        y: colY,
        width: columnW,
        height: columnD,
        label: `${columnW}×${columnD}`,
        color: '#94a3b8',
      });
    }
  }

  // --- 3. Rack blocks + working aisles ---
  const zoneOriginX = zone.originX;
  const zoneOriginY = zone.originY;

  // Starting Y (after wall clearance)
  let currentY = wallClearance;

  // First working aisle (access to Row 1 face)
  elements.push({
    type: 'aisle',
    x: zoneOriginX,
    y: currentY,
    width: totalLength,
    height: workingAisleWidth,
    label: `aisle ${(workingAisleWidth / 1000).toFixed(1)}m`,
    color: '#f1f5f9',
  });
  currentY += workingAisleWidth;

  for (let by = 0; by < blocksY; by++) {
    // --- Two back-to-back rows per block ---
    for (let bx = 0; bx < blocksX; bx++) {
      const blockX = bx * spanX; // block starts at column bay left edge

      // Row A (faces previous aisle)
      elements.push({
        type: 'rack-row',
        x: blockX + (spanX - blockLength) / 2,
        y: currentY,
        width: blockLength,
        height: frameDepth,
        label: `B${by + 1}.${bx + 1}A`,
        color: '#3b82f6',
        blockIndex: by * blocksX + bx,
        faceDirection: -1, // faces up (toward previous aisle)
      });
    }

    currentY += frameDepth;

    // Row B (back-to-back with A, faces next aisle)
    for (let bx = 0; bx < blocksX; bx++) {
      const blockX = bx * spanX;
      elements.push({
        type: 'rack-row',
        x: blockX + (spanX - blockLength) / 2,
        y: currentY,
        width: blockLength,
        height: frameDepth,
        label: `B${by + 1}.${bx + 1}B`,
        color: '#2563eb',
        blockIndex: by * blocksX + bx,
        faceDirection: 1, // faces down (toward next aisle)
      });
    }

    currentY += frameDepth;

    // Working aisle after block (if not last, or always after each block)
    const isLastBlock = by === blocksY - 1 && !hasEndRow;
    elements.push({
      type: 'aisle',
      x: zoneOriginX,
      y: currentY,
      width: totalLength,
      height: isLastBlock ? workingAisleWidth : workingAisleWidth,
      label: `aisle ${(workingAisleWidth / 1000).toFixed(1)}m`,
      color: '#f1f5f9',
    });
    currentY += workingAisleWidth;
  }

  // --- End single row (if space) ---
  if (hasEndRow) {
    for (let bx = 0; bx < blocksX; bx++) {
      const blockX = bx * spanX;
      elements.push({
        type: 'rack-row',
        x: blockX + (spanX - blockLength) / 2,
        y: currentY,
        width: blockLength,
        height: frameDepth,
        label: `End ${bx + 1}`,
        color: '#3b82f6',
        faceDirection: -1,
      });
    }
    currentY += frameDepth;

    // Final aisle
    elements.push({
      type: 'aisle',
      x: zoneOriginX,
      y: currentY,
      width: totalLength,
      height: workingAisleWidth,
      label: `aisle ${(workingAisleWidth / 1000).toFixed(1)}m`,
      color: '#f1f5f9',
    });
  }

  // --- 4. Transfer aisles between blocks in X direction ---
  if (blocksX > 1) {
    for (let bx = 0; bx < blocksX - 1; bx++) {
      const xPos = (bx + 1) * spanX - warehouse.transferAisleX / 2;
      elements.push({
        type: 'transfer-aisle',
        x: xPos,
        y: wallClearance,
        width: warehouse.transferAisleX,
        height: totalWidth - 2 * wallClearance,
        label: `transfer ${(warehouse.transferAisleX / 1000).toFixed(1)}m`,
        color: '#dbeafe',
      });
    }
  }

  return elements;
}

// ============================================================
// 3D payload generation (for future Three.js integration)
// ============================================================

function generate3DPayload(
  totalLength: number,
  totalWidth: number,
  warehouse: WarehouseParams,
  zone: RackZone,
  blockLength: number,
  frameDepth: number,
  workingAisleWidth: number,
  rackHeight: number,
  blocksX: number,
  blocksY: number,
  baysPerBlock: number,
  hasEndRow: boolean
): Layout3DData {
  const { wallClearance, columnWidth, columnDepth, columnSpanX, columnSpanY, columnsX, columnsY } = warehouse;

  const columns: Layout3DData['columns'] = [];
  for (let cx = 0; cx < columnsX; cx++) {
    for (let cy = 0; cy < columnsY; cy++) {
      columns.push({
        x: (cx + 1) * columnSpanX - columnWidth,
        y: (cy + 1) * columnSpanY - columnDepth,
        width: columnWidth,
        depth: columnDepth,
        height: warehouse.height,
      });
    }
  }

  const rackBlocks3D: Layout3DData['rackBlocks'] = [];
  let yPos = wallClearance + workingAisleWidth;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const blockX = bx * columnSpanX + (columnSpanX - blockLength) / 2;
      rackBlocks3D.push({
        x: blockX,
        y: yPos,
        z: 0,
        width: blockLength,
        depth: frameDepth * 2, // double row
        height: rackHeight,
        bays: baysPerBlock,
        levels: zone.rack.beamLevels + (zone.rack.hasGroundLevel ? 1 : 0),
        direction: zone.direction,
      });
    }
    yPos += frameDepth * 2 + workingAisleWidth;
  }

  const aisles3D: Layout3DData['aisles'] = [];
  // Working aisles
  let ayPos = wallClearance;
  for (let i = 0; i <= blocksY + (hasEndRow ? 1 : 0); i++) {
    aisles3D.push({
      x: 0,
      y: ayPos,
      width: totalLength,
      depth: workingAisleWidth,
      type: 'working',
    });
    ayPos += workingAisleWidth;
    if (i < blocksY) {
      ayPos += frameDepth * 2; // skip block
    }
  }

  // Transfer aisles
  if (blocksX > 1) {
    for (let bx = 0; bx < blocksX - 1; bx++) {
      aisles3D.push({
        x: (bx + 1) * columnSpanX - warehouse.transferAisleX / 2,
        y: wallClearance,
        width: warehouse.transferAisleX,
        depth: totalWidth - 2 * wallClearance,
        type: 'transfer',
      });
    }
  }

  const walls: Layout3DData['walls'] = [
    { x: 0, y: 0, width: totalLength, depth: wallClearance, height: warehouse.height },
    { x: 0, y: totalWidth - wallClearance, width: totalLength, depth: wallClearance, height: warehouse.height },
    { x: 0, y: 0, width: wallClearance, depth: totalWidth, height: warehouse.height },
    { x: totalLength - wallClearance, y: 0, width: wallClearance, depth: totalWidth, height: warehouse.height },
  ];

  return { columns, rackBlocks: rackBlocks3D, aisles: aisles3D, walls };
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
