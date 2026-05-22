'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS } from '@/lib/calculator/config';
import { NumberInput } from './NumberInput';

export function WarehouseSettings() {
  const { warehouse, setWarehouse } = usePlannerStore();
  const c = CONSTRAINTS.warehouse;

  return (
    <div className="space-y-4">
      {/* Column Grid */}
      <div className="border border-slate-200 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Column Grid</h5>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Columns X (bays)"
            value={warehouse.columnsX}
            onChange={(v) => setWarehouse({ columnsX: v })}
            min={1}
            max={c.columnsX?.max ?? 20}
            step={1}
          />
          <NumberInput
            label="Columns Y"
            value={warehouse.columnsY}
            onChange={(v) => setWarehouse({ columnsY: v })}
            min={1}
            max={c.columnsY?.max ?? 10}
            step={1}
          />
          <NumberInput
            label="Column Span X (mm)"
            value={warehouse.columnSpanX}
            onChange={(v) => setWarehouse({ columnSpanX: v })}
            min={c.columnSpanX?.min ?? 5000}
            max={c.columnSpanX?.max ?? 30000}
            step={500}
          />
          <NumberInput
            label="Column Span Y (mm)"
            value={warehouse.columnSpanY}
            onChange={(v) => setWarehouse({ columnSpanY: v })}
            min={c.columnSpanY?.min ?? 5000}
            max={c.columnSpanY?.max ?? 30000}
            step={500}
          />
        </div>
        <div className="text-xs text-slate-400 mt-2">
          Total: {warehouse.columnsX * warehouse.columnSpanX / 1000}m × {warehouse.columnsY * warehouse.columnSpanY / 1000}m
        </div>
      </div>

      {/* Building Dimensions */}
      <div className="border border-slate-200 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Building Structure</h5>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Column Width (mm)"
            value={warehouse.columnWidth}
            onChange={(v) => setWarehouse({ columnWidth: v })}
            min={c.columnWidth?.min ?? 100}
            max={c.columnWidth?.max ?? 1000}
            step={50}
          />
          <NumberInput
            label="Column Depth (mm)"
            value={warehouse.columnDepth}
            onChange={(v) => setWarehouse({ columnDepth: v })}
            min={c.columnDepth?.min ?? 100}
            max={c.columnDepth?.max ?? 1000}
            step={50}
          />
          <NumberInput
            label="Clear Height (mm)"
            value={warehouse.height}
            onChange={(v) => setWarehouse({ height: v })}
            min={c.height.min}
            max={c.height.max}
            step={100}
          />
          <NumberInput
            label="Wall Clearance (mm)"
            value={warehouse.wallClearance}
            onChange={(v) => setWarehouse({ wallClearance: v })}
            min={c.wallClearance.min}
            max={c.wallClearance.max}
            step={50}
          />
        </div>
      </div>

      {/* Transfer Aisles */}
      <div className="border border-slate-200 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Transfer Aisles</h5>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Transfer Aisle X (mm)"
            value={warehouse.transferAisleX}
            onChange={(v) => setWarehouse({ transferAisleX: v })}
            min={c.transferAisleX?.min ?? 1500}
            max={c.transferAisleX?.max ?? 8000}
            step={500}
          />
          <NumberInput
            label="Transfer Aisle Y (mm)"
            value={warehouse.transferAisleY}
            onChange={(v) => setWarehouse({ transferAisleY: v })}
            min={c.transferAisleY?.min ?? 1500}
            max={c.transferAisleY?.max ?? 8000}
            step={500}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">Cross aisles between rack blocks</p>
      </div>
    </div>
  );
}
