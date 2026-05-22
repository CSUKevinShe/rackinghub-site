"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { resources, categories, categoryMeta } from "./data";

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchCat = activeCategory === "All" || r.category === activeCategory;
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
    <div className="min-h-screen flex flex-col">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-950 focus:text-white focus:text-sm focus:font-semibold focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Header / Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <nav className="container-main">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0"
            >
              <div className="w-8 h-8 bg-primary-950 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RH</span>
              </div>
              <span className="text-lg font-bold text-primary-950">
                Racking<span className="text-accent-500">Hub</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {[
                { href: "/", label: "Home" },
                { href: "/planner/", label: "Planner" },
                { href: "/resources/", label: "Resources", active: true },
                { href: "/learn/", label: "Learn" },
                { href: "/faq/", label: "FAQ" },
                { href: "/about/", label: "About" },
                { href: "/contact/", label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    link.active
                      ? "text-primary-950 bg-primary-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <a
                href="mailto:info@rackinghub.com"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
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
                  className="w-3.5 h-3.5"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span className="text-xs">info@rackinghub.com</span>
              </a>
              <Link
                href="/contact/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
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
                  className="w-4 h-4"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
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
                  className="w-5 h-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
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
                  className="w-5 h-5"
                >
                  <line x1="3" x2="21" y1="6" y2="6" />
                  <line x1="3" x2="21" y1="12" y2="12" />
                  <line x1="3" x2="21" y1="18" y2="18" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 py-3 space-y-1">
              {[
                { href: "/", label: "Home" },
                { href: "/planner/", label: "Planner" },
                { href: "/resources/", label: "Resources", active: true },
                { href: "/learn/", label: "Learn" },
                { href: "/faq/", label: "FAQ" },
                { href: "/about/", label: "About" },
                { href: "/contact/", label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    link.active
                      ? "text-primary-950 bg-primary-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-slate-100">
                <a
                  href="mailto:info@rackinghub.com"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500"
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
                    className="w-4 h-4"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  info@rackinghub.com
                </a>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1">
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
                      className="w-3 h-3"
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
                    className="w-3 h-3 text-slate-300"
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
                      className="w-4 h-4"
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
                    {cat !== "All" && ` (${categoryMeta[cat]?.count || 0})`}
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
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                      {resource.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {resource.date}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary-950 transition-colors mb-1.5">
                    {resource.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-3">
                    {resource.description}
                  </p>
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
                      className="w-3 h-3"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                  {[
                    "Boracs Logistics Equipment",
                    "FEM - European Materials Handling Federation",
                    "EN 15512 - Steel Static Storage Systems",
                    "Warehouse Science",
                    "PalletIQ - Pallet Loading Calculator",
                  ].includes(resource.name) && (
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
                        Editor&apos;s Pick
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
                  className="w-10 h-10 text-slate-300 mx-auto mb-4"
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
                className="w-8 h-8 text-accent-400 mx-auto mb-3"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h2 className="text-lg font-bold text-white mb-2">
                Need Help Choosing a Supplier?
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
                Tell me about your project requirements. I&apos;ll provide a
                shortlist of suitable manufacturers with honest pros and cons for
                each option — free of charge.
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
                    className="w-4 h-4"
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
      </main>

      {/* Footer */}
      <footer className="bg-primary-950 text-slate-300">
        <div className="container-main section-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RH</span>
                </div>
                <span className="text-lg font-bold text-white">
                  Racking<span className="text-accent-400">Hub</span>
                </span>
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed">
                A professional resource platform for warehouse racking
                professionals. Free tools, industry resources, and expert
                knowledge.
              </p>
              <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
                <a
                  href="mailto:info@rackinghub.com"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
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
                    className="w-4 h-4"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  info@rackinghub.com
                </a>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <a
                  href="https://wa.me/8615348317266"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Contact on WhatsApp"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Tools */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">
                Free Tools
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/planner/"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Warehouse Racking Planner
                  </Link>
                </li>
                <li>
                  <Link
                    href="/resources/"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Resources Directory
                  </Link>
                </li>
                <li>
                  <Link
                    href="/learn/"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Knowledge Base
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/faq/"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact/"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about/"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Disclaimer */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">
                Disclaimer
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                RackingHub is an independent professional resource. We do not
                manufacture or sell racking products directly. Use our tools
                and resources at your own discretion.
              </p>
              <p className="text-xs text-slate-600 mt-3">
                &copy; {new Date().getFullYear()} RackingHub
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
