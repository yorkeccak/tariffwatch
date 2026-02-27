import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { query, ticker } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "VALYU_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchQuery = ticker
      ? `${query} for ${ticker} based on SEC filings 10-K 10-Q`
      : `${query} tariff trade policy SEC filings`;

    const response = await fetch("https://api.valyu.ai/v1/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query: searchQuery,
        search_type: "all",
        included_sources: ticker ? ["valyu/valyu-sec-filings"] : undefined,
        data_max_price: 1,
        system_instructions: "You are a tariff and trade policy analyst. Focus on tariff exposure, import duties, trade restrictions, supply chain risks, and regulatory impacts. Cite specific sections and quotes from SEC filings when available. Be precise and data-driven.",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `Answer API failed: ${error}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the SSE response back to client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Answer failed";
    console.error("Answer error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
