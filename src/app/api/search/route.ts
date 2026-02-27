import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { query, ticker, maxResults: rawMax = 10 } = body;
    const maxResults = Math.min(Math.max(1, Number(rawMax) || 10), 20);

    if (!query && !ticker) {
      return NextResponse.json({ error: "Query or ticker is required" }, { status: 400 });
    }

    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "VALYU_API_KEY not configured" }, { status: 500 });
    }

    const valyu = new Valyu(apiKey);

    // Recency filter: last 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const startDate = twoYearsAgo.toISOString().split('T')[0];

    const searchOpts = {
      searchType: "proprietary" as const,
      includedSources: ["valyu/valyu-sec-filings"],
      responseLength: "large" as const,
      startDate,
    };

    let results: any[];

    if (query) {
      // Direct query - use as-is
      const response = await valyu.search(query, { ...searchOpts, maxNumResults: maxResults });
      results = response.results || [];
    } else {
      // Ticker-based: parallel search for 10-K and 10-Q to get both filing types
      const [annualRes, quarterlyRes] = await Promise.all([
        valyu.search(`${ticker} tariff risks latest annual 10-K filing`, { ...searchOpts, maxNumResults: Math.ceil(maxResults * 0.6) }),
        valyu.search(`${ticker} tariff risks latest quarterly 10-Q filing`, { ...searchOpts, maxNumResults: Math.ceil(maxResults * 0.4) }),
      ]);

      const annualResults = annualRes.results || [];
      const quarterlyResults = quarterlyRes.results || [];

      // Merge and deduplicate by id
      const seen = new Set<string>();
      results = [];
      for (const r of [...annualResults, ...quarterlyResults]) {
        const id = r.id || r.url || r.title;
        if (!seen.has(id)) {
          seen.add(id);
          results.push(r);
        }
      }
    }

    // Fallback: if no recent results, search without date filter
    if (results.length === 0) {
      const fallbackQuery = query || `${ticker} tariff risks latest 10-K 10-Q filing`;
      const fallback = await valyu.search(fallbackQuery, {
        searchType: "proprietary",
        maxNumResults: maxResults,
        includedSources: ["valyu/valyu-sec-filings"],
        responseLength: "large",
      });
      results = fallback.results || [];
    }

    // Sort by filing date descending, then by relevance
    results.sort((a: any, b: any) => {
      const dateA = a.metadata?.date || '';
      const dateB = b.metadata?.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.relevance_score || 0) - (a.relevance_score || 0);
    });

    // Cap at requested amount
    results = results.slice(0, maxResults);

    return NextResponse.json({
      success: true,
      results,
      total_results: results.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    console.error("Search error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
