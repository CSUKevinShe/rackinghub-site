import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
};

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatArea(value: number): string {
  return `${value.toLocaleString('en-US')} m²`;
}

export function formatWeight(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
}

/** Format millimeters to meters for display */
export function formatMm(mm: number): string {
  return `${(mm / 1000).toFixed(1)}m`;
}

/** Format currency amount — caller must pass the currency code */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
