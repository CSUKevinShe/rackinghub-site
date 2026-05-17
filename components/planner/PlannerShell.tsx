'use client';

import { useEffect } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { ParamPanel } from './ParamPanel';
import { LayoutCanvas } from './LayoutCanvas';
import { ResultSummary } from './ResultSummary';
import { BOMTable } from './BOMTable';
import { CTASection } from './CTASection';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { cn } from '@/lib/utils';

export function PlannerShell() {
  const calculate = usePlannerStore((s) => s.calculate);
  const warnings = usePlannerStore((s) => s.warnings);

  // Initial calculation on mount
  useEffect(() => {
    calculate();
  }, [calculate]);

  const hasErrors = warnings.some(w => w.severity === 'error');
  const hasWarnings = warnings.some(w => w.severity === 'warning');

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Panel: Parameters */}
      <ParamPanel />

      {/* Right Panel: Results */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Validation Warnings */}
        {(hasErrors || hasWarnings) && (
          <div className="space-y-2 animate-fade-in">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 rounded-lg text-sm',
                  w.severity === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                )}
              >
                {w.severity === 'error' ? (
                  <XCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                )}
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        <LayoutCanvas />
        <ResultSummary />
        <BOMTable />
        <CTASection />
      </div>
    </div>
  );
}
