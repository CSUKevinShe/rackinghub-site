"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { resources, categories, categoryMeta } from "./data";
import type { Metadata } from "next";

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchCat =
        activeCategory === "All" || r.category === activeCategory;
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const activeCount =
    activeCategory === "All"
      ? resources.length
      : resources.filter((r) => r.category === activeCategory).length;

  return (
    <div className="container-main section-padding">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center flex-wrap gap-1 text-xs text-slate-500">
            <li>
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-primary-950 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-house w-3 h-3"
                >
                  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                  <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <span>Home</span>
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-chevron-right w-3 h-3 text-slate-300"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span className="text-slate-800 font-medium">Resources</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Industry Resources
          </h1>
          <p className="mt-3 text-sm text-slate-500 max-w-2xl">
            A curated directory of {resources.length} standards bodies,
            manufacturers, and industry tools. Every resource is manually
            reviewed and verified.
          </p>
        </div>

        {/* Platform Intro Section */}
        <div className="mb-10 p-6 bg-gradient-to-r from-primary-50 to-slate-50 rounded-xl border border-primary-100">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <h2 className="text-base font-bold text-primary-950 mb-2">
                Navigating the Racking Supply Chain
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                The global racking market spans hundreds of manufacturers across
                Europe, Asia, and the Americas. Large, well-known brands offer
                extensive product catalogs and established global networks — but
                often operate with higher overhead, minimum order thresholds, and
                standardized pricing that may not fit every project.
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Smaller, specialized manufacturers — particularly in China's
                mature steel processing regions — can offer significant
                cost advantages and greater flexibility on custom specifications,
                batch sizes, and delivery timelines. The challenge is knowing
                which ones have genuine FEM/CE compliance, export-grade quality
                control, and reliable logistics.
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed font-medium">
                Not sure where to start? I can help you compare options, validate
                certifications, and connect you with the right supplier for your
                project — whether that's a global brand or a high-quality
                manufacturer you might not find on your own.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/contact/"
                className="inline-flex items-center gap-2 px-5 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg transition-colors text-sm shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-message-circle w-4 h-4"
                >
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
                Get Supplier Recommendations
              </Link>
              <p className="mt-2 text-[11px] text-slate-400 text-center">
                Free. No commitment required.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
                {cat !== "All" &&
                  ` (${categoryMeta[cat]?.count || 0})`}
              </button>
            ))}
          </div>

          {/* Category Description */}
          {activeCategory !== "All" && categoryMeta[activeCategory] && (
            <p className="text-xs text-slate-500">
              {categoryMeta[activeCategory].description}
            </p>
          )}

          {/* Search */}
          <div className="relative max-w-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder={`Search ${activeCount} resources...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-colors"
            />
          </div>
        </div>

        {/* Results Count */}
        <p className="text-xs text-slate-400 mb-6">
          {search
            ? `Showing ${filtered.length} of ${activeCount} resources matching "${search}"`
            : `Showing ${filtered.length} resource${filtered.length !== 1 ? "s" : ""}`}
        </p>

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filtered.map((resource, idx) => (
            <div
              key={`${resource.name}-${idx}`}
              className="group flex flex-col p-4 bg-white rounded-xl border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all"
            >
              {/* Category Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                  {resource.category}
                </span>
                <span className="text-[10px] text-slate-400">{resource.date}</span>
              </div>

              {/* Name */}
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary-950 transition-colors mb-1.5">
                {resource.name}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-3">
                {resource.description}
              </p>

              {/* Visit Link */}
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
              >
                Visit
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-external-link w-3 h-3"
                >
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </a>

              {/* Star indicator for featured items */}
              {["Boracs Logistics Equipment", "FEM - European Materials Handling Federation", "EN 15512", "Warehouse Science", "PalletIQ"].includes(resource.name) && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="none"
                      className="w-3 h-3"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Editor's Pick
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search-x w-10 h-10 text-slate-300 mx-auto mb-4"
            >
              <path d="m13.5 8.5-5 5" />
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-sm text-slate-500">
              No resources found. Try a different search term or category.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
              }}
              className="mt-3 text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <section className="p-8 bg-primary-950 rounded-2xl text-center mb-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-message-square w-8 h-8 text-accent-400 mx-auto mb-3"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2 className="text-lg font-bold text-white mb-2">
            Need Help Choosing a Supplier?
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
            Tell me about your project requirements. I'll provide a shortlist of
            suitable manufacturers with honest pros and cons for each option —
            free of charge.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Ask an Expert
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-arrow-right w-4 h-4"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <a
              href="https://wa.me/8615348317266"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              WhatsApp
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
