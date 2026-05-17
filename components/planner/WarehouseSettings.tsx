'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { CONSTRAINTS } from '@/lib/calculator/config';
import { NumberInput } from './NumberInput';

export function WarehouseSettings() {
  const { warehouse, setWarehouse } = usePlannerStore();
  const constraints = CONSTRAINTS.warehouse;

  return (
    <div className="space-y-4">
      <NumberInput
        label="Building Length"
        value={warehouse.length}
        onChange={(v) => setWarehouse({ length: v })}
        min={constraints.length.min}
        max={constraints.length.max}
        step={100}
      />
      <NumberInput
        label="Building Width"
        value={warehouse.width}
        onChange={(v) => setWarehouse({ width: v })}
        min={constraints.width.min}
        max={constraints.width.max}
        step={100}
      />
      <NumberInput
        label="Clear Height"
        value={warehouse.height}
        onChange={(v) => setWarehouse({ height: v })}
        min={constraints.height.min}
        max={constraints.height.max}
        step={100}
      />
      <NumberInput
        label="Wall Clearance"
        value={warehouse.wallClearance}
        onChange={(v) => setWarehouse({ wallClearance: v })}
        min={constraints.wallClearance.min}
        max={constraints.wallClearance.max}
        step={50}
      />
      <NumberInput
        label="Column Spacing"
        value={warehouse.columnSpacing}
        onChange={(v) => setWarehouse({ columnSpacing: v })}
        min={constraints.columnSpacing.min}
        max={constraints.columnSpacing.max}
        step={100}
        unit="0 = ignore"
      />
    </div>
  );
}
