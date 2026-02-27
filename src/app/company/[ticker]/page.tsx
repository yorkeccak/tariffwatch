"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, FileText, MessageSquare, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Zap, Sparkles,
  ShieldAlert, TrendingUp, Globe, ArrowUpRight, GitCompare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveCompany, type Company } from "@/lib/companies";
import { cn, highlightTariffTerms, truncate } from "@/lib/utils";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
  relevance_score?: number;
  publication_date?: string;
  description?: string;
  metadata?: {
    name?: string;
    ticker?: string;
    date?: string;
    form_type?: string;
    [key: string]: unknown;
  };
}

const EXPOSURE_CONFIG = {
  high: {
    gradient: "from-red-500/15 via-red-500/5 to-transparent",
    accent: "bg-red-500",
    border: "border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    icon: ShieldAlert,
    label: "High Exposure",
  },
  moderate: {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    accent: "bg-amber-500",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    icon: TrendingUp,
    label: "Moderate Exposure",
  },
  low: {
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    accent: "bg-emerald-500",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: Globe,
    label: "Low Exposure",
  },
} as const;

function getRelevanceBorderColor(score: number | undefined): string {
  if (!score) return "border-l-border/50";
  if (score >= 0.8) return "border-l-red-500/60";
  if (score >= 0.5) return "border-l-amber-500/60";
  return "border-l-emerald-500/60";
}

