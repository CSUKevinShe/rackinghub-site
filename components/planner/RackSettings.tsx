'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS, EXCHANGE_RATES } from '@/lib/calculator/config';
import { RACK_TYPES, BUDGET_TIERS } from '@/lib/calculator/config';
import type { BudgetTier, CurrencyCode } from '@/lib/calculator/types';
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
  const { rackType, rack, setRack, budget, setBudget, displayCurrency, setDisplayCurrency } = usePlannerStore();
  const config = RACK_TYPES[rackType];
  const constraints = CONSTRAINTS.rack;

  return (
    <div className="space-y-4">
      <NumberInput
        label="First Beam Height"
        value={rack.firstBeamHeight}
        onChange={(v) => setRack({ firstBeamHeight: v })}
        min={constraints.firstBeamHeight.min}
        max={constraints.firstBeamHeight.max}
        step={100}
        unit="mm"
      />
      <NumberInput
        label="Number of Levels"
        value={rack.levels}
        onChange={(v) => setRack({ levels: v })}
        min={constraints.levels.min}
        max={constraints.levels.max}
        step={1}
        unit="levels"
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
      <NumberInput
        label="Aisle Width"
        value={rack.aisleWidth}
        onChange={(v) => setRack({ aisleWidth: v })}
        min={constraints.aisleWidth.min}
        max={constraints.aisleWidth.max}
        step={100}
      />

      {/* Budget Tier Selector */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Budget Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BUDGET_TIERS) as BudgetTier[]).map((tier) => {
            const tierConfig = BUDGET_TIERS[tier];
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setBudget(tier)}
                className={cn(
                  'px-3 py-2 rounded-lg text-center transition-all',
                  budget === tier
                    ? 'bg-primary-950 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <div className="text-xs font-semibold">{tierConfig.label}</div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {BUDGET_TIERS[budget].description}
        </p>
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
