import { create } from 'zustand';
import type {
  WarehouseParams,
  RackParams,
  PalletParams,
  RackType,
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
  SPACING,
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

const EXCHANGE_RATE_CACHE_KEY = 'rackinghub:exchangeRate';
const EXCHANGE_RATE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchExchangeRate(): Promise<number | null> {
  try {
    const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (cached) {
      const { rate, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < EXCHANGE_RATE_CACHE_TTL) {
        return rate;
      }
    }
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.rates?.CNY) {
      localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify({
        rate: data.rates.CNY,
        timestamp: Date.now(),
      }));
      return data.rates.CNY;
    }
  } catch {
    // ignore — fall back to config rate
  }
  return null;
}

export async function initExchangeRate() {
  const liveRate = await fetchExchangeRate();
  if (liveRate && liveRate > 0) {
    return liveRate;
  }
  return EXCHANGE_RATES.USD;
}

interface PlannerState {
  // Input
  warehouse: WarehouseParams;
  rackType: RackType;
  rack: RackParams;
  pallet: PalletParams;
  displayCurrency: CurrencyCode;
  wireMeshDeck: boolean;

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
  setWireMeshDeck: (enabled: boolean) => void;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  setExchangeRate: (rate: number) => void;
  calculate: () => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  warehouse: { ...DEFAULT_WAREHOUSE },
  rackType: 'selective',
  rack: { ...DEFAULT_RACK },
  pallet: { ...DEFAULT_PALLET },
  displayCurrency: 'USD',
  wireMeshDeck: false,

  summary: null,
  bom: [],
  layout: null,
  beamSelection: null,
  uprightSelection: null,
  warnings: [],
  shipping: null,
  totalExFactoryCNY: 0,
  totalDisplayCurrency: 0,
  exchangeRate: (() => {
    try {
      const cached = typeof localStorage !== 'undefined'
        ? localStorage.getItem(EXCHANGE_RATE_CACHE_KEY)
        : null;
      if (cached) {
        const { rate, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < EXCHANGE_RATE_CACHE_TTL) {
          return rate;
        }
      }
    } catch { /* ignore */ }
    return EXCHANGE_RATES.USD;
  })(),

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
    set((state) => {
      const newRack = { ...state.rack, ...partial };
      // Auto-update firstBeamHeight based on ground level setting
      if (partial.hasGroundLevel !== undefined) {
        if (partial.hasGroundLevel) {
          newRack.firstBeamHeight = state.pallet.height + SPACING.topClearance;
        } else {
          newRack.firstBeamHeight = 300;
        }
      }
      return { rack: newRack };
    });
    debounce(() => get().calculate(), 120);
  },

  setPallet: (partial) => {
    set((state) => {
      const newPallet = { ...state.pallet, ...partial };
      // If ground level is enabled, update first beam height to match new pallet height
      const newRack = state.rack.hasGroundLevel
        ? { ...state.rack, firstBeamHeight: newPallet.height + SPACING.topClearance }
        : state.rack;
      return { pallet: newPallet, rack: newRack };
    });
    debounce(() => get().calculate(), 120);
  },

  setWireMeshDeck: (enabled) => {
    set({ wireMeshDeck: enabled });
    get().calculate();
  },

  setDisplayCurrency: (currency) => {
    const rate = EXCHANGE_RATES[currency] ?? EXCHANGE_RATES.USD;
    set({ displayCurrency: currency, exchangeRate: rate });
    get().calculate();
  },

  setExchangeRate: (rate) => {
    set({ exchangeRate: rate });
    get().calculate();
  },

  calculate: () => {
    const state = get();

    // Compute firstBeamHeight based on ground level setting
    const firstBeamHeight = state.rack.hasGroundLevel
      ? state.pallet.height + SPACING.topClearance
      : state.rack.firstBeamHeight;
    const rack = { ...state.rack, firstBeamHeight };

    try {
      const input: PlannerInput = {
        warehouse: state.warehouse,
        rackType: state.rackType,
        rack,
        pallet: state.pallet,
        displayCurrency: state.displayCurrency,
      };

      // 1. Calculate layout
      const layout = calculateLayout(input);

      // 2. Select beam (only if there are beam levels)
      let beamSelection: BeamSelection | null = null;
      if (state.rack.beamLevels > 0) {
        beamSelection = selectBeam({
          palletsPerLevel: state.rack.palletsPerLevel,
          palletWidth: state.pallet.width,
          loadPerPallet: state.pallet.loadPerPallet,
        });
      }

      // 3. Select upright (auto-selects material)
      const totalLevels = state.rack.beamLevels + (state.rack.hasGroundLevel ? 1 : 0);
      const uprightSelection = selectUpright({
        palletsPerLevel: state.rack.palletsPerLevel,
        beamLevels: state.rack.beamLevels,
        loadPerPallet: state.pallet.loadPerPallet,
        palletDepth: state.pallet.depth,
        palletHeight: state.pallet.height,
        firstBeamHeightMm: firstBeamHeight,
        beamHeightMm: beamSelection?.heightMm ?? 120,
        hasGroundLevel: state.rack.hasGroundLevel,
      });

      // 4. Generate BOM
      const bom = generateBOMFromLayout(input, layout, beamSelection, uprightSelection, {
        wireMeshDeck: state.wireMeshDeck,
        hasGroundLevel: state.rack.hasGroundLevel,
      });

      // 5. Validate
      const warnings = validateLayout(input, layout, beamSelection, uprightSelection);

      // 6. Summary + currency + shipping
      const summary = calculateSummaryFromResults(input, layout, bom, {
        hasGroundLevel: state.rack.hasGroundLevel,
      });
      const rate = state.exchangeRate ?? EXCHANGE_RATES[state.displayCurrency];
      const totalExFactoryCNY = bom.reduce((s, item) => s + item.totalCost, 0);
      const totalWeightKg = bom.reduce((s, item) => s + item.totalWeight, 0);
      const shipping = calculateShipping(totalWeightKg, state.exchangeRate);

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
      displayCurrency: 'USD',
      wireMeshDeck: false,
      summary: null,
      bom: [],
      layout: null,
      beamSelection: null,
      uprightSelection: null,
      warnings: [],
      shipping: null,
      totalExFactoryCNY: 0,
      totalDisplayCurrency: 0,
      exchangeRate: (() => {
        try {
          const cached = typeof localStorage !== 'undefined'
            ? localStorage.getItem(EXCHANGE_RATE_CACHE_KEY)
            : null;
          if (cached) {
            const { rate, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < EXCHANGE_RATE_CACHE_TTL) {
              return rate;
            }
          }
        } catch { /* ignore */ }
        return EXCHANGE_RATES.USD;
      })(),
    });
    setTimeout(() => get().calculate(), 0);
  },
}));
