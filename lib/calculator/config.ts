import type {
  RackTypeConfig,
  CostReference,
  WarehouseParams,
  RackParams,
  PalletParams,
  PlannerInput,
} from './types';

// ============================================================
// Rack Type Configurations
// ============================================================

export const RACK_TYPES: Record<string, RackTypeConfig> = {
  selective: {
    id: 'selective',
    name: 'Heavy-Duty Selective Racking',
    description:
      'The most common pallet racking system. Every pallet is directly accessible, ideal for high-SKU warehouses with varied inventory.',
    icon: 'Grid3X3',
    defaultAisleWidth: 2500,
    depthMultiplier: 1,
    utilizationRange: [30, 45],
    pros: [
      '100% pallet accessibility',
      'Easy SKU management',
      'Compatible with all forklift types',
      'Flexible configuration',
    ],
    cons: [
      'Lower storage density',
      'Requires wider aisles',
      'More floor space per pallet',
    ],
    bestFor:
      'Warehouses with many SKUs, varied inventory, and frequent access to different pallets.',
  },
  'drive-in': {
    id: 'drive-in',
    name: 'Drive-In / Drive-Through Racking',
    description:
      'High-density storage where forklifts drive directly into rack lanes. Eliminates aisles for up to 80% space utilization.',
    icon: 'Warehouse',
    defaultAisleWidth: 2700,
    depthMultiplier: 1,
    utilizationRange: [65, 80],
    pros: [
      'Up to 80% space utilization',
      'Eliminates most aisles',
      'Lowest cost per pallet position',
      'Ideal for bulk storage',
    ],
    cons: [
      'LIFO or FIFO only (single direction)',
      'Limited pallet accessibility',
      'Slower operation',
      'Requires experienced forklift operators',
    ],
    bestFor:
      'Cold storage, bulk storage, seasonal goods, and operations with few SKUs and high volume per SKU.',
  },
  'radio-shuttle': {
    id: 'radio-shuttle',
    name: 'Radio Shuttle Racking',
    description:
      'Semi-automated high-density system using shuttle carts that run on rails inside rack lanes. Combines density with improved throughput.',
    icon: 'Zap',
    defaultAisleWidth: 2700,
    depthMultiplier: 1,
    utilizationRange: [60, 75],
    pros: [
      'High density (up to 75%)',
      'FIFO or LIFO capable',
      'Faster than drive-in',
      'Reduced forklift damage risk',
    ],
    cons: [
      'Higher initial investment',
      'Requires shuttle carts',
      'Electrical infrastructure needed',
      'Maintenance of shuttle carts',
    ],
    bestFor:
      'High-volume operations needing both density and throughput, such as FMCG distribution and automotive parts.',
  },
};

// ============================================================
// Cost Reference — ex-factory pricing (不含税出厂价 = cost × 1.20)
// ============================================================

export const COST_REFERENCE: CostReference = {
  baseSteelPerKg: 2.0,    // Legacy — kept for backward compat
  deckingPerM2: 18,
  safetyPerPosition: 3.5,

  // Factory cost (不含税成本价)
  q235CostPerKg: 7.0,
  q355CostPerKg: 8.0,

  // Ex-factory price (不含税出厂价, includes 20% profit)
  q235PricePerKg: 8.4,   // 7.0 × 1.20
  q355PricePerKg: 9.6,   // 8.0 × 1.20

  deckingPerM2CostCNY: 70,    // 10kg/m² × 7 CNY/kg
  deckingPerM2PriceCNY: 84,   // 70 × 1.20
  safetyPerPositionCostCNY: 24.5,
  safetyPerPositionPriceCNY: 29.4,  // 24.5 × 1.20

  // Row spacer: 矩管 50×30×1.5, default width 200mm
  rowSpacerWidthMm: 200,
  rowSpacerWeightPerPiece: 1.0,  // 矩管 + 连接板 ≈ 1kg
};

export const PROFIT_MARGIN = 1.20;

/** Exchange rates: 1 unit of currency = X CNY (updated 2026-05-18) */
export const EXCHANGE_RATES = {
  USD: 6.78,
  EUR: 7.92,
  GBP: 9.09,
  AUD: 4.92,
  CAD: 4.95,
  CNY: 1.0,
} as const;

/** Safety factor for load calculations */
export const SAFETY_FACTOR = 1.05;

/** Upright thickness constraint: beam load per level > this → thickness must be > UPRIGHT_MIN_THICKNESS_HEAVY */
export const UPRIGHT_THICKNESS_THRESHOLD_KG = 3000;
export const UPRIGHT_MIN_THICKNESS_HEAVY = 2.0;

/** Precise spacing rules (mm) */
export const SPACING = {
  palletToPallet: 100,        // between adjacent pallets on same bay
  palletToUpright: 100,       // between pallet end and upright face
  topClearance: 100,          // pallet top to beam bottom above
  palletOverhang: 50,         // pallet overhang on beam (each side)
  topBeamToCeiling: 300,      // min clearance from top beam to ceiling
  frameDepthOffset: 100,      // frame depth = pallet depth - this
} as const;

// ============================================================
// Default Parameters
// ============================================================

export const DEFAULT_WAREHOUSE: WarehouseParams = {
  length: 50000,
  width: 25000,
  height: 10000,
  wallClearance: 200,
  columnSpacingX: 8000,
  columnSpacingY: 12000,
  wallThickness: 300,
  columnSize: 400,
};

export const DEFAULT_RACK: RackParams = {
  beamLevels: 4,
  palletsPerLevel: 3,
  aisleWidth: 2500,
  firstBeamHeight: 300,
  hasGroundLevel: false,
  rackDirection: 'length',
};

export const DEFAULT_PALLET: PalletParams = {
  width: 1000,
  depth: 1200,
  height: 1500,
  loadPerPallet: 1000,
};

export const DEFAULT_INPUT: PlannerInput = {
  warehouse: DEFAULT_WAREHOUSE,
  rackType: 'selective',
  rack: DEFAULT_RACK,
  pallet: DEFAULT_PALLET,
  displayCurrency: 'USD',
};

// ============================================================
// Physical Constraints
// ============================================================

export const CONSTRAINTS = {
  warehouse: {
    length: { min: 5000, max: 200000 },
    width: { min: 5000, max: 100000 },
    height: { min: 3000, max: 30000 },
    wallClearance: { min: 50, max: 1000 },
    columnSpacingX: { min: 0, max: 20000 },
    columnSpacingY: { min: 0, max: 20000 },
    wallThickness: { min: 100, max: 600 },
    columnSize: { min: 200, max: 800 },
  },
  rack: {
    beamLevels: { min: 1, max: 15 },
    palletsPerLevel: { min: 1, max: 6 },
    aisleWidth: { min: 1500, max: 4000 },
    firstBeamHeight: { min: 200, max: 2500 },
  },
  pallet: {
    width: { min: 600, max: 1500 },
    depth: { min: 800, max: 1800 },
    height: { min: 800, max: 2500 },
    loadPerPallet: { min: 200, max: 3000 },
  },
};

// Budget tier removed — all prices use fixed ex-factory pricing
