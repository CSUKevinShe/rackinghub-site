'use client';

import { useState } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { WarehouseSettings } from './WarehouseSettings';
import { RackSettings } from './RackSettings';
import { PalletSettings } from './PalletSettings';
import { RACK_TYPES } from '@/lib/calculator/config';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export function ParamPanel() {
  const { rackType, reset } = usePlannerStore();
  const config = RACK_TYPES[rackType];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const panelContent = (
    <div className="space-y-3">
      {/* Rack Type Selector */}
      <div className="bg-primary-950 rounded-lg p-4 text-white">
        <p className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-3">
          Racking System
        </p>
        <RackTypeSelector />
      </div>

      {/* Collapsible Sections */}
      <Section title="Warehouse Dimensions">
        <WarehouseSettings />
      </Section>

      <Section title="Rack Configuration">
        <RackSettings />
      </Section>

      <Section title="Pallet Specifications">
        <PalletSettings />
      </Section>

      {/* Selection Results */}
      <SelectionResults />

      {/* Reset Button */}
      <button
        type="button"
        onClick={reset}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset to Defaults
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop: always-visible sidebar */}
      <div className="hidden lg:block w-full lg:w-[380px] shrink-0">
        {panelContent}
      </div>

      {/* Mobile: floating trigger button */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 bg-primary-950 text-white rounded-full shadow-xl shadow-primary-950/30 hover:bg-primary-900 transition-colors text-sm font-semibold"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Configure
      </button>

      {/* Mobile: slide-in drawer overlay */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative ml-auto w-[90vw] max-w-[400px] h-full bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
            {/* Drawer header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">Planner Settings</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer content */}
            <div className="p-4">
              {panelContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RackTypeSelector() {
  const { rackType, setRackType } = usePlannerStore();

  return (
    <div className="space-y-2">
      {Object.values(RACK_TYPES).filter(rt => rt.id === 'selective').map((rt) => (
        <button
          key={rt.id}
          type="button"
          onClick={() => setRackType(rt.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-all',
            rackType === rt.id
              ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/20'
              : 'bg-white/10 text-slate-300 hover:bg-white/15'
          )}
        >
          <div className="text-sm font-semibold">{rt.name}</div>
          <div
            className={cn(
              'text-xs mt-1',
              rackType === rt.id ? 'text-white/80' : 'text-slate-400'
            )}
          >
            {rt.bestFor}
          </div>
        </button>
      ))}
    </div>
  );
}

function SelectionResults() {
  const { beamSelection, uprightSelection, warnings, rack } = usePlannerStore();

  if (!beamSelection && !uprightSelection) {
    return null;
  }

  const hasError = warnings.some(w => w.severity === 'error');

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2',
      hasError ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
    )}>
      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
        Selection Results
      </div>

      {rack.hasGroundLevel && (
        <div className="text-xs text-slate-600">
          <span className="font-medium">Storage:</span>{' '}
          Ground level + {rack.beamLevels} beam levels ({rack.beamLevels + 1} total)
        </div>
      )}

      {beamSelection && (
        <div className="text-xs text-slate-600">
          <span className="font-medium">Beam:</span>{' '}
          {beamSelection.profileCode.replace(/_/g, ' ')}{' '}
          L={beamSelection.effectiveSpanMm}mm{' '}
          <span className={beamSelection.tableCapacityKg >= beamSelection.requiredCapacityKg ? 'text-green-600' : 'text-red-600'}>
            {Math.round(beamSelection.tableCapacityKg)}kg ≥ {Math.round(beamSelection.requiredCapacityKg)}kg
          </span>
        </div>
      )}

      {uprightSelection && (
        <>
          <div className="text-xs text-slate-600">
            <span className="font-medium">Upright:</span>{' '}
            {uprightSelection.profileCode} {uprightSelection.material}{' '}
            <span className={uprightSelection.tableCapacityKg >= uprightSelection.requiredCapacityKg ? 'text-green-600' : 'text-red-600'}>
              {uprightSelection.tableCapacityKg}kg ≥ {uprightSelection.requiredCapacityKg}kg
            </span>
          </div>
          <div className="text-xs text-slate-600">
            <span className="font-medium">Bracing:</span>{' '}
            {uprightSelection.bracingType}-type ({uprightSelection.bracingCount.diagonal} diagonal, {uprightSelection.bracingCount.horizontal} horizontal)
          </div>
          <div className="text-[11px] text-slate-500">
            → {uprightSelection.material} t{uprightSelection.thicknessMm}mm selected (cheapest adequate)
          </div>
        </>
      )}
    </div>
  );
}
