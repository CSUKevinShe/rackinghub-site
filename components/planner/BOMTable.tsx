'use client';

import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { formatNumber, formatCurrency, formatWeight, cn } from '@/lib/utils';

export function BOMTable() {
  const [isOpen, setIsOpen] = useState(false);
  const { bom, displayCurrency } = usePlannerStore();

  if (bom.length === 0) return null;

  const totalWeight = bom.reduce((sum, item) => sum + item.totalWeight, 0);
  const totalCost = bom.reduce((sum, item) => sum + item.totalCost, 0);

  // Group by category
  const categories = [...new Set(bom.map((item) => item.category))];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">
            Bill of Materials (BOM)
          </h3>
          <span className="text-xs text-slate-400">
            {bom.length} items | {formatWeight(totalWeight)} | {formatCurrency(totalCost, displayCurrency)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Export CSV
                const csv = [
                  'Description,Unit,Qty,Unit Weight (kg),Total Weight (kg),Unit Cost,Total Cost,Category',
                  ...bom.map(
                    (item) =>
                      `"${item.description}",${item.unit},${item.quantity},${item.unitWeight},${item.totalWeight},${formatCurrency(item.unitCost, displayCurrency)},${formatCurrency(item.totalCost, displayCurrency)},${item.category}`
                  ),
                  `"TOTAL",,${bom.reduce((s, i) => s + i.quantity, 0)},,${totalWeight},,${formatCurrency(totalCost, displayCurrency)},`,
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'rackinghub-bom.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* BOM Table (collapsible) */}
      {isOpen && (
        <div className="border-t border-slate-100 overflow-x-auto animate-fade-in">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Qty
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Unit Wt.
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Total Wt.
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Unit Cost
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bom.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-700 text-xs">
                      {item.description}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {item.category}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                    {formatWeight(item.unitWeight)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-slate-700">
                    {formatWeight(item.totalWeight)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                    {formatCurrency(item.unitCost, displayCurrency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-slate-700">
                    {formatCurrency(item.totalCost, displayCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-4 py-2.5 font-bold text-xs text-slate-700">
                  TOTAL
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-slate-700">
                  {formatNumber(bom.reduce((s, i) => s + i.quantity, 0))}
                </td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-slate-700">
                  {formatWeight(totalWeight)}
                </td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-green-700">
                  {formatCurrency(totalCost, displayCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
