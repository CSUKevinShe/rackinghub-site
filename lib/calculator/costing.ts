import type {
  PlannerInput,
  PlanSummary,
  BOMItem,
  LayoutData,
  BeamSelection,
  UprightSelection,
} from './types';
import { COST_REFERENCE, RACK_TYPES, BUDGET_TIERS, EXCHANGE_RATES, UPRIGHT_THICKNESS_THRESHOLD_KG, SPACING } from './config';

// ============================================================
// Costing Engine — real profile weights + ex-factory pricing
// ============================================================

/**
 * Generate complete Bill of Materials with real profile data.
 */
export function generateBOMFromLayout(
  input: PlannerInput,
  layout: LayoutData,
  beamSelection: BeamSelection | null,
  uprightSelection: UprightSelection | null
): BOMItem[] {
  const { warehouse, rackType, rack, pallet, budget } = input;
  const budgetConfig = BUDGET_TIERS[budget];

  // Calculate rack height
  const beamSectionHeight = beamSelection?.heightMm ?? 120;
  const rackHeight =
    rack.firstBeamHeight +
    (rack.levels - 1) * (pallet.height + SPACING.topClearance) +
    beamSectionHeight +
    SPACING.topClearance;

  // Beam length = effective span
  const beamLength = beamSelection?.effectiveSpanMm ?? (pallet.width * rack.palletsPerBay);

  const totalBays = layout.baysPerRow * layout.rackRows;
  const framePositions = totalBays + 1;

  // Beams per bay = levels × 2 (both sides of bay)
  const beamsPerBay = rack.levels * 2;
  const totalBeams = beamsPerBay * totalBays;

  // Deck panels: one per pallet position per level
  const deckPanelsPerBay = rack.palletsPerBay * 2; // both sides
  const totalDecks = deckPanelsPerBay * layout.baysPerRow * layout.rackRows * rack.levels;

  // Material price from upright selection
  const materialPricePerKg = uprightSelection
    ? (uprightSelection.material === 'Q235'
        ? COST_REFERENCE.q235PricePerKg
        : COST_REFERENCE.q355PricePerKg)
    : COST_REFERENCE.q235PricePerKg;

  // Apply budget tier multiplier
  const effectivePricePerKg = materialPricePerKg * budgetConfig.multiplier;
  const effectiveDeckPerM2 = COST_REFERENCE.deckingPerM2PriceCNY * budgetConfig.multiplier;
  const effectiveSafetyPerPos = COST_REFERENCE.safetyPerPositionPriceCNY * budgetConfig.multiplier;

  const bom: BOMItem[] = [];

  // 1. Upright Frames
  if (uprightSelection) {
    const frameWeight = uprightSelection.weightPerMeter * rackHeight / 1000;
    const frameCost = frameWeight * effectivePricePerKg;
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

  // 2. Box Beams
  if (beamSelection) {
    const beamWeight = beamSelection.weightPerMeter * beamLength / 1000;
    const beamCost = beamWeight * COST_REFERENCE.q235PricePerKg * budgetConfig.multiplier; // beams are Q235
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
    const connectorCost = connectorWeight * effectivePricePerKg;
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

  // 3. Wire Mesh Decks
  const deckWidth = pallet.width;
  const deckDepth = pallet.depth - SPACING.frameDepthOffset;
  const deckAreaM2 = (deckWidth * deckDepth) / 1e6;
  const deckWeight = Math.round(deckAreaM2 * 15); // ~15 kg/m²
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

  // 4. Frame Base Plates
  const basePlateWeight = uprightSelection ? (uprightSelection.profileCode.includes('120') ? 1.52 : 1.30) : 1.27;
  const basePlateCost = basePlateWeight * effectivePricePerKg;
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
    const bracingCost = bracingWeight * effectivePricePerKg;
    bom.push({
      description: `Cross/Horizontal Bracing (${uprightSelection.bracingType}-type, ${uprightSelection.bracingCount.diagonal} diagonal + ${uprightSelection.bracingCount.horizontal} horizontal per row)`,
      unit: 'pcs',
      quantity: totalBracingPieces,
      unitWeight: Math.round(bracingWeightPerPiece * 100) / 100,
      totalWeight: Math.round(bracingWeight * 100) / 100,
      unitCost: Math.round(bracingWeightPerPiece * effectivePricePerKg * 100) / 100,
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

  bom.push({
    description: 'Row Spacers & Rack Clamps',
    unit: 'set',
    quantity: layout.rackRows * layout.baysPerRow,
    unitWeight: 2,
    totalWeight: Math.round(2 * layout.rackRows * layout.baysPerRow * 100) / 100,
    unitCost: Math.round(safetyCostPerPos * 2 * 100) / 100,
    totalCost: Math.round(safetyCostPerPos * 2 * layout.rackRows * layout.baysPerRow * 100) / 100,
    category: 'safety',
  });

  // 7. Drive-in specific items
  if (rackType === 'drive-in') {
    const palletsDeep = 6;
    const driveInRails = layout.rackRows * layout.baysPerRow * palletsDeep;
    bom.push({
      description: 'Drive-In Rail Profile (per meter)',
      unit: 'm',
      quantity: driveInRails,
      unitWeight: 12,
      totalWeight: Math.round(12 * driveInRails * 100) / 100,
      unitCost: Math.round(12 * effectivePricePerKg * 100) / 100,
      totalCost: Math.round(12 * effectivePricePerKg * driveInRails * 100) / 100,
      category: 'accessory',
    });
  }

  // 8. Radio shuttle specific items
  if (rackType === 'radio-shuttle') {
    const shuttleLanes = layout.rackRows;
    const laneLengthM = beamLength / 1000;
    bom.push({
      description: 'Radio Shuttle Rail (per meter)',
      unit: 'm',
      quantity: Math.round(shuttleLanes * layout.baysPerRow * laneLengthM),
      unitWeight: 15,
      totalWeight: Math.round(15 * shuttleLanes * layout.baysPerRow * laneLengthM * 100) / 100,
      unitCost: Math.round(15 * effectivePricePerKg * 100) / 100,
      totalCost: Math.round(15 * effectivePricePerKg * shuttleLanes * layout.baysPerRow * laneLengthM * 100) / 100,
      category: 'accessory',
    });
    bom.push({
      description: 'Radio Shuttle Cart',
      unit: 'pcs',
      quantity: shuttleLanes,
      unitWeight: 350,
      totalWeight: 350 * shuttleLanes,
      unitCost: Math.round(3500 * budgetConfig.multiplier),
      totalCost: Math.round(3500 * budgetConfig.multiplier * shuttleLanes * 100) / 100,
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
  bom: BOMItem[]
): PlanSummary {
  const config = RACK_TYPES[input.rackType];

  const totalPalletPositions =
    layout.baysPerRow *
    input.rack.palletsPerBay *
    input.rack.levels *
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
