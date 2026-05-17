'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [
    { label: 'Home', href: '/' },
    ...items,
  ];

  return (
    <nav className="flex items-center gap-1 text-xs text-slate-400 mb-4" aria-label="Breadcrumb">
      {allItems.map((item, i) => {
        const isLast = i === allItems.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            {i === 0 ? (
              <Link href={item.href ?? '/'} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                <Home className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            ) : isLast ? (
              <span className="text-slate-600 font-medium">{item.label}</span>
            ) : (
              <Link href={item.href ?? '#'} className="hover:text-slate-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
