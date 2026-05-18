// ============================================================
// RackingHub Planner — Type Definitions
// ============================================================

/** Supported racking system types */
export type RackType = 'selective' | 'drive-in' | 'radio-shuttle';

/** Warehouse building dimensions */
export interface WarehouseParams {
  /** Building interior length in mm */
  length: number;
  /** Building interior width in mm */
  width: number;
  /** Clear height from floor to lowest obstruction in mm */
  height: number;
  /** Minimum clearance from wall to nearest rack face in mm */
  wallClearance: number;
  /** Column spacing along warehouse length in mm — 0 = ignore */
  columnSpacingX: number;
  /** Column spacing along warehouse width in mm — 0 = ignore */
  columnSpacingY: number;
}

/** Rack system configuration */
export interface RackParams {
  /** Number of beam levels (ground level is separate — total storage levels = beamLevels + 1 if hasGroundLevel) */
  beamLevels: number;
  /** Number of pallets per level (along the beam) */
  palletsPerLevel: number;
  /** Aisle width between opposing rack faces in mm */
  aisleWidth: number;
  /** Height from floor to bottom of first beam, mm */
  firstBeamHeight: number;
  /** Whether ground-level pallets are stored directly on floor (no beams needed) */
  hasGroundLevel: boolean;
}

/** Pallet / load specifications */
export interface PalletParams {
  /** Pallet width (shorter side, along beam) in mm */
  width: number;
  /** Pallet depth (longer side, along frame) in mm */
  depth: number;
  /** Pallet height including load in mm */
  height: number;
  /** Uniform load per pallet in kg */
  loadPerPallet: number;
}

/** Display currency code */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'CNY';

/** Complete input parameter set */
export interface PlannerInput {
  warehouse: WarehouseParams;
  rackType: RackType;
  rack: RackParams;
  pallet: PalletParams;
  /** User-selected display currency */
  displayCurrency: CurrencyCode;
}

/** Beam selection result from capacity table */
export interface BeamSelection {
  profileCode: string;         // e.g. "B150*50_t1.5"
  heightMm: number;
  thicknessMm: number;
  effectiveSpanMm: number;
  requiredCapacityKg: number;
  tableCapacityKg: number;
  weightPerMeter: number;      // kg/m
}

/** Upright selection result — material is auto-selected (cheapest adequate) */
export interface UprightSelection {
  profileCode: string;         // e.g. "90*70 (2.3)"
  material: 'Q235' | 'Q355';  // auto-selected cheapest adequate material
  ctype: 'D' | 'SF' | 'ZX';
  thicknessMm: number;
  weightPerMeter: number;      // kg/m
  frameHeightMm: number;
  requiredCapacityKg: number;
  tableCapacityKg: number;
  bracingType: 'D' | 'Z';
  bracingCount: { horizontal: number; diagonal: number };
}

/** Validation warning */
export interface ValidationWarning {
  type: 'beam' | 'frame' | 'layout' | 'height' | 'thickness';
  message: string;
  severity: 'warning' | 'error';
}

/** Container shipping result */
export interface ShippingResult {
  containerCount: number;
  totalFOBCNY: number;
  totalFOBDisplay: number;
  totalWeightKg: number;
  weightPerContainer: number[];
}

/** Dimensions of a single rack frame (upright) */
export interface FrameSpec {
  height: number;
  depth: number;
  sectionWeight: number; // kg per upright
}

/** Dimensions of a single rack beam */
export interface BeamSpec {
  length: number;
  loadCapacity: number; // kg per pair
  weightPerPair: number; // kg
}

/** Bill of Materials line item */
export interface BOMItem {
  description: string;
  unit: string;
  quantity: number;
  unitWeight: number; // kg
  totalWeight: number; // kg
  unitCost: number; // display currency (from store)
  totalCost: number; // display currency (from store)
  category: 'frame' | 'beam' | 'decking' | 'accessory' | 'safety';
}

/** 2D layout element */
export interface LayoutElement {
  type: 'rack-row' | 'aisle' | 'wall' | 'clearance' | 'column';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

/** Computed layout data */
export interface LayoutData {
  elements: LayoutElement[];
  warehouseLength: number;
  warehouseWidth: number;
  /** Number of rack rows (single-deep rows) */
  rackRows: number;
  /** Number of aisles */
  aisles: number;
  /** Number of bays per row */
  baysPerRow: number;
  /** Number of double rack blocks */
  rackBlocks: number;
  /** Total racking area in m2 */
  rackingArea: number;
  /** Warehouse area in m2 */
  warehouseArea: number;
  /** Space utilization percentage */
  utilization: number;
  /** Column positions when columnSpacing > 0, in mm from warehouse origin */
  columnPositions?: { x: number; y: number }[];
  /** Y positions of each rack row for column alignment */
  rackRowPositions?: { index: number; y: number; height: number }[];
}

/** Plan summary (for display) */
export interface PlanSummary {
  totalPalletPositions: number;
  totalStorageCapacity: number; // kg
  warehouseArea: number; // m2
  rackingArea: number; // m2
  spaceUtilization: number; // %
  estimatedTotalCost: number; // display currency
  costPerPalletPosition: number; // display currency
  rackSystem: string;
  rackType: RackType;
  /** Number of beam levels */
  beamLevels: number;
  /** Whether ground level pallets are included */
  hasGroundLevel: boolean;
}

/** Complete planner output */
export interface PlannerResult {
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

/** Rack type display configuration */
export interface RackTypeConfig {
  id: RackType;
  name: string;
  description: string;
  icon: string;
  /** Recommended aisle width in mm */
  defaultAisleWidth: number;
  /** Depth multiplier for frame (1 = single-deep, 2+ = multi-deep) */
  depthMultiplier: number;
  /** Typical space utilization range */
  utilizationRange: [number, number];
  /** Pros (for display) */
  pros: string[];
  /** Cons (for display) */
  cons: string[];
  /** Best use case description */
  bestFor: string;
}

/**
 * Cost reference — single source of truth for material costs.
 * All prices are ex-factory (factory cost × 1.20).
 */
export interface CostReference {
  /** Base structural steel price in USD/kg (before budget multiplier) */
  baseSteelPerKg: number;
  /** Wire mesh deck per m2 */
  deckingPerM2: number;
  /** Safety accessories per pallet position */
  safetyPerPosition: number;
  // Ex-factory pricing (CNY)
  q235CostPerKg: number;
  q355CostPerKg: number;
  q235PricePerKg: number;
  q355PricePerKg: number;
  deckingPerM2CostCNY: number;
  deckingPerM2PriceCNY: number;
  safetyPerPositionCostCNY: number;
  safetyPerPositionPriceCNY: number;
  // Row spacer
  rowSpacerWidthMm: number;
  rowSpacerWeightPerPiece: number;
}
