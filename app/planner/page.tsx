import type { Metadata } from 'next';
import { PlannerShell } from '@/components/planner/PlannerShell';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Shield, Calculator, Users, Download, Clock, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Free Warehouse Racking Planner',
  description:
    'Design your selective pallet racking system in minutes. Get instant layout diagrams, cost estimates, and bill of materials. 100% free, no registration required.',
};

const featureHighlights = [
  { icon: Zap, label: 'Instant Results', desc: 'Real-time layout & cost as you configure' },
  { icon: Download, label: 'Export Layout', desc: 'Save diagram as PNG image' },
  { icon: Shield, label: '100% Private', desc: 'All data stays in your browser' },
  { icon: Clock, label: 'Fast Setup', desc: 'Configure in under 2 minutes' },
];

export default function PlannerPage() {
  return (
    <>
      {/* Trust Banner */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="container-main py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Used by <strong className="text-slate-700">2,300+</strong> warehouse planners
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-slate-400" />
            <span>Calculations based on <strong className="text-slate-700">FEM 10.2.02</strong> guidelines</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong className="text-slate-700">100% Free</strong> &mdash; No registration required
            </span>
          </div>
        </div>
      </div>

      {/* Planner Tool */}
      <div className="container-main section-padding">
        <Breadcrumbs items={[{ label: 'Planner' }]} />

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Warehouse Racking Planner
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Configure your warehouse dimensions, choose a racking type, and get instant
            layout diagrams, cost estimates, and a complete bill of materials. All
            calculations are performed in your browser.
          </p>
        </div>

        {/* Feature highlights strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {featureHighlights.map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                <feat.icon className="w-4 h-4 text-accent-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">{feat.label}</div>
                <div className="text-[11px] text-slate-400">{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <PlannerShell />
      </div>
    </>
  );
}
