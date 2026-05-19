'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS } from '@/lib/calculator/config';
import { NumberInput } from './NumberInput';

export function PalletSettings() {
  const { pallet, setPallet } = usePlannerStore();
  const constraints = CONSTRAINTS.pallet;

  const palletPresets = [
    { label: 'EUR 1', w: 800, d: 1200, desc: 'European standard' },
    { label: 'EUR 2', w: 1200, d: 1000, desc: 'EUR alternate' },
    { label: 'US Standard', w: 1200, d: 1200, desc: '48"×40" (GMA)' },
    { label: 'UK Standard', w: 1000, d: 1200, desc: 'UK/EUR hybrid' },
  ];

  const isCustom = !palletPresets.some(p => pallet.width === p.w && pallet.depth === p.d);

  return (
    <div className="space-y-4">
      {/* Pallet Size Presets */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Pallet Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {palletPresets.map((preset) => {
            const isSelected = pallet.width === preset.w && pallet.depth === preset.d;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPallet({ width: preset.w, depth: preset.d })}
                className={`relative px-3 py-2.5 rounded-lg text-left transition-all border-2 ${
                  isSelected
                    ? 'bg-primary-50 border-primary-400 text-primary-700'
                    : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-semibold">{preset.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{preset.desc} — {preset.w}×{preset.d}mm</div>
                <div className="mt-1 flex gap-0.5">
                  <div className={`rounded-sm border ${isSelected ? 'border-primary-400 bg-primary-200' : 'border-slate-300 bg-slate-200'}`} style={{ width: Math.round(preset.w / 15), height: Math.round(preset.d / 15), minWidth: 12, minHeight: 8 }} />
                </div>
              </button>
            );
          })}
        </div>
        {isCustom && (
          <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
            Custom size — {pallet.width}×{pallet.depth}mm
          </div>
        )}
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
