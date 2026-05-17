import { create } from 'zustand';
import type {
  WarehouseParams,
  RackParams,
  PalletParams,
  RackType,
  BudgetTier,
  CurrencyCode,
  PlanSummary,
  BOMItem,
  LayoutData,
  PlannerInput,
  BeamSelection,
  UprightSelection,
  ValidationWarning,
  ShippingResult,
} from '@/lib/calculator/types';
import {
  DEFAULT_WAREHOUSE,
  DEFAULT_RACK,
  DEFAULT_PALLET,
  RACK_TYPES,
  EXCHANGE_RATES,
} from '@/lib/calculator/config';
import { calculateLayout, validateLayout } from '@/lib/calculator/layout';
import { generateBOMFromLayout, calculateSummaryFromResults } from '@/lib/calculator/costing';
import { selectBeam } from '@/lib/calculator/beam-selector';
import { selectUpright } from '@/lib/calculator/upright-selector';
import { calculateShipping } from '@/lib/calculator/container-shipping';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function debounce(fn: () => void, ms: number) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, ms);
}

interface PlannerState {
  // Input
  warehouse: WarehouseParams;
  rackType: RackType;
  rack: RackParams;
  pallet: PalletParams;
  budget: BudgetTier;
  displayCurrency: CurrencyCode;

  // Output
  summary: PlanSummary | null;
  bom: BOMItem[];
  layout: LayoutData | null;
  beamSelection: BeamSelection | null;
  uprightSelection: UprightSelection | null;
  warnings: ValidationWarning[];
  shipping: ShippingResult | null;
  totalExFactoryCNY: number;
  totalDisplayCurrency: number;
  exchangeRate: number;

  // Actions
  setWarehouse: (partial: Partial<WarehouseParams>) => void;
  setRackType: (type: RackType) => void;
  setRack: (partial: Partial<RackParams>) => void;
  setPallet: (partial: Partial<PalletParams>) => void;
  setBudget: (tier: BudgetTier) => void;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  calculate: () => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  warehouse: { ...DEFAULT_WAREHOUSE },
  rackType: 'selective',
  rack: { ...DEFAULT_RACK },
  pallet: { ...DEFAULT_PALLET },
  budget: 'standard',
  displayCurrency: 'USD',

  summary: null,
  bom: [],
  layout: null,
  beamSelection: null,
  uprightSelection: null,
  warnings: [],
  shipping: null,
  totalExFactoryCNY: 0,
  totalDisplayCurrency: 0,
  exchangeRate: EXCHANGE_RATES.USD,

  setWarehouse: (partial) => {
    set((state) => ({
      warehouse: { ...state.warehouse, ...partial },
    }));
    debounce(() => get().calculate(), 120);
  },

  setRackType: (type) => {
    const config = RACK_TYPES[type];
    set((state) => ({
      rackType: type,
      rack: { ...state.rack, aisleWidth: config.defaultAisleWidth },
    }));
    get().calculate();
  },

  setRack: (partial) => {
    set((state) => ({
      rack: { ...state.rack, ...partial },
    }));
    debounce(() => get().calculate(), 120);
  },

  setPallet: (partial) => {
    set((state) => ({
      pallet: { ...state.pallet, ...partial },
    }));
    debounce(() => get().calculate(), 120);
  },

  setBudget: (tier) => {
    set({ budget: tier });
    get().calculate();
  },

  setDisplayCurrency: (currency) => {
    const rate = EXCHANGE_RATES[currency] ?? EXCHANGE_RATES.USD;
    set({ displayCurrency: currency, exchangeRate: rate });
    get().calculate();
  },

  calculate: () => {
    const state = get();
    try {
      const input: PlannerInput = {
        warehouse: state.warehouse,
        rackType: state.rackType,
        rack: state.rack,
        pallet: state.pallet,
        budget: state.budget,
        displayCurrency: state.displayCurrency,
      };

      // 1. Calculate layout
      const layout = calculateLayout(input);

      // 2. Select beam
      const beamSelection = selectBeam({
        palletsPerBay: state.rack.palletsPerBay,
        palletWidth: state.pallet.width,
        loadPerPallet: state.pallet.loadPerPallet,
      });

      // 3. Select upright (auto-selects material)
      const uprightSelection = selectUpright({
        palletsPerBay: state.rack.palletsPerBay,
        levels: state.rack.levels,
        loadPerPallet: state.pallet.loadPerPallet,
        palletDepth: state.pallet.depth,
        palletHeight: state.pallet.height,
        firstBeamHeightMm: state.rack.firstBeamHeight,
        beamHeightMm: beamSelection?.heightMm ?? 120,
      });

      // 4. Generate BOM
      const bom = generateBOMFromLayout(input, layout, beamSelection, uprightSelection);

      // 5. Validate
      const warnings = validateLayout(input, layout, beamSelection, uprightSelection);

      // 6. Summary + currency + shipping
      const summary = calculateSummaryFromResults(input, layout, bom);
      const rate = EXCHANGE_RATES[state.displayCurrency] ?? EXCHANGE_RATES.USD;
      const totalExFactoryCNY = bom.reduce((s, item) => s + item.totalCost, 0);
      const totalWeightKg = bom.reduce((s, item) => s + item.totalWeight, 0);
      const shipping = calculateShipping(totalWeightKg);

      // Convert BOM costs from CNY to display currency
      const bomDisplay = bom.map(item => ({
        ...item,
        unitCost: Math.round((item.unitCost / rate) * 100) / 100,
        totalCost: Math.round((item.totalCost / rate) * 100) / 100,
      }));

      set({
        layout,
        summary,
        bom: bomDisplay,
        beamSelection,
        uprightSelection,
        warnings,
        shipping,
        totalExFactoryCNY: Math.round(totalExFactoryCNY * 100) / 100,
        totalDisplayCurrency: Math.round((totalExFactoryCNY / rate) * 100) / 100,
        exchangeRate: rate,
      });
    } catch (error) {
      console.error('Calculation error:', error);
    }
  },

  reset: () => {
    set({
      warehouse: { ...DEFAULT_WAREHOUSE },
      rackType: 'selective',
      rack: { ...DEFAULT_RACK },
      pallet: { ...DEFAULT_PALLET },
      budget: 'standard',
      displayCurrency: 'USD',
      summary: null,
      bom: [],
      layout: null,
      beamSelection: null,
      uprightSelection: null,
      warnings: [],
      shipping: null,
      totalExFactoryCNY: 0,
      totalDisplayCurrency: 0,
      exchangeRate: EXCHANGE_RATES.USD,
    });
    setTimeout(() => get().calculate(), 0);
  },
}));
