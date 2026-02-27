"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import {
  GitCompare, Search, Loader2, FileText, ExternalLink,
  ArrowLeft, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { searchCompanies, getCompanyByTicker, resolveCompany, type Company } from "@/lib/companies";
import { cn, highlightTariffTerms, truncate } from "@/lib/utils";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
  relevance_score?: number;
  publication_date?: string;
}

function companyLogoUrl(domain: string | undefined, size = 64): string {
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

const exposureStyles = {
  high: { border: "border-red-500/30", ring: "ring-red-500/10", text: "text-red-600 dark:text-red-400" },
  moderate: { border: "border-amber-500/30", ring: "ring-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  low: { border: "border-emerald-500/30", ring: "ring-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
};

function CompanySelector({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: Company | null;
  onSelect: (company: Company | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = query.length > 0 ? searchCompanies(query).slice(0, 6) : [];

  const handleFreeSelect = () => {
    if (!query.trim()) return;
    onSelect({ ticker: query.trim().toUpperCase(), name: query.trim() });
    setQuery("");
    setOpen(false);
  };

  const selectedBorder = selected?.exposure
    ? exposureStyles[selected.exposure].border
    : "border-border/50";

  return (
    <div className="relative flex-1">
      <label className="text-[10px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-widest">{label}</label>
      <div className="relative">
        {selected?.domain ? (
          <img
            src={companyLogoUrl(selected.domain, 32)}
            alt=""
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md"
          />
        ) : (
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        )}
        <input
          type="text"
          placeholder="Search any US public company..."
          value={selected ? `${selected.ticker} - ${selected.name}` : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected) onSelect(null);
          }}
          onFocus={() => {
            setOpen(true);
            if (selected) {
              setQuery("");
              onSelect(null);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !selected) {
              if (results.length > 0) {
                onSelect(results[0]);
                setQuery("");
                setOpen(false);
              } else {
                handleFreeSelect();
              }
            }
          }}
          className={cn(
            "w-full bg-card/50 border-2 rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all",
            selectedBorder
          )}
        />
      </div>
      {open && query.length > 0 && !selected && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50">
          {results.map((company) => (
            <button
              key={company.ticker}
              onMouseDown={() => {
                onSelect(company);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                {company.domain && (
                  <img
                    src={companyLogoUrl(company.domain, 32)}
                    alt=""
                    className="h-5 w-5 rounded-md"
                  />
                )}
                <span className="text-xs font-bold text-primary">{company.ticker}</span>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{company.name}</span>
              </div>
              {company.exposure && <Badge variant={company.exposure} className="text-[10px]">{company.exposure}</Badge>}
            </button>
          ))}
          {/* Free search option */}
          <button
            onMouseDown={handleFreeSelect}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left border-t border-border/30"
          >
            <Search className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">
              Search for <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function ComparisonColumn({
  company,
  results,
  loading,
}: {
  company: Company;
  results: SearchResult[];
  loading: boolean;
}) {
  const style = company.exposure ? exposureStyles[company.exposure] : null;

  return (
    <div className="flex-1 min-w-0">
      {/* Company header card */}
      <div className={cn(
        "flex items-center gap-4 mb-6 p-4 rounded-xl border bg-card/40",
        style?.border || "border-border/40"
      )}>
        {company.domain ? (
          <img
            src={companyLogoUrl(company.domain, 64)}
            alt={company.name}
            className="h-12 w-12 rounded-xl border border-border/50 shadow-sm"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-muted-foreground">{company.ticker.slice(0, 2)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-serif text-xl">{company.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground font-medium">{company.ticker}</span>
            {company.sector && (
              <>
                <span className="text-muted-foreground/30">&middot;</span>
                <span className="text-xs text-muted-foreground">{company.sector}</span>
              </>
            )}
            {company.exposure && <Badge variant={company.exposure} className="text-[10px] ml-1">{company.exposure}</Badge>}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-card/20 p-4 animate-pulse">
              <div className="h-4 bg-muted/40 rounded w-3/4 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-muted/20 rounded w-full" />
                <div className="h-3 bg-muted/20 rounded w-full" />
                <div className="h-3 bg-muted/20 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground text-center">
            No tariff-related filings found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {results.length} excerpt{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((result, i) => {
            const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group rounded-xl border border-border/30 bg-card/30 hover:bg-card/50 transition-all overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-xs font-medium line-clamp-1">{result.title}</h4>
                    {result.url && (
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] text-muted-foreground">{result.source}</span>
                    {result.relevance_score && (
                      <span className="text-[10px] text-primary font-medium">{Math.round(result.relevance_score * 100)}%</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed line-clamp-8 prose prose-xs dark:prose-invert max-w-none tariff-highlights">
                    <Streamdown mode="static">{highlightTariffTerms(truncate(content, 600))}</Streamdown>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const initialA = searchParams.get("a");

  const [companyA, setCompanyA] = useState<Company | null>(
    initialA ? resolveCompany(initialA) || { ticker: initialA.toUpperCase(), name: initialA } : null
  );
  const [companyB, setCompanyB] = useState<Company | null>(null);
  const [resultsA, setResultsA] = useState<SearchResult[]>([]);
  const [resultsB, setResultsB] = useState<SearchResult[]>([]);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const fetchResults = useCallback(async (
    company: Company,
    setResults: (r: SearchResult[]) => void,
    setLoading: (l: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const body = { ticker: company.ticker || company.name, maxResults: 10 };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) setResults(data.results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companyA) fetchResults(companyA, setResultsA, setLoadingA);
    else { setResultsA([]); }
  }, [companyA, fetchResults]);

  useEffect(() => {
    if (companyB) fetchResults(companyB, setResultsB, setLoadingB);
    else { setResultsB([]); }
  }, [companyB, fetchResults]);

  const popularComparisons = [
    { a: "AAPL", b: "MSFT", label: "Apple vs Microsoft" },
    { a: "NKE", b: "AAPL", label: "Nike vs Apple" },
    { a: "F", b: "GM", label: "Ford vs GM" },
    { a: "WMT", b: "AMZN", label: "Walmart vs Amazon" },
    { a: "CAT", b: "DE", label: "Caterpillar vs Deere" },
  ];

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-serif mb-2">Compare Companies</h1>
          <p className="text-sm text-muted-foreground">
            Side-by-side tariff exposure analysis from SEC filings
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-col sm:flex-row items-end gap-3 mb-10">
          <CompanySelector
            label="Company A"
            selected={companyA}
            onSelect={setCompanyA}
          />
          <div className="flex items-center justify-center h-12 w-12 shrink-0 rounded-full border border-border/40 bg-card/50 text-muted-foreground/40 self-end">
            <span className="text-xs font-bold">VS</span>
          </div>
          <CompanySelector
            label="Company B"
            selected={companyB}
            onSelect={setCompanyB}
          />
        </div>

        {/* Comparison */}
        {companyA && companyB ? (
          <motion.div
            className="flex flex-col md:flex-row gap-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ComparisonColumn company={companyA} results={resultsA} loading={loadingA} />
            <div className="hidden md:block w-px bg-border/30 shrink-0" />
            <div className="md:hidden h-px bg-border/30" />
            <ComparisonColumn company={companyB} results={resultsB} loading={loadingB} />
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-muted/50 border border-border/40 mb-5">
              <GitCompare className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <h2 className="text-base font-medium text-foreground/80 mb-1">
              Select two companies to compare
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-10">
              Use the search fields above or choose a popular comparison
            </p>

            {/* Popular comparisons */}
            <div className="max-w-md mx-auto">
              <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest font-medium">Popular</p>
              <div className="grid grid-cols-1 gap-2">
                {popularComparisons.map(({ a, b, label }) => {
                  const compA = getCompanyByTicker(a);
                  const compB = getCompanyByTicker(b);
                  return (
                    <button
                      key={`${a}-${b}`}
                      onClick={() => {
                        setCompanyA(compA || null);
                        setCompanyB(compB || null);
                      }}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/20 transition-all text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center -space-x-2">
                          {compA?.domain && (
                            <img
                              src={companyLogoUrl(compA.domain, 32)}
                              alt={compA.name}
                              className="h-7 w-7 rounded-lg border-2 border-card bg-card relative z-10"
                            />
                          )}
                          {compB?.domain && (
                            <img
                              src={companyLogoUrl(compB.domain, 32)}
                              alt={compB.name}
                              className="h-7 w-7 rounded-lg border-2 border-card bg-card relative z-0"
                            />
                          )}
                        </div>
                        <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
