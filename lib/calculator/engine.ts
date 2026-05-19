// ============================================================
// RackingHub Planner — Calculation Engine
// Central coordinator for rack-type-specific plugins.
// ============================================================

import type {
  PlannerInput,
  LayoutData,
  BOMItem,
  BeamSelection,
  UprightSelection,
  ValidationWarning,
} from './types';
import { calculateLayout as calcLayout, validateLayout } from './layout';
import { generateBOMFromLayout, calculateSummaryFromResults } from './costing';
import { selectBeam } from './beam-selector';
import { selectUpright } from './upright-selector';
import { calculateShipping } from './container-shipping';
import type { ShippingResult, PlanSummary, CurrencyCode } from './types';
import { EXCHANGE_RATES } from './config';

// ============================================================
// Plugin interface for rack-type-specific logic.
// ============================================================

export interface RackTypePlugin {
  /** Calculate 2D layout for this rack type */
  calculateLayout(input: PlannerInput): LayoutData;
  /** Generate BOM items specific to this rack type */
  generateBOM(
    input: PlannerInput,
    layout: LayoutData,
    beamSelection: BeamSelection | null,
    uprightSelection: UprightSelection | null
  ): BOMItem[];
  /** Default params for this rack type (aisle width, depth multiplier, etc.) */
  getDefaultParams(): Record<string, number | string | boolean>;
  /** 3D rendering options — implemented when 3D support is added */
  get3DOptions?(): View3DOptions;
}

// ============================================================
// 3D view options — future interface, not yet implemented.
// ============================================================

export interface View3DOptions {
  cameraAngle: 'isometric' | 'perspective' | 'top-down';
  showPallets: boolean;
  showLabels: boolean;
  showDimensions: boolean;
}

/**
 * 3D renderer interface — to be implemented with Three.js or react-three-fiber.
 * Current status: placeholder.
 */
export interface View3DRenderer {
  render3D(layout: LayoutData, options: View3DOptions): Promise<unknown>;
}

// ============================================================
// Registry — maps rack type IDs to their plugin implementations.
// ============================================================

const RACK_TYPE_REGISTRY: Record<string, RackTypePlugin> = {};

/** Register a rack type plugin */
export function registerRackType(id: string, plugin: RackTypePlugin) {
  RACK_TYPE_REGISTRY[id] = plugin;
}

/** Get plugin for a rack type */
export function getRackTypePlugin(id: string): RackTypePlugin | undefined {
  return RACK_TYPE_REGISTRY[id];
}

// ============================================================
// Engine — orchestrates the full calculation pipeline.
// ============================================================

export interface EngineResult {
  layout: LayoutData;
  summary: PlanSummary;
  bom: BOMItem[];
  beamSelection: BeamSelection | null;
  uprightSelection: UprightSelection | null;
  warnings: ValidationWarning[];
  shipping: ShippingResult | null;
  totalExFactoryCNY: number;
  totalDisplayCurrency: number;
  exchangeRate: number;
}

/**
 * Run the full calculation pipeline:
 * 1. Calculate layout
 * 2. Select beam
 * 3. Select upright
 * 4. Generate BOM
 * 5. Validate
 * 6. Compute summary + currency + shipping
 */
export function calculate(input: PlannerInput): EngineResult {
  // 1. Layout
  const layout = calcLayout(input);

  // 2. Beam selection
  let beamSelection: BeamSelection | null = null;
  if (input.rack.beamLevels > 0) {
    beamSelection = selectBeam({
      palletsPerLevel: input.rack.palletsPerLevel,
      palletWidth: input.pallet.width,
      loadPerPallet: input.pallet.loadPerPallet,
    });
  }

  // 3. Upright selection
  const uprightSelection = selectUpright({
    palletsPerLevel: input.rack.palletsPerLevel,
    beamLevels: input.rack.beamLevels,
    loadPerPallet: input.pallet.loadPerPallet,
    palletDepth: input.pallet.depth,
    palletHeight: input.pallet.height,
    firstBeamHeightMm: input.rack.firstBeamHeight,
    beamHeightMm: beamSelection?.heightMm ?? 120,
    hasGroundLevel: input.rack.hasGroundLevel,
  });

  // 4. BOM
  const bom = generateBOMFromLayout(input, layout, beamSelection, uprightSelection, {
    hasGroundLevel: input.rack.hasGroundLevel,
  });

  // 5. Validate
  const warnings = validateLayout(input, layout, beamSelection, uprightSelection);

  // 6. Summary
  const summary = calculateSummaryFromResults(input, layout, bom, {
    hasGroundLevel: input.rack.hasGroundLevel,
  });

  const rate = EXCHANGE_RATES[input.displayCurrency] ?? EXCHANGE_RATES.USD;
  const totalExFactoryCNY = bom.reduce((s, item) => s + item.totalCost, 0);
  const totalWeightKg = bom.reduce((s, item) => s + item.totalWeight, 0);
  const shipping = calculateShipping(totalWeightKg, rate);

  return {
    layout,
    summary,
    bom,
    beamSelection,
    uprightSelection,
    warnings,
    shipping,
    totalExFactoryCNY,
    totalDisplayCurrency: totalExFactoryCNY / rate,
    exchangeRate: rate,
  };
}
