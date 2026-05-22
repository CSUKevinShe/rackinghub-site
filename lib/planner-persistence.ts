// URL parameter encoding/decoding + localStorage persistence for planner state
import type {
  WarehouseParams,
  RackParams,
  PalletParams,
  RackType,
  CurrencyCode,
  RackDirection,
} from '@/lib/calculator/types';
import {
  DEFAULT_WAREHOUSE,
  DEFAULT_RACK,
  DEFAULT_PALLET,
} from '@/lib/calculator/config';

const STORAGE_KEY = 'rackinghub:plannerState';
const URL_PARAMS = [
  'wh_l', 'wh_w', 'wh_h', 'wh_wc', 'wh_csx', 'wh_csy', 'wh_cw', 'wh_cd', 'wh_tax', 'wh_tay',
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
  direction?: RackDirection;
  displayCurrency: CurrencyCode;
}): string {
  const { warehouse, rackType, rack, pallet, wireMeshDeck, direction, displayCurrency } = params;
  const p = new URLSearchParams();
  p.set('wh_l', String(warehouse.length));
  p.set('wh_w', String(warehouse.width));
  p.set('wh_h', String(warehouse.height));
  p.set('wh_wc', String(warehouse.wallClearance));
  if (warehouse.columnsX && warehouse.columnsX !== 4) p.set('wh_cx', String(warehouse.columnsX));
  if (warehouse.columnsY && warehouse.columnsY !== 2) p.set('wh_cy', String(warehouse.columnsY));
  if (warehouse.columnSpanX && warehouse.columnSpanX !== 10000) p.set('wh_csx', String(warehouse.columnSpanX));
  if (warehouse.columnSpanY && warehouse.columnSpanY !== 10000) p.set('wh_csy', String(warehouse.columnSpanY));
  if (warehouse.columnWidth && warehouse.columnWidth !== 300) p.set('wh_cw', String(warehouse.columnWidth));
  if (warehouse.columnDepth && warehouse.columnDepth !== 300) p.set('wh_cd', String(warehouse.columnDepth));
  if (warehouse.transferAisleX && warehouse.transferAisleX !== 3000) p.set('wh_tax', String(warehouse.transferAisleX));
  if (warehouse.transferAisleY && warehouse.transferAisleY !== 3000) p.set('wh_tay', String(warehouse.transferAisleY));
  if (rackType !== 'selective') p.set('type', rackType);
  p.set('levels', String(rack.beamLevels));
  p.set('ppl', String(rack.palletsPerLevel));
  p.set('aisle', String(rack.aisleWidth));
  if (rack.firstBeamHeight !== 300) p.set('fbh', String(rack.firstBeamHeight));
  if (rack.hasGroundLevel) p.set('ground', '1');
  if (direction != null && direction !== 0) p.set('dir', String(direction));
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
  direction: RackDirection;
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
      columnSpacing: 0,
      columnsX: parseInt(p.get('wh_cx') || '0') || DEFAULT_WAREHOUSE.columnsX,
      columnsY: parseInt(p.get('wh_cy') || '0') || DEFAULT_WAREHOUSE.columnsY,
      columnSpanX: parseInt(p.get('wh_csx') || '0') || DEFAULT_WAREHOUSE.columnSpanX,
      columnSpanY: parseInt(p.get('wh_csy') || '0') || DEFAULT_WAREHOUSE.columnSpanY,
      columnWidth: parseInt(p.get('wh_cw') || '0') || DEFAULT_WAREHOUSE.columnWidth,
      columnDepth: parseInt(p.get('wh_cd') || '0') || DEFAULT_WAREHOUSE.columnDepth,
      transferAisleX: parseInt(p.get('wh_tax') || '0') || DEFAULT_WAREHOUSE.transferAisleX,
      transferAisleY: parseInt(p.get('wh_tay') || '0') || DEFAULT_WAREHOUSE.transferAisleY,
      zones: [],
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
    };
  }

  if (p.has('dir')) {
    const d = parseInt(p.get('dir') || '0');
    result.direction = (d === 1 ? 1 : 0) as RackDirection;
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
    // ignore
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
