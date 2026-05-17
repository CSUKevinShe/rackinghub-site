import type {
  PlannerInput,
  PlanSummary,
  BOMItem,
  LayoutData,
  BeamSelection,
  UprightSelection,
} from './types';
import { COST_REFERENCE, RACK_TYPES, EXCHANGE_RATES, SPACING } from './config';

// ============================================================
// Costing Engine — real profile weights + ex-factory pricing
// ============================================================

export interface CostingOptions {
  wireMeshDeck?: boolean;
  hasGroundLevel?: boolean;
}

/**
 * Generate complete Bill of Materials with real profile data.
 */
export function generateBOMFromLayout(
  input: PlannerInput,
  layout: LayoutData,
  beamSelection: BeamSelection | null,
  uprightSelection: UprightSelection | null,
  options: CostingOptions = {}
): BOMItem[] {
  const { warehouse, rackType, rack, pallet } = input;
  const { wireMeshDeck = false, hasGroundLevel = false } = options;

  // Calculate rack height
  const beamSectionHeight = beamSelection?.heightMm ?? 120;
  const rackHeight =
    rack.firstBeamHeight +
    (rack.beamLevels - 1) * (pallet.height + SPACING.topClearance) +
    beamSectionHeight +
    SPACING.topClearance;

  // Beam length = effective span
  const beamLength = beamSelection?.effectiveSpanMm ?? (pallet.width * rack.palletsPerLevel);

  // Number of beam bays
  const totalBays = layout.baysPerRow * layout.rackRows;

  // Frame positions (upright columns)
  const framePositions = totalBays + 1;

  // Beam levels (directly from rack config)
  const beamLevels = rack.beamLevels;

  // Beams per bay = beamLevels × 2 (both sides of bay)
  const beamsPerBay = beamLevels * 2;
  const totalBeams = beamsPerBay * totalBays;

  // Deck panels: one per pallet position per beam level
  const deckPanelsPerBay = rack.palletsPerLevel * 2; // both sides
  const totalDecks = deckPanelsPerBay * layout.baysPerRow * layout.rackRows * beamLevels;

  // Material price from upright selection
  const materialPricePerKg = uprightSelection
    ? (uprightSelection.material === 'Q235'
        ? COST_REFERENCE.q235PricePerKg
        : COST_REFERENCE.q355PricePerKg)
    : COST_REFERENCE.q235PricePerKg;

  // Wire mesh deck price (fixed ex-factory, no budget multiplier)
  const effectiveDeckPerM2 = COST_REFERENCE.deckingPerM2PriceCNY;

  // Safety accessories price (fixed ex-factory)
  const effectiveSafetyPerPos = COST_REFERENCE.safetyPerPositionPriceCNY;

  const bom: BOMItem[] = [];

  // 1. Upright Frames
  if (uprightSelection) {
    const frameWeight = uprightSelection.weightPerMeter * rackHeight / 1000;
    const frameCost = frameWeight * materialPricePerKg;
    bom.push({
      description: `Upright Frame ${uprightSelection.profileCode} (${uprightSelection.material}, H=${uprightSelection.frameHeightMm}mm, ${uprightSelection.bracingType}-bracing)`,
      unit: 'pcs',
      quantity: framePositions,
      unitWeight: Math.round(frameWeight * 100) / 100,
      totalWeight: Math.round(frameWeight * framePositions * 100) / 100,
      unitCost: Math.round(frameCost * 100) / 100,
      totalCost: Math.round(frameCost * framePositions * 100) / 100,
      category: 'frame',
    });
  }

  // 2. Box Beams (only for beam levels, not ground level)
  if (beamSelection && beamLevels > 0) {
    const beamWeight = beamSelection.weightPerMeter * beamLength / 1000;
    const beamCost = beamWeight * COST_REFERENCE.q235PricePerKg; // beams are Q235
    bom.push({
      description: `Box Beam ${beamSelection.profileCode} (L=${beamLength}mm)`,
      unit: 'pcs',
      quantity: totalBeams,
      unitWeight: Math.round(beamWeight * 100) / 100,
      totalWeight: Math.round(beamWeight * totalBeams * 100) / 100,
      unitCost: Math.round(beamCost * 100) / 100,
      totalCost: Math.round(beamCost * totalBeams * 100) / 100,
      category: 'beam',
    });

    // Beam connectors (柱卡) — one pair per beam
    const connectorWeight = beamSelection.heightMm >= 150 ? 1.51 : 1.10; // DE75-4H or DE75-3H
    const connectorCost = connectorWeight * materialPricePerKg;
    bom.push({
      description: `Beam Connector Pair (${beamSelection.heightMm >= 150 ? 'DE75-4H' : 'DE75-3H'})`,
      unit: 'pairs',
      quantity: totalBeams,
      unitWeight: connectorWeight,
      totalWeight: Math.round(connectorWeight * totalBeams * 100) / 100,
      unitCost: Math.round(connectorCost * 100) / 100,
      totalCost: Math.round(connectorCost * totalBeams * 100) / 100,
      category: 'beam',
    });
  }

  // 3. Wire Mesh Decks (optional)
  if (wireMeshDeck && beamLevels > 0) {
    const deckWidth = pallet.width;
    const deckDepth = pallet.depth - SPACING.frameDepthOffset;
    const deckAreaM2 = (deckWidth * deckDepth) / 1e6;
    const deckWeight = Math.round(deckAreaM2 * 10); // 10 kg/m²
    const deckCost = Math.round(effectiveDeckPerM2 * deckAreaM2 * 100) / 100;

    bom.push({
      description: `Wire Mesh Deck (${deckWidth}×${deckDepth}mm)`,
      unit: 'pcs',
      quantity: totalDecks,
      unitWeight: deckWeight,
      totalWeight: Math.round(deckWeight * totalDecks * 100) / 100,
      unitCost: deckCost,
      totalCost: Math.round(deckCost * totalDecks * 100) / 100,
      category: 'decking',
    });
  }

  // 4. Frame Base Plates
  const basePlateWeight = uprightSelection ? (uprightSelection.profileCode.includes('120') ? 1.52 : 1.30) : 1.27;
  const basePlateCost = basePlateWeight * materialPricePerKg;
  bom.push({
    description: 'Frame Base Plate',
    unit: 'pcs',
    quantity: framePositions,
    unitWeight: basePlateWeight,
    totalWeight: Math.round(basePlateWeight * framePositions * 100) / 100,
    unitCost: Math.round(basePlateCost * 100) / 100,
    totalCost: Math.round(basePlateCost * framePositions * 100) / 100,
    category: 'frame',
  });

  // 5. Bracing (cross & horizontal)
  if (uprightSelection) {
    const bracingWeightPerPiece = 1.0; // ~1.0 kg/m × ~1m average length
    const totalBracingPieces = layout.rackRows * (uprightSelection.bracingCount.diagonal + uprightSelection.bracingCount.horizontal);
    const bracingWeight = bracingWeightPerPiece * totalBracingPieces;
    const bracingCost = bracingWeight * materialPricePerKg;
    bom.push({
      description: `Cross/Horizontal Bracing (${uprightSelection.bracingType}-type, ${uprightSelection.bracingCount.diagonal} diagonal, ${uprightSelection.bracingCount.horizontal} horizontal)`,
      unit: 'pcs',
      quantity: totalBracingPieces,
      unitWeight: Math.round(bracingWeightPerPiece * 100) / 100,
      totalWeight: Math.round(bracingWeight * 100) / 100,
      unitCost: Math.round(bracingWeightPerPiece * materialPricePerKg * 100) / 100,
      totalCost: Math.round(bracingCost * 100) / 100,
      category: 'frame',
    });
  }

  // 6. Safety Accessories
  const safetyCostPerPos = effectiveSafetyPerPos;
  bom.push({
    description: 'Column Protectors & Frame Protectors',
    unit: 'set',
    quantity: framePositions,
    unitWeight: 8,
    totalWeight: Math.round(8 * framePositions * 100) / 100,
    unitCost: Math.round(safetyCostPerPos * 5 * 100) / 100,
    totalCost: Math.round(safetyCostPerPos * 5 * framePositions * 100) / 100,
    category: 'safety',
  });

  // 7. Row Spacers — 矩管 50×30×1.5 + 1kg connector plate
  // Back-to-back connections: rackRows - 1 (each pair of adjacent rows)
  // Quantity per connection: from 300mm start, every 2000mm up the frame height
  const backToBackConnections = Math.max(0, layout.rackRows - 1);
  if (backToBackConnections > 0) {
    const spacerHeight = rackHeight; // total frame height
    const spacersPerConnection = Math.floor((spacerHeight - 300) / 2000) + 1;
    const totalSpacers = spacersPerConnection * backToBackConnections * layout.baysPerRow;

    // 矩管 50×30×1.5, width = aisleWidth (default 200mm)
    const spacerWidth = COST_REFERENCE.rowSpacerWidthMm;
    const tubeWeightPerPiece = 1.0; // 矩管 50×30×1.5 × ~200mm
    const connectorPlateWeight = 1.0; // 连接板
    const totalWeightPerPiece = tubeWeightPerPiece + connectorPlateWeight;
    const costPerPiece = totalWeightPerPiece * materialPricePerKg;

    bom.push({
      description: `Row Spacer (矩管 50×30×1.5 × ${spacerWidth}mm + 连接板)`,
      unit: 'pcs',
      quantity: totalSpacers,
      unitWeight: totalWeightPerPiece,
      totalWeight: Math.round(totalWeightPerPiece * totalSpacers * 100) / 100,
      unitCost: Math.round(costPerPiece * 100) / 100,
      totalCost: Math.round(costPerPiece * totalSpacers * 100) / 100,
      category: 'safety',
    });
  }

  // 8. Drive-in specific items
  if (rackType === 'drive-in') {
    const palletsDeep = 6;
    const driveInRails = layout.rackRows * layout.baysPerRow * palletsDeep;
    bom.push({
      description: 'Drive-In Rail Profile (per meter)',
      unit: 'm',
      quantity: driveInRails,
      unitWeight: 12,
      totalWeight: Math.round(12 * driveInRails * 100) / 100,
      unitCost: Math.round(12 * materialPricePerKg * 100) / 100,
      totalCost: Math.round(12 * materialPricePerKg * driveInRails * 100) / 100,
      category: 'accessory',
    });
  }

  // 9. Radio shuttle specific items
  if (rackType === 'radio-shuttle') {
    const shuttleLanes = layout.rackRows;
    const laneLengthM = beamLength / 1000;
    bom.push({
      description: 'Radio Shuttle Rail (per meter)',
      unit: 'm',
      quantity: Math.round(shuttleLanes * layout.baysPerRow * laneLengthM),
      unitWeight: 15,
      totalWeight: Math.round(15 * shuttleLanes * layout.baysPerRow * laneLengthM * 100) / 100,
      unitCost: Math.round(15 * materialPricePerKg * 100) / 100,
      totalCost: Math.round(15 * materialPricePerKg * shuttleLanes * layout.baysPerRow * laneLengthM * 100) / 100,
      category: 'accessory',
    });
    bom.push({
      description: 'Radio Shuttle Cart',
      unit: 'pcs',
      quantity: shuttleLanes,
      unitWeight: 350,
      totalWeight: 350 * shuttleLanes,
      unitCost: Math.round(3500),
      totalCost: Math.round(3500 * shuttleLanes * 100) / 100,
      category: 'accessory',
    });
  }

  return bom;
}

