'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS, EXCHANGE_RATES } from '@/lib/calculator/config';
import type { CurrencyCode } from '@/lib/calculator/types';
import { NumberInput } from './NumberInput';
import { cn } from '@/lib/utils';

const CURRENCY_INFO: Record<CurrencyCode, { symbol: string; country: string }> = {
  USD: { symbol: '$', country: 'US Dollar' },
  EUR: { symbol: '€', country: 'Euro' },
  GBP: { symbol: '£', country: 'British Pound' },
  AUD: { symbol: 'A$', country: 'Australian Dollar' },
  CAD: { symbol: 'C$', country: 'Canadian Dollar' },
  CNY: { symbol: '¥', country: 'Chinese Yuan' },
};

export function RackSettings() {
  const {
    rack,
    pallet,
    warehouse,
    setRack,
    setPallet,
    displayCurrency,
    setDisplayCurrency,
    exchangeRate,
    setExchangeRate,
    wireMeshDeck,
    setWireMeshDeck,
    setRackType,
    setWarehouse,
  } = usePlannerStore();
  const constraints = CONSTRAINTS.rack;

  const hasGroundLevel = rack.hasGroundLevel;

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
            First beam height: <strong>{pallet.height}mm</strong> (pallet height) — ground level pallets don&apos;t need beams
          </div>
        )}
      </div>

      <NumberInput
        label="Beam Levels"
        value={rack.beamLevels}
        onChange={(v) => setRack({ beamLevels: v })}
        min={constraints.beamLevels.min}
        max={constraints.beamLevels.max}
        step={1}
        unit="levels"
        hint={hasGroundLevel ? `Total storage levels: ${rack.beamLevels + 1} (${rack.beamLevels} beam + 1 ground)` : undefined}
      />

      <NumberInput
        label="Pallets per Level"
        value={rack.palletsPerLevel}
        onChange={(v) => setRack({ palletsPerLevel: v })}
        min={constraints.palletsPerLevel.min}
        max={constraints.palletsPerLevel.max}
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

      {/* Rack Direction */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Rack Direction
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRack({ rackDirection: 'length' })}
            className={`px-3 py-2 rounded-lg text-center transition-all border-2 ${
              rack.rackDirection === 'length'
                ? 'bg-primary-50 border-primary-400 text-primary-700'
                : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-semibold">Along Length</div>
            <div className="text-[10px] opacity-60 mt-0.5">{warehouse.length / 1000}m side</div>
          </button>
          <button
            type="button"
            onClick={() => setRack({ rackDirection: 'width' })}
            className={`px-3 py-2 rounded-lg text-center transition-all border-2 ${
              rack.rackDirection === 'width'
                ? 'bg-primary-50 border-primary-400 text-primary-700'
                : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-semibold">Along Width</div>
            <div className="text-[10px] opacity-60 mt-0.5">{warehouse.width / 1000}m side</div>
          </button>
        </div>
      </div>

      {/* Forklift Type Quick Select */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Forklift Type
        </label>
        <div className="space-y-1.5">
          {[
            { label: 'Counterbalance', width: 3200, desc: 'Traditional forklift — wide aisle needed', range: '3200–3500mm' },
            { label: 'Reach Truck', width: 2500, desc: 'Most common — balances density & speed', range: '2500–2800mm' },
            { label: 'Narrow Aisle', width: 1800, desc: 'High density storage', range: '1600–2000mm' },
            { label: 'VNA', width: 1500, desc: 'Very Narrow Aisle — max density', range: '1400–1600mm' },
          ].map((ft) => {
            const isInRange = rack.aisleWidth >= ft.width - 300 && rack.aisleWidth <= ft.width + 300;
            const isExact = rack.aisleWidth === ft.width;
            return (
              <button
                key={ft.label}
                type="button"
                onClick={() => setRack({ aisleWidth: ft.width })}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all border ${
                  isExact
                    ? 'border-primary-400 bg-primary-50'
                    : isInRange
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${isExact ? 'bg-primary-500' : isInRange ? 'bg-amber-400' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{ft.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">{ft.range}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{ft.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {(Object.keys(EXCHANGE_RATES) as CurrencyCode[]).map((currency) => {
            const info = CURRENCY_INFO[currency];
            return (
              <button
                key={currency}
                type="button"
                onClick={() => setDisplayCurrency(currency)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
                  displayCurrency === currency
                    ? 'bg-primary-950 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <span className="text-sm font-bold w-6">{info.symbol}</span>
                <span className="text-xs font-medium">{info.country}</span>
              </button>
            );
          })}
        </div>

        {/* Exchange Rate Input */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
          <label className="text-xs text-slate-500 shrink-0">
            1 {displayCurrency} =
          </label>
          <input
            type="number"
            value={exchangeRate}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0) {
                setExchangeRate(v);
              }
            }}
            step={0.01}
            min={0.01}
            className="flex-1 h-7 px-2 text-center text-xs font-mono border border-slate-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
          />
          <span className="text-xs text-slate-500 shrink-0">CNY</span>
          <button
            type="button"
            onClick={() => setExchangeRate(EXCHANGE_RATES[displayCurrency])}
            className="text-[10px] text-primary-600 hover:text-primary-800 font-medium shrink-0"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Save / Load / Share */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Save &amp; Share
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              const state = usePlannerStore.getState();
              const params = {
                warehouse: state.warehouse,
                rackType: state.rackType,
                rack: state.rack,
                pallet: state.pallet,
                wireMeshDeck: state.wireMeshDeck,
                displayCurrency: state.displayCurrency,
              };
              const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.download = 'rackinghub-plan.json';
              a.href = URL.createObjectURL(blob);
              a.click();
            }}
            className="px-2 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-center"
          >
            <div>💾</div>
            <div className="mt-0.5">Export</div>
          </button>
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target?.result as string);
                    if (data.warehouse) setWarehouse(data.warehouse);
                    if (data.rackType) setRackType(data.rackType);
                    if (data.rack) setRack(data.rack);
                    if (data.pallet) setPallet(data.pallet);
                    if (data.wireMeshDeck !== undefined) setWireMeshDeck(data.wireMeshDeck);
                    if (data.displayCurrency) setDisplayCurrency(data.displayCurrency);
                  } catch { /* ignore */ }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            className="px-2 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-center"
          >
            <div>📂</div>
            <div className="mt-0.5">Import</div>
          </button>
          <button
            type="button"
            onClick={() => {
              const state = usePlannerStore.getState();
              const params = {
                warehouse: state.warehouse,
                rackType: state.rackType,
                rack: state.rack,
                pallet: state.pallet,
                wireMeshDeck: state.wireMeshDeck,
                displayCurrency: state.displayCurrency,
              };
              const { encodeParams: ep } = require('@/lib/planner-persistence');
              const qs = ep(params);
              const url = `${window.location.origin}/planner?${qs}`;
              navigator.clipboard.writeText(url).then(() => {
                // Could add a toast here
              });
            }}
            className="px-2 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-center"
          >
            <div>🔗</div>
            <div className="mt-0.5">Share</div>
          </button>
        </div>
      </div>
    </div>
  );
}