function FilingExcerpt({ result, index }: { result: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  const isLong = content.length > 500;
  const displayContent = expanded ? content : truncate(content, 800);
  const highlighted = highlightTariffTerms(displayContent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group relative rounded-xl border bg-card/40 hover:bg-card/70 transition-all duration-300 border-l-[3px] overflow-hidden",
        getRelevanceBorderColor(result.relevance_score)
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium leading-snug">{result.title}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">{result.source}</span>
              {result.publication_date && (
                <>
                  <span className="text-xs text-muted-foreground/30">&middot;</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.publication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
              {result.relevance_score && (
                <>
                  <span className="text-xs text-muted-foreground/30">&middot;</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {Math.round(result.relevance_score * 100)}% match
                  </span>
                </>
              )}
            </div>
          </div>
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 rounded-md hover:bg-accent/50 transition-colors opacity-0 group-hover:opacity-100">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </a>
          )}
        </div>
        <div className={cn(
          "text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none tariff-highlights",
          !expanded && isLong && "line-clamp-6"
        )}>
          <Streamdown mode="static">{highlighted}</Streamdown>
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline font-medium"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

const QUESTION_ICONS = [ShieldAlert, Globe, TrendingUp, Sparkles] as const;

function AnswerPanel({ ticker, companyName }: { ticker: string; companyName: string }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const defaultQuestions = [
    `What is ${companyName}'s biggest tariff risk?`,
    `How has ${companyName} discussed China tariffs in recent filings?`,
    `What supply chain mitigation strategies has ${companyName} disclosed?`,
    `How does ${companyName}'s tariff exposure compare to peers?`,
  ];

  const askQuestion = useCallback(async (q: string) => {
    setQuery(q);
    setAnswer("");
    setSources([]);
    setError("");
    setLoading(true);
    setStreaming(true);

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, ticker }),
      });

      if (!res.ok) throw new Error("Failed to get answer");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let sourcesSet = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.search_results && !sourcesSet) {
                setSources(parsed.search_results);
                sourcesSet = true;
              }
              if (parsed.choices?.[0]?.delta?.content) {
                setAnswer(prev => prev + parsed.choices[0].delta.content);
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [ticker]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder={`Ask about ${companyName}'s tariff exposure...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                askQuestion(query);
              }
            }}
            className="w-full bg-card/50 border border-border/50 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        <Button
          onClick={() => query.trim() && askQuestion(query)}
          disabled={loading || !query.trim()}
          className="px-5 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
        </Button>
      </div>

      {!answer && !loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {defaultQuestions.map((q, i) => {
            const Icon = QUESTION_ICONS[i];
            return (
              <button
                key={i}
                onClick={() => askQuestion(q)}
                className="group text-left p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/20 transition-all flex items-start gap-3"
              >
                <div className="shrink-0 p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                  {q}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {(answer || loading) && (
        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <div className="p-5">
            {loading && !answer && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Analyzing SEC filings...
              </div>
            )}
            {answer && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                <Streamdown isAnimating={streaming} mode={streaming ? undefined : "static"}>
                  {answer}
                </Streamdown>
              </div>
            )}
          </div>
          {sources.length > 0 && (
            <div className="px-5 pb-4 pt-3 border-t border-border/30 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
              <div className="space-y-1">
                {sources.slice(0, 5).map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const RESEARCH_STEPS = [
  { label: "Searching SEC filings", icon: FileText },
  { label: "Analyzing trade policy data", icon: Globe },
  { label: "Cross-referencing economic indicators", icon: TrendingUp },
  { label: "Synthesizing findings", icon: Sparkles },
  { label: "Generating report", icon: Zap },
];

function ResearchLoader({
  companyName,
  status,
  progress,
}: {
  companyName: string;
  status: string;
  progress: { current_step: number; total_steps: number } | null;
}) {
  const currentStep = progress ? Math.min(progress.current_step, RESEARCH_STEPS.length) : 0;
  const pct = progress
    ? Math.round((progress.current_step / progress.total_steps) * 100)
    : 0;

  return (
    <div className="py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/10 mb-5"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="h-6 w-6 text-primary" />
          </motion.div>
          <h3 className="font-serif text-xl mb-1">Researching {companyName}</h3>
          <p className="text-xs text-muted-foreground">
            {status === "running" && progress
              ? `${pct}% complete`
              : "Initializing deep research..."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted/40 mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: "2%" }}
            animate={{ width: progress ? `${pct}%` : "15%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {RESEARCH_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === currentStep;
            const isComplete = i < currentStep;
            const isPending = i > currentStep;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-300",
                  isActive && "bg-primary/5",
                )}
              >
                <div className={cn(
                  "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                  isComplete && "bg-primary/15 text-primary",
                  isActive && "bg-primary text-primary-foreground",
                  isPending && "bg-muted/30 text-muted-foreground/30",
                )}>
                  {isComplete ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <StepIcon className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  "text-sm transition-colors duration-300",
                  isComplete && "text-muted-foreground",
                  isActive && "text-foreground font-medium",
                  isPending && "text-muted-foreground/30",
                )}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeepResearchPanel({ ticker, companyName }: { ticker: string; companyName: string }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [progress, setProgress] = useState<{ current_step: number; total_steps: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startResearch = useCallback(async () => {
    setLoading(true);
    setError("");
    setOutput("");
    setStatus("");
    setProgress(null);

    try {
      const res = await fetch("/api/research/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, companyName }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTaskId(data.taskId);
      setStatus("running");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start research");
      setLoading(false);
    }
  }, [ticker, companyName]);

  useEffect(() => {
    if (!taskId || status === "completed" || status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/research/status?taskId=${taskId}`);
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (data.progress) setProgress(data.progress);
        if (data.status === "completed") {
          setOutput(data.output || "");
          setLoading(false);
        }
        if (data.status === "failed") {
          setError(data.error || "Research failed");
          setLoading(false);
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [taskId, status]);

  return (
    <div className="space-y-4">
      {!taskId && !loading && (
        <div className="text-center py-16">
          <div className="inline-flex p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-6">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-serif font-normal mb-2">Deep Tariff Research</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            Generate a comprehensive tariff exposure report for {companyName}. Powered by
            Valyu DeepResearch - pulling from SEC filings, trade policy news, and economic data.
          </p>
          <Button onClick={startResearch} size="lg" className="px-8 rounded-xl gap-2">
            <Zap className="h-4 w-4" />
            Generate Report
          </Button>
          <p className="text-xs text-muted-foreground/50 mt-3">
            Typically takes 30-60 seconds
          </p>
        </div>
      )}

      {loading && (
        <ResearchLoader companyName={companyName} status={status} progress={progress} />
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          {error}
          <Button variant="ghost" size="sm" onClick={startResearch}>
            Retry
          </Button>
        </div>
      )}

      {output && (
        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <div className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown mode="static">
                {output}
              </Streamdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const identifier = decodeURIComponent(ticker);
  const company = resolveCompany(identifier);
  const router = useRouter();

  const [resolvedName, setResolvedName] = useState(company?.name || identifier);
  const [resolvedTicker, setResolvedTicker] = useState(company?.ticker || identifier.toUpperCase());
  const [filings, setFilings] = useState<SearchResult[]>([]);
  const [loadingFilings, setLoadingFilings] = useState(true);

  const sector = company?.sector;
  const exposure = company?.exposure;

  useEffect(() => {
    async function fetchFilings() {
      try {
        const body = { ticker: company?.ticker || identifier, maxResults: 15 };

        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          setFilings(data.results);

          // Extract company name and ticker from SEC filing metadata
          if (!company && data.results.length > 0) {
            const meta = data.results[0].metadata;
            if (meta?.name && typeof meta.name === 'string') {
              let cleaned = meta.name
                .replace(/[,.]?\s*(&\s*)?\b(Inc|Corp|Ltd|LLC|Co|Company|Holdings|Group|plc|Automotive|Technologies|Platforms|Global|Athletica)\b\.?/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
              // Title-case if all-caps
              if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
                cleaned = cleaned.toLowerCase().replace(/\b\w/g, (ch: string) => ch.toUpperCase());
              }
              setResolvedName(cleaned);
            }
            if (meta?.ticker) setResolvedTicker(meta.ticker);
          }
        }
      } catch (err) {
        console.error("Failed to fetch filings:", err);
      } finally {
        setLoadingFilings(false);
      }
    }
    fetchFilings();
  }, [identifier, company]);

  const config = exposure ? EXPOSURE_CONFIG[exposure] : null;
  const ExposureIcon = config?.icon;
  const logoUrl = company?.domain
    ? `https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`
    : null;

  return (
    <div className="min-h-screen pt-14">
      {/* Subtle gradient accent */}
      {config && <div className={cn("absolute top-14 left-0 right-0 h-48 bg-gradient-to-b pointer-events-none opacity-60", config.gradient)} />}

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </button>

        {/* Company Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start gap-5">
            {/* Company Logo */}
            <div className={cn(
              "shrink-0 w-16 h-16 rounded-2xl border-2 flex items-center justify-center bg-card shadow-sm",
              config?.border || "border-border/40"
            )}>
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${resolvedName} logo`}
                  width={40}
                  height={40}
                  className="rounded-lg"
                  unoptimized
                />
              ) : (
                <span className="text-xl font-bold text-primary">
                  {resolvedTicker.slice(0, 2)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-serif">{resolvedName}</h1>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground font-medium">{resolvedTicker}</span>
                {sector && (
                  <>
                    <span className="text-muted-foreground/30">&middot;</span>
                    <span className="text-sm text-muted-foreground">{sector}</span>
                  </>
                )}
                {exposure && config && ExposureIcon && (
                  <Badge variant={exposure} className="text-xs gap-1">
                    <ExposureIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                )}
              </div>
            </div>

            <Link href={`/compare?a=${encodeURIComponent(resolvedTicker)}`} className="shrink-0">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-lg">
                <GitCompare className="h-3 w-3" />
                Compare
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Tabs defaultValue="filings" className="space-y-6">
            <TabsList className="bg-muted/30 border border-border/40 p-1 h-auto rounded-xl">
              <TabsTrigger value="filings" className="text-xs gap-1.5 py-2 px-5 rounded-lg data-[state=active]:shadow-sm">
                <FileText className="h-3.5 w-3.5" />
                SEC Filings
              </TabsTrigger>
              <TabsTrigger value="ask" className="text-xs gap-1.5 py-2 px-5 rounded-lg data-[state=active]:shadow-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Ask Questions
              </TabsTrigger>
              <TabsTrigger value="research" className="text-xs gap-1.5 py-2 px-5 rounded-lg data-[state=active]:shadow-sm">
                <Zap className="h-3.5 w-3.5" />
                Deep Research
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filings">
              {loadingFilings ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Searching SEC filings for tariff disclosures...</p>
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-border/30 bg-card/20 p-5 animate-pulse">
                      <div className="space-y-2 mb-4">
                        <div className="h-4 bg-muted/50 rounded-md w-3/4" />
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-muted/30 rounded w-20" />
                          <div className="h-3 bg-muted/30 rounded w-16" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted/20 rounded w-full" />
                        <div className="h-3 bg-muted/20 rounded w-full" />
                        <div className="h-3 bg-muted/20 rounded w-5/6" />
                        <div className="h-3 bg-muted/20 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filings.length === 0 ? (
                <div className="text-center py-20">
                  <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No tariff-related filings found for {resolvedName}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-4">
                    Found {filings.length} tariff-related excerpts from SEC filings
                  </p>
                  {filings.map((result, i) => (
                    <FilingExcerpt key={result.url || `${result.source}-${result.title}-${i}`} result={result} index={i} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ask">
              <AnswerPanel ticker={resolvedTicker} companyName={resolvedName} />
            </TabsContent>

            <TabsContent value="research">
              <DeepResearchPanel ticker={resolvedTicker} companyName={resolvedName} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
