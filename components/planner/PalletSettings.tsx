'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS } from '@/lib/calculator/config';
import { NumberInput } from './NumberInput';

export function PalletSettings() {
  const { pallet, setPallet } = usePlannerStore();
  const constraints = CONSTRAINTS.pallet;

  return (
    <div className="space-y-4">
      {/* Pallet Size Presets */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Pallet Size Preset
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'EUR 1', w: 1000, d: 1200 },
            { label: 'EUR 2', w: 1200, d: 1000 },
            { label: 'US Standard', w: 1200, d: 1200 },
            { label: 'Custom', w: pallet.width, d: pallet.depth },
          ].map((preset) => {
            const isSelected =
              pallet.width === preset.w && pallet.depth === preset.d;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  if (preset.label !== 'Custom') {
                    setPallet({ width: preset.w, depth: preset.d });
                  }
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-primary-50 text-primary-700 border-2 border-primary-300'
                    : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                }`}
              >
                {preset.label}
                <br />
                <span className="text-[10px] opacity-70">
                  {preset.w}x{preset.d}mm
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <NumberInput
        label="Pallet Width (beam direction)"
        value={pallet.width}
        onChange={(v) => setPallet({ width: v })}
        min={constraints.width.min}
        max={constraints.width.max}
        step={50}
      />
      <NumberInput
        label="Pallet Depth (frame direction)"
        value={pallet.depth}
        onChange={(v) => setPallet({ depth: v })}
        min={constraints.depth.min}
        max={constraints.depth.max}
        step={50}
      />
      <NumberInput
        label="Load Height (pallet + goods)"
        value={pallet.height}
        onChange={(v) => setPallet({ height: v })}
        min={constraints.height.min}
        max={constraints.height.max}
        step={50}
      />
      <NumberInput
        label="Load per Pallet"
        value={pallet.loadPerPallet}
        onChange={(v) => setPallet({ loadPerPallet: v })}
        min={constraints.loadPerPallet.min}
        max={constraints.loadPerPallet.max}
        step={100}
        unit="kg"
      />
    </div>
  );
}
