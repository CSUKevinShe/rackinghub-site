'use client';

import { useState } from 'react';
import { Mail, Save, MessageSquare, Send, Check, FileText, ArrowRight } from 'lucide-react';
import { usePlannerStore } from '@/lib/store/usePlannerStore';
import { formatNumber, formatCurrency, formatWeight } from '@/lib/utils';
import { cn } from '@/lib/utils';

type CTAView = 'default' | 'email' | 'quote';

export function CTASection() {
  const [activeView, setActiveView] = useState<CTAView>('default');

  return (
    <div data-cta className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {activeView === 'default' && <DefaultView onSelect={setActiveView} />}
      {activeView === 'email' && <EmailForm onBack={() => setActiveView('default')} />}
      {activeView === 'quote' && <QuoteForm onBack={() => setActiveView('default')} />}
    </div>
  );
}

function DefaultView({ onSelect }: { onSelect: (v: CTAView) => void }) {
  const { summary, displayCurrency } = usePlannerStore();

  return (
    <div className="p-5">
      {/* Main CTA */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          Ready to move forward?
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          {summary && (
            <span>
              {formatNumber(summary.totalPalletPositions)} pallet positions · {formatCurrency(summary.estimatedTotalCost, displayCurrency)} estimated
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => onSelect('quote')}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm"
        >
          <FileText className="w-4 h-4" />
          Request Detailed Quote
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          Free engineering review · Response within 24 hours
        </p>
      </div>

      {/* Secondary actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            // Trigger export from the layout canvas
            const btn = document.querySelector('[data-view]');
            if (btn) {
              // The export is handled in LayoutCanvas, this just scrolls up
              document.querySelector('[data-view]')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Export Layout
        </button>
        <button
          type="button"
          onClick={() => onSelect('email')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Email me this plan
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function EmailForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onBack();
      setEmail('');
    }, 3000);
  };

  return (
    <div className="animate-fade-in p-5">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-blue-500" />
        <h4 className="text-sm font-semibold text-slate-700">Email This Plan</h4>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Enter your email to receive the plan summary, layout diagram, and BOM.
      </p>
      {submitted ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 font-medium">Plan sent! Check your inbox.</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-9 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function QuoteForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [refId] = useState(() => `RH-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

  const { summary, rackType, rack, pallet, warehouse, displayCurrency, beamSelection, uprightSelection } = usePlannerStore();

  const handleSubmit = () => {
    if (!email.trim() || !name.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onBack();
      setEmail('');
      setName('');
      setCompany('');
      setMessage('');
    }, 5000);
  };

  if (submitted) {
    return (
      <div className="animate-fade-in p-5 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-500" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 mb-1">Quote Request Submitted!</h4>
        <p className="text-xs text-slate-500 mb-3">
          Our engineering team will contact you within 24 hours.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-mono text-slate-600">
          Reference: <strong>{refId}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-accent-500" />
        <h4 className="text-sm font-semibold text-slate-700">Request a Detailed Quote</h4>
      </div>

      {/* Pre-filled plan summary */}
      {summary && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Rack System</span>
            <span className="font-medium text-slate-700">{summary.rackSystem}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Pallet Positions</span>
            <span className="font-medium text-slate-700">{formatNumber(summary.totalPalletPositions)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Est. Total Cost</span>
            <span className="font-medium text-slate-700">{formatCurrency(summary.estimatedTotalCost, displayCurrency)}</span>
          </div>
          {beamSelection && (
            <div className="flex justify-between text-slate-500">
              <span>Beam</span>
              <span className="font-mono text-slate-700">{beamSelection.profileCode}</span>
            </div>
          )}
          {uprightSelection && (
            <div className="flex justify-between text-slate-500">
              <span>Upright</span>
              <span className="font-mono text-slate-700">{uprightSelection.profileCode} {uprightSelection.material}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 h-9 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-9 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="Company (optional)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        />
        <textarea
          placeholder="Additional requirements (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full h-10 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Send className="w-3.5 h-3.5" />
        Submit Quote Request
      </button>
      <p className="text-[10px] text-slate-400 mt-2 text-center">
        No obligation. Your contact info is kept confidential.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
