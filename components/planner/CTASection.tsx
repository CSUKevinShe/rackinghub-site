'use client';

import { useState } from 'react';
import { Mail, Save, MessageSquare, Send, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type CTAView = 'buttons' | 'email' | 'save' | 'quote';

export function CTASection() {
  const [activeCTA, setActiveCTA] = useState<CTAView>('buttons');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4">
        {activeCTA === 'buttons' && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveCTA('email')}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="text-xs font-semibold">Email Plan</span>
              <span className="text-[10px] text-blue-500">Free</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCTA('save')}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs font-semibold">Save Plan</span>
              <span className="text-[10px] text-green-500">Free</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCTA('quote')}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-accent-500 hover:bg-accent-600 text-white transition-colors shadow-sm"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold">Ask an Expert</span>
              <span className="text-[10px] opacity-75">Expert Review</span>
            </button>
          </div>
        )}

        {activeCTA === 'email' && (
          <EmailForm onBack={() => setActiveCTA('buttons')} />
        )}

        {activeCTA === 'save' && (
          <SaveForm onBack={() => setActiveCTA('buttons')} />
        )}

        {activeCTA === 'quote' && (
          <QuoteForm onBack={() => setActiveCTA('buttons')} />
        )}
      </div>
    </div>
  );
}

function EmailForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) return;
    // In production: Formspree
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onBack();
      setEmail('');
    }, 3000);
  };

  return (
    <div className="animate-fade-in">
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
        className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function SaveForm({ onBack }: { onBack: () => void }) {
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
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Save className="w-4 h-4 text-green-500" />
        <h4 className="text-sm font-semibold text-slate-700">Save Your Plan</h4>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Enter your email to save this plan. You can revisit and modify it later.
      </p>
      {submitted ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 font-medium">
            Plan saved! We sent a link to your email.
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-9 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="h-9 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      )}
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

function QuoteForm({ onBack }: { onBack: () => void }) {
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
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-accent-500" />
        <h4 className="text-sm font-semibold text-slate-700">Request a Detailed Quote</h4>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        An engineering team will review your specs and respond within 24 hours
        with CAD drawings, structural calculations, and a binding quotation.
      </p>
      {submitted ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 font-medium">
            Quote request submitted! We will contact you within 24 hours.
          </span>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-9 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="h-9 px-4 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            No obligation. Your contact info is kept confidential.
          </p>
        </>
      )}
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
