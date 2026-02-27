"use client";

import { useState, useEffect, useCallback, use, useRef, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileText, Loader2, ChevronUp,
  ExternalLink, Zap, ShieldAlert, TrendingUp,
  Globe, GitCompare, Mail, Clock, Check, BookOpen,
  PanelRightClose, PanelRightOpen, Code,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Streamdown } from "streamdown";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { resolveCompany } from "@/lib/companies";
import { cn, highlightTariffTerms, truncate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SourceMeta {
  index: number;
  title: string;
  url: string;
  form_type: string;
  date: string | null;
  relevance_score?: number;
}

interface ResearchHistoryItem {
  id: string;
  title: string;
  ticker: string;
  createdAt: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFilingMeta(result: SearchResult) {
  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const date = result.publication_date || result.metadata?.date;
  const formType = result.metadata?.form_type || "SEC Filing";
  return { content, date, formType };
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500",
  failed: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
};

function stripCitations(text: string): string {
  return text.replace(/\{\{cite:\d+\}\}|\{\{\/cite\}\}/g, "");
}

function renderBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <span key={key++} data-streamdown="strong">
        {match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  if (parts.length === 0) {
    parts.push(text);
  }

  return parts;
}

function renderInline(
  text: string,
  filings: SearchResult[],
  onClickSource: (i: number) => void
): ReactNode[] {
  const elements: ReactNode[] = [];
  const citationRegex = /\{\{cite:(\d+)\}\}([\s\S]*?)\{\{\/cite\}\}/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`t-${key++}`}>
          {renderBold(text.substring(lastIndex, match.index))}
        </span>
      );
    }

    const srcIdx = parseInt(match[1], 10);
    elements.push(
      <CitedSpan
        key={`c-${key++}`}
        sourceIndex={srcIdx}
        filing={filings[srcIdx - 1]}
        onClickSource={onClickSource}
      >
        {renderBold(match[2])}
      </CitedSpan>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(
      <span key={`t-${key++}`}>
        {renderBold(text.substring(lastIndex))}
      </span>
    );
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPOSURE_CONFIG = {
  high: {
    gradient: "from-red-500/15 via-red-500/5 to-transparent",
    border: "border-red-500/20",
    icon: ShieldAlert,
    label: "High Exposure",
  },
  moderate: {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    border: "border-amber-500/20",
    icon: TrendingUp,
    label: "Moderate Exposure",
  },
  low: {
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/20",
    icon: Globe,
    label: "Low Exposure",
  },
} as const;

const RESEARCH_STEPS = [
  { label: "Searching SEC filings", icon: FileText },
  { label: "Analyzing trade policy data", icon: Globe },
  { label: "Cross-referencing economic indicators", icon: TrendingUp },
  { label: "Synthesizing findings", icon: Zap },
  { label: "Generating report", icon: Zap },
];

// ---------------------------------------------------------------------------
// Research history (localStorage)
// ---------------------------------------------------------------------------

const HISTORY_KEY = "tariffwatch_research_history";
const MAX_HISTORY = 20;

function getResearchHistory(): ResearchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(item: ResearchHistoryItem) {
  const history = getResearchHistory().filter(h => h.id !== item.id);
  history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function updateHistoryStatus(id: string, status: string) {
  const history = getResearchHistory();
  const idx = history.findIndex(h => h.id === id);
  if (idx >= 0) {
    history[idx].status = status;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

// ---------------------------------------------------------------------------
// Cited Text Span with HoverCard
// ---------------------------------------------------------------------------

function CitedSpan({
  children,
  sourceIndex,
  filing,
  onClickSource,
}: {
  children: ReactNode;
  sourceIndex: number;
  filing: SearchResult | undefined;
  onClickSource: (i: number) => void;
}) {
  if (!filing) {
    return (
      <span className="cited-text">
        {children}
        <sup className="cited-number">{sourceIndex}</sup>
      </span>
    );
  }

  const { content, date, formType } = getFilingMeta(filing);
  const preview = truncate(content, 300);
  const highlighted = highlightTariffTerms(preview);

  return (
    <HoverCardPrimitive.Root openDelay={100} closeDelay={200}>
      <HoverCardPrimitive.Trigger asChild>
        <span
          className="cited-text cursor-pointer"
          onClick={() => onClickSource(sourceIndex - 1)}
        >
          {children}
          <sup className="cited-number">{sourceIndex}</sup>
        </span>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          className="z-[99999] w-[400px] rounded-lg border border-border/60 bg-popover text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          side="top"
          sideOffset={8}
          align="center"
          collisionPadding={12}
          avoidCollisions
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/20 rounded-t-lg">
            <img src="https://www.google.com/s2/favicons?domain=sec.gov&sz=32" alt="" className="w-4 h-4 rounded-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate">{filing.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-medium px-1 py-0.5 rounded bg-muted/50">{formType}</span>
                {date && <span className="text-[10px] text-muted-foreground">{formatShortDate(date)}</span>}
                {filing.relevance_score && (
                  <span className="text-[10px] text-primary font-medium">{Math.round(filing.relevance_score * 100)}% match</span>
                )}
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5 max-h-[200px] overflow-y-auto">
            <div className="text-[11px] text-muted-foreground leading-relaxed tariff-highlights">
              <Streamdown mode="static">{highlighted}</Streamdown>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/20 bg-muted/10 rounded-b-lg">
            <span className="text-[9px] text-muted-foreground/50 italic">SEC Filing Preview</span>
            {filing.url && (
              <a
                href={filing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                View on EDGAR
              </a>
            )}
          </div>
          <HoverCardPrimitive.Arrow className="fill-popover" />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Citation-aware renderer: parses {{cite:N}}...{{/cite}} into hoverable spans
// ---------------------------------------------------------------------------

function CitationRenderer({
  text,
  filings,
  onClickSource,
}: {
  text: string;
  filings: SearchResult[];
  onClickSource: (i: number) => void;
}) {
  const blocks = useMemo(() => text.split(/\n\n+/).filter(b => b.trim()), [text]);

  return (
    <div className="space-y-4 text-sm leading-relaxed tariff-highlights">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={bi} className="text-lg font-semibold text-foreground mt-6 mb-2 first:mt-0">
              {renderInline(trimmed.slice(3), filings, onClickSource)}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={bi} className="text-base font-medium text-foreground mt-4 mb-1">
              {renderInline(trimmed.slice(4), filings, onClickSource)}
            </h3>
          );
        }

        const lines = trimmed.split("\n");
        if (lines[0].match(/^[-*]\s/)) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1.5 text-muted-foreground/90">
              {lines.filter(l => l.trim()).map((line, li) => (
                <li key={li}>
                  {renderInline(line.replace(/^[-*]\s*/, ""), filings, onClickSource)}
                </li>
              ))}
            </ul>
          );
        }
        if (lines[0].match(/^\d+\.\s/)) {
          return (
            <ol key={bi} className="list-decimal pl-5 space-y-1.5 text-muted-foreground/90">
              {lines.filter(l => l.trim()).map((line, li) => (
                <li key={li}>
                  {renderInline(line.replace(/^\d+\.\s*/, ""), filings, onClickSource)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={bi} className="text-muted-foreground/90">
            {renderInline(trimmed, filings, onClickSource)}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filing Source Card (side panel)
// ---------------------------------------------------------------------------

function FilingSourceCard({
  result,
  index,
  isActive,
  onClick,
}: {
  result: SearchResult;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const { content, date, formType } = getFilingMeta(result);

  return (
    <button
      onClick={onClick}
      className={cn(
        "filing-source-card w-full text-left p-3 rounded-lg border border-border/40 bg-card/30 transition-all",
        isActive && "active"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug line-clamp-2">{result.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/50">
              {formType}
            </span>
            {date && (
              <span className="text-[10px] text-muted-foreground">{formatShortDate(date)}</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
            {truncate(content, 120)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Expanded Filing View
// ---------------------------------------------------------------------------

function ExpandedFiling({
  result,
  index,
  onClose,
}: {
  result: SearchResult;
  index: number;
  onClose: () => void;
}) {
  const { content, date, formType } = getFilingMeta(result);
  const highlighted = highlightTariffTerms(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
            {index}
          </span>
          <span className="text-xs font-medium truncate max-w-[200px]">{result.title}</span>
          <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/50">
            {formType}
          </span>
          {date && <span className="text-[10px] text-muted-foreground">{formatShortDate(date)}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="xml-badge">
              <Code className="h-3 w-3" />
              View XML Filing
            </a>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="px-3 py-2 border-b border-border/20 bg-muted/10">
        <p className="text-[10px] text-muted-foreground/60 italic">
          We convert the raw XML filing into readable markdown so you don't have to parse the mess - and neither does your AI agent.
        </p>
      </div>
      <div className="p-4 max-h-[400px] overflow-y-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed tariff-highlights">
          <Streamdown mode="static">{highlighted}</Streamdown>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Search Loading State (Aceternity)
// ---------------------------------------------------------------------------

function SearchLoadingState({ phase }: { phase: "search" | "analyze" }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-8">
      <div className="max-w-lg mx-auto text-center">
        {/* Animated ring */}
        <div className="relative w-12 h-12 mx-auto mb-6">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-1 rounded-full border-2 border-primary/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </div>

        <AnimatedShinyText className="text-sm font-medium mb-1" shimmerWidth={200}>
          {phase === "search"
            ? "Searching SEC filings..."
            : "Synthesizing tariff exposure analysis..."}
        </AnimatedShinyText>
        <p className="text-xs text-muted-foreground/60">
          {phase === "search"
            ? "Finding tariff-related disclosures in 10-K and 10-Q filings"
            : "AI is reading through the filings and extracting key insights"}
        </p>
      </div>

      {/* Shimmer skeleton */}
      <div className="mt-8 space-y-3 max-w-2xl mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative overflow-hidden rounded-lg">
            <div className="h-3 bg-muted/20 rounded w-full mb-2" />
            <div className="h-3 bg-muted/15 rounded w-5/6" />
            {i % 2 === 0 && <div className="h-3 bg-muted/10 rounded w-3/4 mt-2" />}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Research Loader
// ---------------------------------------------------------------------------

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
  const pct = progress ? Math.round((progress.current_step / progress.total_steps) * 100) : 0;

  return (
    <div className="py-8">
      <div className="max-w-md mx-auto">
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
            {status === "running" && progress ? `${pct}% complete` : "Initializing deep research..."}
          </p>
        </div>

        <div className="h-1 rounded-full bg-muted/40 mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: "2%" }}
            animate={{ width: progress ? `${pct}%` : "15%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="space-y-1">
          {RESEARCH_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === currentStep;
            const isComplete = i < currentStep;
            const isPending = i > currentStep;

            let icon;
            if (isComplete) {
              icon = (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              );
            } else if (isActive) {
              icon = <Loader2 className="h-3 w-3 animate-spin" />;
            } else {
              icon = <StepIcon className="h-3 w-3" />;
            }

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-300", isActive && "bg-primary/5")}
              >
                <div className={cn(
                  "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                  isComplete && "bg-primary/15 text-primary",
                  isActive && "bg-primary text-primary-foreground",
                  isPending && "bg-muted/30 text-muted-foreground/30"
                )}>
                  {icon}
                </div>
                <span className={cn(
                  "text-sm transition-colors duration-300",
                  isComplete && "text-muted-foreground",
                  isActive && "text-foreground font-medium",
                  isPending && "text-muted-foreground/30"
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

// ---------------------------------------------------------------------------
// Deep Research Panel
// ---------------------------------------------------------------------------

function DeepResearchPanel({ ticker, companyName }: { ticker: string; companyName: string }) {
  const searchParams = useSearchParams();
  const [taskId, setTaskId] = useState<string | null>(searchParams.get("research"));
  const [status, setStatus] = useState<string>(taskId ? "running" : "");
  const [output, setOutput] = useState<string>("");
  const [progress, setProgress] = useState<{ current_step: number; total_steps: number } | null>(null);
  const [loading, setLoading] = useState(!!taskId);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);

  const refreshHistory = useCallback(() => {
    setHistory(getResearchHistory().filter(h => h.ticker === ticker));
  }, [ticker]);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

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
        body: JSON.stringify({ ticker, companyName, alertEmail: email || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.taskId) {
        setTaskId(data.taskId);
        setStatus("running");
        saveToHistory({ id: data.taskId, title: `${companyName} Tariff Analysis`, ticker, createdAt: Date.now(), status: "running" });
        refreshHistory();
      } else if (data.emailSent) {
        setLoading(false);
        setStatus("email_sent");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start research");
      setLoading(false);
    }
  }, [ticker, companyName, email, refreshHistory]);

  useEffect(() => {
    if (!taskId || status === "completed" || status === "failed") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/research/status?taskId=${taskId}`);
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (data.progress) setProgress(data.progress);
        if (data.status === "completed") {
          setOutput(data.output || "");
          setLoading(false);
          updateHistoryStatus(taskId, "completed");
          refreshHistory();
        }
        if (data.status === "failed") {
          setError(data.error || "Research failed");
          setLoading(false);
          updateHistoryStatus(taskId, "failed");
        }
      } catch { /* continue polling */ }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [taskId, status, refreshHistory]);

  const loadFromHistory = useCallback((item: ResearchHistoryItem) => {
    setTaskId(item.id);
    setStatus(item.status === "completed" ? "completed" : "running");
    setLoading(item.status !== "completed");
    setOutput("");
    setError("");
    setProgress(null);
  }, []);

  return (
    <div className="space-y-6">
      {!taskId && !loading && (
        <div className="text-center py-12">
          <div className="inline-flex p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-6">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-serif font-normal mb-2">Deep Tariff Research</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-2 leading-relaxed">
            Generate a comprehensive tariff exposure report for {companyName}. Pulls from SEC filings,
            FRED/BLS economic data, and trade policy news.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-8">
            This is a thorough analysis and typically takes 3-5 minutes to complete.
          </p>

          <div className="max-w-sm mx-auto mb-6">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <input
                type="email"
                placeholder="Email for alert when ready (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-card/50 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-1.5">We'll send you a link to the completed report</p>
          </div>

          <Button onClick={startResearch} size="lg" className="px-8 rounded-xl gap-2">
            <Zap className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      )}

      {status === "email_sent" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <Check className="h-6 w-6 text-emerald-500" />
          </div>
          <h3 className="font-serif text-xl mb-2">Research Started</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            We'll email you at <span className="font-medium text-foreground">{email}</span> with a link to the completed report.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setStatus(""); setTaskId(null); }}>Start Another</Button>
        </motion.div>
      )}

      {loading && <ResearchLoader companyName={companyName} status={status} progress={progress} />}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          {error}
          <Button variant="ghost" size="sm" onClick={startResearch}>Retry</Button>
        </div>
      )}

      {output && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <div className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none tariff-highlights">
              <Streamdown mode="static">{output}</Streamdown>
            </div>
          </div>
        </motion.div>
      )}

      {history.length > 0 && !loading && (
        <div className="border-t border-border/30 pt-6">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Previous Research
          </h4>
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border border-border/30 bg-card/20 hover:bg-card/40 transition-all flex items-center justify-between",
                  taskId === item.id && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[item.status] || "bg-amber-500")} />
                  <div>
                    <p className="text-xs font-medium">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABELS[item.status] || "In Progress"}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Company Page
// ---------------------------------------------------------------------------

export default function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const identifier = decodeURIComponent(ticker);
  const company = resolveCompany(identifier);
  const router = useRouter();

  const [resolvedName, setResolvedName] = useState(company?.name || identifier);
  const [resolvedTicker, setResolvedTicker] = useState(company?.ticker || identifier.toUpperCase());
  const [filings, setFilings] = useState<SearchResult[]>([]);
  const [loadingFilings, setLoadingFilings] = useState(true);
  const [summary, setSummary] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [sources, setSources] = useState<SourceMeta[]>([]);
  const [activeSource, setActiveSource] = useState<number | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  // Refs for batched streaming
  const contentRef = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sector = company?.sector;
  const exposure = company?.exposure;
  const config = exposure ? EXPOSURE_CONFIG[exposure] : null;
  const ExposureIcon = config?.icon;
  const logoUrl = company?.domain
    ? `https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`
    : null;

  // Step 1: Fetch SEC filings
  useEffect(() => {
    async function fetchFilings() {
      try {
        const body = { ticker: company?.ticker || identifier, maxResults: 5 };
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          setFilings(data.results);

          if (!company && data.results.length > 0) {
            const meta = data.results[0].metadata;
            if (meta?.name && typeof meta.name === "string") {
              let cleaned = meta.name
                .replace(/[,.]?\s*(&\s*)?\b(Inc|Corp|Ltd|LLC|Co|Company|Holdings|Group|plc|Automotive|Technologies|Platforms|Global|Athletica)\b\.?/gi, "")
                .replace(/\s+/g, " ")
                .trim();
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

  // Step 2: When filings arrive, start AI summary (batched streaming)
  useEffect(() => {
    if (filings.length === 0 || loadingFilings) return;

    async function fetchSummary() {
      setLoadingSummary(true);
      setSummaryError("");
      setSummary("");
      setSources([]);
      setStreaming(true);
      contentRef.current = "";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);

      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: resolvedTicker, companyName: resolvedName, results: filings }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Summary failed" }));
          throw new Error(err.error || "Summary failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

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
                if (parsed.sources) {
                  setSources(parsed.sources);
                }
                if (parsed.content) {
                  contentRef.current += parsed.content;
                  // Batch state updates to prevent render thrashing
                  if (!flushTimerRef.current) {
                    flushTimerRef.current = setTimeout(() => {
                      setSummary(contentRef.current);
                      flushTimerRef.current = null;
                    }, 200);
                  }
                }
                if (parsed.error) {
                  setSummaryError(parsed.error);
                }
              } catch { /* skip */ }
            }
          }
        }

        // Final flush
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        setSummary(contentRef.current);
      } catch (err: unknown) {
        const msg = err instanceof Error && err.name === "AbortError"
          ? "Analysis timed out. Try refreshing the page."
          : err instanceof Error ? err.message : "Failed to generate summary";
        setSummaryError(msg);
      } finally {
        clearTimeout(timeout);
        setLoadingSummary(false);
        setStreaming(false);
      }
    }

    fetchSummary();

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [filings, loadingFilings, resolvedTicker, resolvedName]);

  return (
    <div className="min-h-screen pt-14">
      {config && (
        <div className={cn("absolute top-14 left-0 right-0 h-48 bg-gradient-to-b pointer-events-none opacity-60", config.gradient)} />
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </button>

        {/* Company Header */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-start gap-5">
            <div className={cn("shrink-0 w-16 h-16 rounded-2xl border-2 flex items-center justify-center bg-card shadow-sm", config?.border || "border-border/40")}>
              {logoUrl ? (
                <Image src={logoUrl} alt={`${resolvedName} logo`} width={40} height={40} className="rounded-lg" unoptimized />
              ) : (
                <span className="text-xl font-bold text-primary">{resolvedTicker.slice(0, 2)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-serif mb-1">{resolvedName}</h1>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <Tabs defaultValue="analysis" className="space-y-6">
            <TabsList className="bg-muted/30 border border-border/40 p-1 h-auto rounded-xl">
              <TabsTrigger value="analysis" className="text-xs gap-1.5 py-2 px-5 rounded-lg data-[state=active]:shadow-sm">
                <FileText className="h-3.5 w-3.5" />
                Tariff Analysis
              </TabsTrigger>
              <TabsTrigger value="research" className="text-xs gap-1.5 py-2 px-5 rounded-lg data-[state=active]:shadow-sm">
                <Zap className="h-3.5 w-3.5" />
                Deep Research
              </TabsTrigger>
            </TabsList>

            {/* ANALYSIS TAB */}
            <TabsContent value="analysis">
              <div className="flex gap-6">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Loading */}
                  {loadingFilings && <SearchLoadingState phase="search" />}
                  {!loadingFilings && loadingSummary && !summary && <SearchLoadingState phase="analyze" />}

                  {/* Error */}
                  {summaryError && !summary && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {summaryError}
                    </div>
                  )}

                  {/* No results */}
                  {!loadingFilings && filings.length === 0 && (
                    <div className="text-center py-20 rounded-xl border border-border/30 bg-card/20">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No tariff-related filings found for {resolvedName}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">This company may not have significant tariff disclosures</p>
                    </div>
                  )}

                  {/* AI Summary */}
                  {summary && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/10">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">Tariff Exposure Analysis</span>
                          {streaming && (
                            <motion.span
                              className="inline-block w-1.5 h-4 bg-primary rounded-sm ml-1"
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{sources.length} sources</span>
                          <button
                            onClick={() => setShowPanel(!showPanel)}
                            className="p-1 rounded hover:bg-muted/50 transition-colors"
                            title={showPanel ? "Hide sources" : "Show sources"}
                          >
                            {showPanel ? (
                              <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <PanelRightOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {streaming ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed tariff-highlights">
                            <Streamdown mode="static">
                              {stripCitations(summary)}
                            </Streamdown>
                            <span className="streaming-cursor" />
                          </div>
                        ) : (
                          <CitationRenderer
                            text={summary}
                            filings={filings}
                            onClickSource={(i) => setActiveSource(activeSource === i ? null : i)}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Expanded filing */}
                  <AnimatePresence>
                    {activeSource !== null && filings[activeSource] && (
                      <div className="mt-4">
                        <ExpandedFiling
                          result={filings[activeSource]}
                          index={activeSource + 1}
                          onClose={() => setActiveSource(null)}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Side Panel */}
                {showPanel && filings.length > 0 && (
                  <div className="w-72 shrink-0 hidden lg:block">
                    <div className="sticky top-24">
                      <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
                        <BookOpen className="h-3 w-3" />
                        Filing Sources
                      </h3>

                      <div className="space-y-2">
                        {filings.map((result, i) => (
                          <FilingSourceCard
                            key={`filing-${i}`}
                            result={result}
                            index={i + 1}
                            isActive={activeSource === i}
                            onClick={() => setActiveSource(activeSource === i ? null : i)}
                          />
                        ))}
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-muted/10 border border-border/20">
                        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                          Hover over citations in the analysis to preview filing sections. Click to expand the full excerpt.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* DEEP RESEARCH TAB */}
            <TabsContent value="research">
              <DeepResearchPanel ticker={resolvedTicker} companyName={resolvedName} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
