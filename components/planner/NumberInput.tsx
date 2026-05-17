'use client';

import { formatMm } from '@/lib/utils';

type NumberInputProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
};

/**
 * Reusable number stepper input used across WarehouseSettings, RackSettings, PalletSettings.
 * Supports optional `unit` suffix (e.g. "levels", "pallets", "kg").
 * When unit is omitted, `formatMm` is used to display the current value.
 */
export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 100,
  unit,
  hint,
}: NumberInputProps) {
  const displayValue = unit ? `${value} ${unit}` : formatMm(value);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-xs text-slate-400">{displayValue}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors text-lg font-medium"
          aria-label="Decrease"
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          min={min}
          max={max}
          className="flex-1 h-8 px-3 text-center text-sm font-mono font-medium border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors text-lg font-medium"
          aria-label="Increase"
        >
          +
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}
