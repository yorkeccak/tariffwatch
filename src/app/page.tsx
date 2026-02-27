"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Search, Shield, AlertTriangle, ArrowRight, ChevronRight, Loader2, FileText, Zap, TrendingDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FEATURED_COMPANIES, SECTORS, searchCompanies, type Company } from "@/lib/companies";
import { cn } from "@/lib/utils";
import { FlipWords } from "@/components/ui/flip-words";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Spotlight } from "@/components/ui/spotlight";

/* ─── Data ────────────────────────────────────────────────────────── */

const sectorData = SECTORS.slice(0, 8).map(sector => {
  const companies = FEATURED_COMPANIES.filter(c => c.sector === sector);
  const highCount = companies.filter(c => c.exposure === 'high').length;
  const modCount = companies.filter(c => c.exposure === 'moderate').length;
  return {
    sector: sector.replace('Consumer ', 'Cons. ').replace('Communication Services', 'Comm. Svcs'),
    fullName: sector,
    high: highCount,
    moderate: modCount,
    total: companies.length,
  };
}).filter(s => s.total > 0).sort((a, b) => (b.high + b.moderate) - (a.high + a.moderate));

const flipWords = ["tariffs", "trade wars", "import duties", "supply chains", "Section 301"];

/* ─── Search ──────────────────────────────────────────────────────── */

function SearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (query.length > 0) {
      setResults(searchCompanies(query).slice(0, 5));
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !isFocused && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused]);

  const handleSelect = useCallback((ticker: string) => {
    setQuery("");
    setResults([]);
    router.push(`/company/${ticker}`);
  }, [router]);

  const handleFreeSearch = useCallback(() => {
    if (!query.trim()) return;
    setResults([]);
    const q = query.trim();
    setQuery("");
    router.push(`/company/${encodeURIComponent(q)}`);
  }, [query, router]);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className={cn(
        "relative flex items-center rounded-full border bg-background/80 backdrop-blur-md transition-all duration-300",
        isFocused ? "border-foreground/20 shadow-lg shadow-foreground/5 ring-1 ring-foreground/10" : "border-border/60 shadow-lg shadow-black/5"
      )}>
        <Search className="absolute left-5 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search any US public company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (results.length > 0) handleSelect(results[0].ticker);
              else handleFreeSearch();
            }
            if (e.key === 'Escape') inputRef.current?.blur();
          }}
          className="w-full bg-transparent pl-12 pr-16 py-3.5 text-sm outline-none placeholder:text-muted-foreground/50"
        />
        {!isFocused && !query && (
          <div className="absolute right-4 flex items-center gap-1 text-muted-foreground/30">
            <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/20 text-[10px] font-mono">/</kbd>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFocused && query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {results.map((company) => (
              <button
                key={company.ticker}
                onMouseDown={() => handleSelect(company.ticker)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {company.domain && (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=32`}
                      alt=""
                      className="h-5 w-5 rounded-sm"
                    />
                  )}
                  <span className="text-sm font-semibold">{company.ticker}</span>
                  <span className="text-sm text-muted-foreground">{company.name}</span>
                </div>
                {company.exposure && <Badge variant={company.exposure} className="text-[10px]">{company.exposure}</Badge>}
              </button>
            ))}
            {/* Free search option - always shown */}
            <button
              onMouseDown={handleFreeSearch}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors text-left border-t border-border/30"
            >
              <Search className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">
                Search SEC filings for <span className="font-semibold text-primary">&ldquo;{query}&rdquo;</span>
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/50 ml-auto" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── News ────────────────────────────────────────────────────────── */

function NewsSection() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "US tariff policy trade war import duties impact companies 2025 2026",
            maxResults: 6,
          }),
        });
        const data = await res.json();
        if (data.success) setNews(data.results.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  return (
    <div>
      <h3 className="font-serif text-xl mb-6">Latest News</h3>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : news.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No recent news</p>
      ) : (
        <div className="space-y-1">
          {news.map((item, i) => {
            let domain = '';
            try { domain = new URL(item.url).hostname.replace('www.', ''); } catch {}
            const displaySource = item.source && item.source !== 'web' ? item.source : domain;
            return (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 py-3 border-b border-border/20 last:border-0 hover:opacity-80 transition-opacity"
              >
                {domain && (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                    alt=""
                    className="h-4 w-4 rounded-sm shrink-0 mt-0.5 opacity-50"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {displaySource && <span className="text-[11px] text-muted-foreground/50">{displaySource}</span>}
                    {item.publication_date && (
                      <>
                        <span className="text-muted-foreground/20">&middot;</span>
                        <span className="text-[11px] text-muted-foreground/50">
                          {new Date(item.publication_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Sector Chart ────────────────────────────────────────────────── */

function SectorChart() {
  return (
    <div>
      <h3 className="font-serif text-xl mb-6">Sector Exposure</h3>
      <div className="space-y-3">
        {sectorData.map((sector) => {
          const max = Math.max(...sectorData.map(s => s.high + s.moderate));
          const total = sector.high + sector.moderate;
          const highPct = max > 0 ? (sector.high / max) * 100 : 0;
          const modPct = max > 0 ? (sector.moderate / max) * 100 : 0;
          return (
            <div key={sector.sector} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">{sector.fullName}</span>
                <span className="text-xs text-muted-foreground/50">{total}</span>
              </div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-muted/30">
                {sector.high > 0 && (
                  <div
                    className="bg-red-500/80 rounded-l-full transition-all duration-500"
                    style={{ width: `${highPct}%` }}
                  />
                )}
                {sector.moderate > 0 && (
                  <div
                    className={cn(
                      "bg-amber-500/70 transition-all duration-500",
                      sector.high === 0 && "rounded-l-full",
                      "rounded-r-full"
                    )}
                    style={{ width: `${modPct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500/80" />
            <span className="text-[11px] text-muted-foreground/50">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="text-[11px] text-muted-foreground/50">Moderate</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Parallax Divider ────────────────────────────────────────────── */

function ParallaxDivider({ src, text }: { src: string; text: string }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <section ref={ref} className="relative h-[40vh] md:h-[50vh] overflow-hidden flex items-center justify-center">
      <motion.div className="absolute inset-0" style={{ y }}>
        <img src={src} alt="" className="w-full h-[130%] object-cover" />
        <div className="absolute inset-0 bg-black/50" />
      </motion.div>
      <div className="relative z-10 text-center px-6">
        <p className="font-serif text-2xl sm:text-4xl md:text-5xl text-white/90 max-w-2xl mx-auto leading-tight tracking-tight">
          {text}
        </p>
      </div>
    </section>
  );
}

/* ─── Company Table Row ───────────────────────────────────────────── */

function CompanyRow({ company, index }: { company: Company; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.02, 0.5) }}
    >
      <Link href={`/company/${company.ticker}`}>
        <div className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-accent/40 transition-all cursor-pointer">
          {company.domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`}
              alt={company.name}
              className="h-8 w-8 rounded-lg shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-muted-foreground">{company.ticker.slice(0, 2)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <span className="text-sm font-semibold w-16 shrink-0">{company.ticker}</span>
            <span className="text-sm text-muted-foreground truncate">{company.name}</span>
          </div>
          {company.sector && <span className="text-xs text-muted-foreground/60 hidden md:block w-40 truncate">{company.sector}</span>}
          {company.exposure && <Badge variant={company.exposure} className="text-[10px] shrink-0">{company.exposure}</Badge>}
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 shrink-0 transition-all" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function Home() {
  const highExposure = FEATURED_COMPANIES.filter(c => c.exposure === 'high');
  const moderateExposure = FEATURED_COMPANIES.filter(c => c.exposure === 'moderate');
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const filteredCompanies = activeFilter === 'all'
    ? FEATURED_COMPANIES
    : FEATURED_COMPANIES.filter(c => c.exposure === activeFilter);

  const filters = [
    { key: 'all' as const, label: 'All', count: FEATURED_COMPANIES.length },
    { key: 'high' as const, label: 'High', count: highExposure.length, dot: 'bg-red-500' },
    { key: 'moderate' as const, label: 'Moderate', count: moderateExposure.length, dot: 'bg-amber-500' },
    { key: 'low' as const, label: 'Low', count: FEATURED_COMPANIES.filter(c => c.exposure === 'low').length, dot: 'bg-emerald-500' },
  ];

  return (
    <div className="min-h-screen">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden pt-16">
        <motion.div className="absolute inset-0" style={{ y: heroImageY }}>
          <img src="/sec-hero-bg.jpg" alt="" className="w-full h-[120%] object-cover" />
          <div className="absolute inset-0 bg-background/60 dark:bg-background/70" />
        </motion.div>
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="hsl(var(--primary) / 0.12)" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <motion.div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24" style={{ opacity: heroOpacity }}>
          {/* Pill */}
          <motion.div
            className="flex justify-center mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="group rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 hover:border-primary/30 transition-all">
              <AnimatedShinyText className="text-xs inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                SEC filing analysis powered by Valyu
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </AnimatedShinyText>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-7xl tracking-tight leading-[1.1]">
              <span className="font-serif text-foreground/40">Find </span>
              <FlipWords words={flipWords} className="font-serif text-amber-600 dark:text-amber-400" />
              <br />
              <span className="font-serif text-foreground/40">buried in SEC filings</span>
            </h1>
          </motion.div>

          <motion.p
            className="text-center text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Tariff risk disclosures are buried in 200-page SEC filings. Search any US public company and surface them in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <SearchBar />
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex items-center justify-center gap-12 mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div>
              <div className="text-3xl font-serif"><NumberTicker value={FEATURED_COMPANIES.length} /></div>
              <p className="text-xs text-muted-foreground mt-1">Companies</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div>
              <div className="text-3xl font-serif text-red-600 dark:text-red-400"><NumberTicker value={highExposure.length} /></div>
              <p className="text-xs text-muted-foreground mt-1">High Exposure</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div>
              <div className="text-3xl font-serif text-amber-600 dark:text-amber-400"><NumberTicker value={moderateExposure.length} /></div>
              <p className="text-xs text-muted-foreground mt-1">Moderate</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div>
              <div className="text-3xl font-serif"><NumberTicker value={11} /></div>
              <p className="text-xs text-muted-foreground mt-1">Sectors</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── High Exposure Strip ─────────────────────────────── */}
      <section className="py-8 border-y border-border/30 bg-red-500/[0.02]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-widest">High Exposure</span>
              <span className="text-xs text-muted-foreground/40">{highExposure.length} companies</span>
            </div>
            <Link href="/compare" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group">
              Compare <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {highExposure.map((company) => (
              <Link key={company.ticker} href={`/company/${company.ticker}`}>
                <div className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-red-500/15 bg-card/40 hover:bg-card/80 hover:border-red-500/30 transition-all whitespace-nowrap cursor-pointer">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=32`}
                    alt={company.name}
                    className="h-4 w-4 rounded-sm shrink-0"
                  />
                  <span className="text-xs font-medium">{company.ticker}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Parallax: Archive ─────────────────────────────────── */}
      <ParallaxDivider
        src="/parallax-archive.jpg"
        text="Tariff disclosures buried in 200-page filings. We read them so you don't have to."
      />

      {/* ─── Charts + News ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <SectorChart />
          <div className="lg:border-l lg:border-border/20 lg:pl-16">
            <NewsSection />
          </div>
        </div>
      </section>

      {/* ─── All Companies ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Featured Companies</h2>
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted/30 border border-border/40">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all",
                  activeFilter === f.key
                    ? "bg-background shadow-sm text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />}
                {f.label}
                <span className="text-muted-foreground/50">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/20 overflow-hidden divide-y divide-border/20">
          <AnimatePresence mode="popLayout">
            {filteredCompanies.map((company, i) => (
              <CompanyRow key={company.ticker} company={company} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Parallax: Wall Street ────────────────────────────── */}
      <ParallaxDivider
        src="/parallax-wallstreet.jpg"
        text="Real-time tariff intelligence for the companies that move markets."
      />

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <motion.div
          className="max-w-5xl mx-auto px-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">Valyu API</p>
          <h3 className="font-serif text-4xl md:text-5xl mb-4">Build your own</h3>
          <p className="text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto">
            TariffWatch is powered by the Valyu API. Access SEC filings, academic papers,
            financial data, and 50+ premium sources through a single endpoint.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://docs.valyu.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              API Docs <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://github.com/valyuAI/tariffwatch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 text-sm hover:bg-accent/40 transition-colors"
            >
              Source Code
            </a>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground/50">
            Powered by{" "}
            <a href="https://valyu.ai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              Valyu
            </a>
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
            <a href="https://docs.valyu.ai" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Docs</a>
            <a href="https://github.com/valyuAI/tariffwatch" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
