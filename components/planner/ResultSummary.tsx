'use client';

import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { formatNumber, formatCurrency, formatArea, formatWeight } from '@/lib/utils';
import { Package, DollarSign, LayoutGrid, TrendingUp, Layers, Percent, Container, Ship } from 'lucide-react';

export function ResultSummary() {
  const { summary, shipping, displayCurrency } = usePlannerStore();

  if (!summary) {
    return null;
  }

  const metrics = [
    {
      icon: Package,
      label: 'Pallet Positions',
      value: formatNumber(summary.totalPalletPositions),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: DollarSign,
      label: 'Est. Total Cost',
      value: formatCurrency(summary.estimatedTotalCost, displayCurrency),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: DollarSign,
      label: 'Cost per Position',
      value: formatCurrency(summary.costPerPalletPosition, displayCurrency),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      icon: LayoutGrid,
      label: 'Warehouse Area',
      value: formatArea(summary.warehouseArea),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Layers,
      label: 'Racking Area',
      value: formatArea(summary.rackingArea),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: TrendingUp,
      label: 'Space Utilization',
      value: `${summary.spaceUtilization}%`,
      color: summary.spaceUtilization > 50 ? 'text-green-600' : 'text-amber-600',
      bgColor: summary.spaceUtilization > 50 ? 'bg-green-50' : 'bg-amber-50',
    },
    {
      icon: Package,
      label: 'Total Capacity',
      value: formatWeight(summary.totalStorageCapacity),
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      icon: Percent,
      label: 'Rack System',
      value: summary.rackSystem.replace(/^(Heavy-Duty |Drive-In\/Drive-Through |Radio Shuttle )/, ''),
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">
            Plan Summary
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {summary.rackSystem} — Ex-factory prices ({displayCurrency})
          </p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/50"
            >
              <div className={`w-8 h-8 rounded-lg ${m.bgColor} flex items-center justify-center shrink-0`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium">{m.label}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Estimate Card */}
      {shipping && shipping.containerCount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Shipping Estimate
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/50">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                  <Container className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Total Weight</p>
                  <p className="text-sm font-bold text-slate-800">{formatWeight(shipping.totalWeightKg)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/50">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Container className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Containers</p>
                  <p className="text-sm font-bold text-slate-800">{shipping.containerCount} × 40ft</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/50">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Est. FOB Cost</p>
                  <p className="text-sm font-bold text-slate-800">${shipping.totalFOBUSD.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/50">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Ship className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Ocean Freight</p>
                  <p className="text-xs text-slate-500 mt-0.5">Contact us for CIF quote</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Based on 25,000 kg per 40ft container. Actual ocean freight varies by destination port and season.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
