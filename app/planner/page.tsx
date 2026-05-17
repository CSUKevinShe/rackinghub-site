import type { Metadata } from 'next';
import { PlannerShell } from '@/components/planner/PlannerShell';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Shield, Calculator, Users, Download, Clock, Zap, Truck, Award, FileText } from 'lucide-react';

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

const whyRackingHub = [
  { icon: Truck, label: 'Direct from Manufacturer', desc: '30-50% lower cost by cutting out middlemen' },
  { icon: Calculator, label: 'FEM 10.2.02 Compliant', desc: 'Engineering calculations meet EU standards' },
  { icon: Award, label: '10-Year Warranty', desc: 'Structural warranty on all rack components' },
  { icon: FileText, label: 'Free CAD Drawings', desc: 'Detailed CAD drawings included with every order' },
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

      {/* Why RackingHub Section */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="container-main section-padding">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Why RackingHub?
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
              From design to delivery — we handle the entire process so you get exactly what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {whyRackingHub.map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
                  <item.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">{item.label}</h3>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm"
            >
              Get Your Free Quote
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <p className="text-xs text-slate-400 mt-3">
              No obligation · Free engineering consultation · Response within 24 hours
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