/**
 * Legacy API — calculates layout internally.
 */
export function generateBOM(input: PlannerInput): BOMItem[] {
  const { calculateLayout } = require('./layout');
  const layout = calculateLayout(input);
  return generateBOMFromLayout(input, layout, null, null);
}

/**
 * Calculate plan summary from pre-computed results.
 */
export function calculateSummaryFromResults(
  input: PlannerInput,
  layout: LayoutData,
  bom: BOMItem[],
  options: CostingOptions = {}
): PlanSummary {
  const { hasGroundLevel = false } = options;
  const config = RACK_TYPES[input.rackType];

  // Total pallet positions: beam levels + ground level (if enabled)
  const totalLevels = input.rack.beamLevels + (hasGroundLevel ? 1 : 0);
  const totalPalletPositions =
    layout.baysPerRow *
    input.rack.palletsPerLevel *
    totalLevels *
    layout.rackRows;

  const totalCapacity = totalPalletPositions * input.pallet.loadPerPallet;

  const totalCost = bom.reduce((sum, item) => sum + item.totalCost, 0);
  const costPerPosition = totalPalletPositions > 0 ? totalCost / totalPalletPositions : 0;

  const rate = EXCHANGE_RATES[input.displayCurrency] ?? EXCHANGE_RATES.USD;

  return {
    totalPalletPositions,
    totalStorageCapacity: totalCapacity,
    warehouseArea: layout.warehouseArea,
    rackingArea: layout.rackingArea,
    spaceUtilization: layout.utilization,
    estimatedTotalCost: Math.round(totalCost / rate * 100) / 100,
    costPerPalletPosition: Math.round(costPerPosition / rate * 100) / 100,
    rackSystem: config.name,
    rackType: input.rackType,
    beamLevels: input.rack.beamLevels,
    hasGroundLevel,
  };
}

/**
 * Legacy API — for backward compatibility.
 */
export function calculateSummary(input: PlannerInput): PlanSummary {
  const { calculateLayout } = require('./layout');
  const layout = calculateLayout(input);
  const bom = generateBOMFromLayout(input, layout, null, null);
  return calculateSummaryFromResults(input, layout, bom);
}
