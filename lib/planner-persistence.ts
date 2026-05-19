// URL parameter encoding/decoding + localStorage persistence for planner state
import type {
  WarehouseParams,
  RackParams,
  PalletParams,
  RackType,
  CurrencyCode,
} from '@/lib/calculator/types';
import {
  DEFAULT_WAREHOUSE,
  DEFAULT_RACK,
  DEFAULT_PALLET,
} from '@/lib/calculator/config';

const STORAGE_KEY = 'rackinghub:plannerState';
const URL_PARAMS = [
  'wh_l', 'wh_w', 'wh_h', 'wh_wc', 'wh_cx', 'wh_cy',
  'type',
  'levels', 'ppl', 'aisle', 'fbh', 'ground', 'dir',
  'pw', 'pd', 'ph', 'load',
  'deck', 'currency',
] as const;

/** Serialize all input params to a URL-friendly query string */
export function encodeParams(params: {
  warehouse: WarehouseParams;
  rackType: RackType;
  rack: RackParams;
  pallet: PalletParams;
  wireMeshDeck: boolean;
  displayCurrency: CurrencyCode;
}): string {
  const { warehouse, rackType, rack, pallet, wireMeshDeck, displayCurrency } = params;
  const p = new URLSearchParams();
  p.set('wh_l', String(warehouse.length));
  p.set('wh_w', String(warehouse.width));
  p.set('wh_h', String(warehouse.height));
  p.set('wh_wc', String(warehouse.wallClearance));
  if (warehouse.columnSpacingX) p.set('wh_cx', String(warehouse.columnSpacingX));
  if (warehouse.columnSpacingY) p.set('wh_cy', String(warehouse.columnSpacingY));
  if (warehouse.wallThickness !== 300) p.set('wh_wt', String(warehouse.wallThickness));
  if (warehouse.columnSize !== 400) p.set('wh_cs', String(warehouse.columnSize));
  if (rackType !== 'selective') p.set('type', rackType);
  p.set('levels', String(rack.beamLevels));
  p.set('ppl', String(rack.palletsPerLevel));
  p.set('aisle', String(rack.aisleWidth));
  if (rack.firstBeamHeight !== 300) p.set('fbh', String(rack.firstBeamHeight));
  if (rack.hasGroundLevel) p.set('ground', '1');
  if (rack.rackDirection !== 'length') p.set('dir', rack.rackDirection);
  p.set('pw', String(pallet.width));
  p.set('pd', String(pallet.depth));
  p.set('ph', String(pallet.height));
  p.set('load', String(pallet.loadPerPallet));
  if (wireMeshDeck) p.set('deck', '1');
  if (displayCurrency !== 'USD') p.set('currency', displayCurrency);
  return p.toString();
}

/** Parse URL query string into planner params */
export function decodeParams(search?: string): Partial<{
  warehouse: WarehouseParams;
  rackType: RackType;
  rack: RackParams;
  pallet: PalletParams;
  wireMeshDeck: boolean;
  displayCurrency: CurrencyCode;
}> | null {
  const qs = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  if (!qs || qs.length < 2) return null;

  const p = new URLSearchParams(qs.startsWith('?') ? qs : `?${qs}`);
  if (!p.has('wh_l') && !p.has('pw') && !p.has('aisle')) return null;

  const result: ReturnType<typeof decodeParams> = {};

  if (p.has('wh_l')) {
    result.warehouse = {
      length: parseInt(p.get('wh_l') || '0') || DEFAULT_WAREHOUSE.length,
      width: parseInt(p.get('wh_w') || '0') || DEFAULT_WAREHOUSE.width,
      height: parseInt(p.get('wh_h') || '0') || DEFAULT_WAREHOUSE.height,
      wallClearance: parseInt(p.get('wh_wc') || '0') || DEFAULT_WAREHOUSE.wallClearance,
      columnSpacingX: parseInt(p.get('wh_cx') || '0') || DEFAULT_WAREHOUSE.columnSpacingX,
      columnSpacingY: parseInt(p.get('wh_cy') || '0') || DEFAULT_WAREHOUSE.columnSpacingY,
      wallThickness: parseInt(p.get('wh_wt') || '0') || DEFAULT_WAREHOUSE.wallThickness,
      columnSize: parseInt(p.get('wh_cs') || '0') || DEFAULT_WAREHOUSE.columnSize,
    };
  }

  if (p.has('type')) {
    const t = p.get('type');
    if (t === 'selective' || t === 'drive-in' || t === 'radio-shuttle') {
      result.rackType = t as RackType;
    }
  }

  if (p.has('levels') || p.has('aisle')) {
    result.rack = {
      beamLevels: parseInt(p.get('levels') || '0') || DEFAULT_RACK.beamLevels,
      palletsPerLevel: parseInt(p.get('ppl') || '0') || DEFAULT_RACK.palletsPerLevel,
      aisleWidth: parseInt(p.get('aisle') || '0') || DEFAULT_RACK.aisleWidth,
      firstBeamHeight: parseInt(p.get('fbh') || '0') || DEFAULT_RACK.firstBeamHeight,
      hasGroundLevel: p.get('ground') === '1',
      rackDirection: (p.get('dir') as RackParams['rackDirection']) || 'length',
    };
  }

  if (p.has('pw')) {
    result.pallet = {
      width: parseInt(p.get('pw') || '0') || DEFAULT_PALLET.width,
      depth: parseInt(p.get('pd') || '0') || DEFAULT_PALLET.depth,
      height: parseInt(p.get('ph') || '0') || DEFAULT_PALLET.height,
      loadPerPallet: parseInt(p.get('load') || '0') || DEFAULT_PALLET.loadPerPallet,
    };
  }

  if (p.has('deck')) result.wireMeshDeck = p.get('deck') === '1';
  if (p.has('currency')) {
    const c = p.get('currency') as CurrencyCode;
    if (['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CNY'].includes(c)) {
      result.displayCurrency = c;
    }
  }

  return result;
}

/** Save current params to localStorage */
export function saveToLocalStorage(params: {
  warehouse: WarehouseParams;
  rackType: RackType;
  rack: RackParams;
  pallet: PalletParams;
  wireMeshDeck: boolean;
  displayCurrency: CurrencyCode;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // ignore — storage may be full or disabled
  }
}

/** Restore params from localStorage */
export function loadFromLocalStorage(): ReturnType<typeof decodeParams> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}
