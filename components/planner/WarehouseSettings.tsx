'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS } from '@/lib/calculator/config';
import { NumberInput } from './NumberInput';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const PRESET_CASES = [
  { label: 'Small Warehouse', length: 30000, width: 15000, height: 8000, colsX: 6000, colsY: 6000, wallT: 240, colSz: 300 },
  { label: 'Standard E-commerce', length: 50000, width: 25000, height: 10000, colsX: 8000, colsY: 12000, wallT: 300, colSz: 400 },
  { label: 'Large Distribution', length: 80000, width: 40000, height: 12000, colsX: 10000, colsY: 10000, wallT: 300, colSz: 500 },
  { label: 'Cold Storage', length: 40000, width: 20000, height: 12000, colsX: 8000, colsY: 8000, wallT: 400, colSz: 400 },
];

export function WarehouseSettings() {
  const { warehouse, setWarehouse } = usePlannerStore();
  const constraints = CONSTRAINTS.warehouse;
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="space-y-4">
      {/* Preset Case Library (F-11 placeholder) */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Building Presets
        </label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
            showPresets
              ? 'border-primary-950 bg-primary-50'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          )}
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Quick Select Building Template
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {PRESET_CASES.length} presets available — full library coming soon
            </div>
          </div>
          <div className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            showPresets ? 'bg-primary-950' : 'bg-slate-300'
          )}>
            <div className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              showPresets ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
        </button>
        {showPresets && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PRESET_CASES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setWarehouse({
                    length: preset.length,
                    width: preset.width,
                    height: preset.height,
                    columnSpacingX: preset.colsX,
                    columnSpacingY: preset.colsY,
                    wallThickness: preset.wallT,
                    columnSize: preset.colSz,
                  });
                }}
                className="flex flex-col items-start px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left"
              >
                <span className="text-xs font-semibold text-slate-700">{preset.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {preset.length / 1000}×{preset.width / 1000}m · H={preset.height / 1000}m
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Columns {preset.colsX / 1000}×{preset.colsY / 1000}m
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Building Length"
          value={warehouse.length}
          onChange={(v) => setWarehouse({ length: v })}
          min={constraints.length.min}
          max={constraints.length.max}
          step={500}
        />
        <NumberInput
          label="Building Width"
          value={warehouse.width}
          onChange={(v) => setWarehouse({ width: v })}
          min={constraints.width.min}
          max={constraints.width.max}
          step={500}
        />
        <NumberInput
          label="Clear Height"
          value={warehouse.height}
          onChange={(v) => setWarehouse({ height: v })}
          min={constraints.height.min}
          max={constraints.height.max}
          step={500}
        />
        <NumberInput
          label="Wall Clearance"
          value={warehouse.wallClearance}
          onChange={(v) => setWarehouse({ wallClearance: v })}
          min={constraints.wallClearance.min}
          max={constraints.wallClearance.max}
          step={50}
        />
      </div>

      {/* Building Structure */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Building Structure
        </label>
        <div className="space-y-3">
          <NumberInput
            label="Wall Thickness"
            value={warehouse.wallThickness}
            onChange={(v) => setWarehouse({ wallThickness: v })}
            min={constraints.wallThickness.min}
            max={constraints.wallThickness.max}
            step={10}
            unit="mm"
            hint="Visualization only — affects wall rendering in drawings"
          />
          <NumberInput
            label="Column Size (Square)"
            value={warehouse.columnSize}
            onChange={(v) => setWarehouse({ columnSize: v })}
            min={constraints.columnSize.min}
            max={constraints.columnSize.max}
            step={10}
            unit="mm"
            hint="Visualization only — column cross-section in all views"
          />
        </div>
      </div>

      {/* Column Grid */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Column Grid
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Spacing (Length)"
            value={warehouse.columnSpacingX}
            onChange={(v) => setWarehouse({ columnSpacingX: v })}
            min={constraints.columnSpacingX.min}
            max={constraints.columnSpacingX.max}
            step={500}
            unit="0 = no columns"
          />
          <NumberInput
            label="Spacing (Width)"
            value={warehouse.columnSpacingY}
            onChange={(v) => setWarehouse({ columnSpacingY: v })}
            min={constraints.columnSpacingY.min}
            max={constraints.columnSpacingY.max}
            step={500}
            unit="0 = no columns"
          />
        </div>
      </div>
    </div>
  );
}
