'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS, EXCHANGE_RATES } from '@/lib/calculator/config';
import type { CurrencyCode } from '@/lib/calculator/types';
import { NumberInput } from './NumberInput';
import { cn } from '@/lib/utils';

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: '$ USD',
  EUR: '€ EUR',
  GBP: '£ GBP',
  AUD: 'A$ AUD',
  CAD: 'C$ CAD',
  CNY: '¥ CNY',
};

export function RackSettings() {
  const {
    rack,
    pallet,
    setRack,
    setPallet,
    displayCurrency,
    setDisplayCurrency,
    wireMeshDeck,
    setWireMeshDeck,
  } = usePlannerStore();
  const constraints = CONSTRAINTS.rack;

  const hasGroundLevel = rack.hasGroundLevel;
  const effectiveFirstBeam = hasGroundLevel ? pallet.height : rack.firstBeamHeight;

  return (
    <div className="space-y-4">
      {/* Ground Level Toggle */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Ground Level Pallets
        </label>
        <button
          type="button"
          onClick={() => setRack({ hasGroundLevel: !hasGroundLevel })}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
            hasGroundLevel
              ? 'border-primary-950 bg-primary-50'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          )}
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {hasGroundLevel ? 'Ground Level Enabled' : 'Ground Level Disabled'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {hasGroundLevel
                ? 'Pallets stored directly on floor — first beam above pallet height'
                : 'All pallets on beams — first beam at 300mm'}
            </div>
          </div>
          <div className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            hasGroundLevel ? 'bg-primary-950' : 'bg-slate-300'
          )}>
            <div className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              hasGroundLevel ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
        </button>
        {hasGroundLevel && (
          <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            First beam height: <strong>{pallet.height}mm</strong> (pallet height) — ground level pallets don't need beams
          </div>
        )}
      </div>

      <NumberInput
        label="Number of Levels"
        value={rack.levels}
        onChange={(v) => setRack({ levels: v })}
        min={constraints.levels.min}
        max={constraints.levels.max}
        step={1}
        unit="levels"
        hint={hasGroundLevel ? `Total storage levels: ${rack.levels} (${rack.levels - 1} beam + 1 ground)` : undefined}
      />

      <NumberInput
        label="Pallets per Bay"
        value={rack.palletsPerBay}
        onChange={(v) => setRack({ palletsPerBay: v })}
        min={constraints.palletsPerBay.min}
        max={constraints.palletsPerBay.max}
        step={1}
        unit="pallets"
      />

      {!hasGroundLevel && (
        <NumberInput
          label="First Beam Height"
          value={rack.firstBeamHeight}
          onChange={(v) => setRack({ firstBeamHeight: v })}
          min={constraints.firstBeamHeight.min}
          max={constraints.firstBeamHeight.max}
          step={100}
          unit="mm"
        />
      )}

      <NumberInput
        label="Aisle Width"
        value={rack.aisleWidth}
        onChange={(v) => setRack({ aisleWidth: v })}
        min={constraints.aisleWidth.min}
        max={constraints.aisleWidth.max}
        step={100}
      />

      {/* Wire Mesh Decking (optional) */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Wire Mesh Decking
        </label>
        <button
          type="button"
          onClick={() => setWireMeshDeck(!wireMeshDeck)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
            wireMeshDeck
              ? 'border-primary-950 bg-primary-50'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          )}
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {wireMeshDeck ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {wireMeshDeck
                ? '10 kg/m² — ¥84/m² ex-factory'
                : 'Add wire mesh decking to each pallet position'}
            </div>
          </div>
          <div className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            wireMeshDeck ? 'bg-primary-950' : 'bg-slate-300'
          )}>
            <div className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              wireMeshDeck ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
        </button>
      </div>

      {/* Display Currency */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Display Currency
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(EXCHANGE_RATES) as CurrencyCode[]).map((currency) => (
            <button
              key={currency}
              type="button"
              onClick={() => setDisplayCurrency(currency)}
              className={cn(
                'px-2 py-1.5 rounded-lg text-center text-xs font-medium transition-all',
                displayCurrency === currency
                  ? 'bg-primary-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {CURRENCY_LABELS[currency]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
