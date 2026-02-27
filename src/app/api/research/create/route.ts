import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { query, ticker, companyName } = body;

    if (!query && !ticker) {
      return NextResponse.json({ error: "Query or ticker required" }, { status: 400 });
    }

    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "VALYU_API_KEY not configured" }, { status: 500 });
    }

    const valyu = new Valyu(apiKey);
    const researchQuery = query || `Comprehensive tariff exposure analysis for ${companyName || ticker} (${ticker}).

Analyze the following aspects based on SEC filings (10-K, 10-Q), news, and economic data:

1. **Direct Tariff Exposure**: What specific tariffs affect this company? Which products or components are subject to import duties?
2. **Supply Chain Risk**: How dependent is the company on imports from countries facing tariff actions (China, EU, Mexico, Canada)? What percentage of COGS is affected?
3. **Risk Factor Disclosures**: What exact language does the company use in SEC filings about tariff risk? Quote directly from Risk Factors and MD&A sections.
4. **Financial Impact**: Any quantified estimates of tariff costs? Has the company disclosed pricing actions or margin impacts?
5. **Mitigation Strategies**: Is the company reshoring, nearshoring, or diversifying suppliers? Any specific actions mentioned?
6. **Competitive Position**: How does this company's tariff exposure compare to peers in the same sector?
7. **Trend Analysis**: Has the company's tariff-related language changed over recent filings? More cautious or less?
8. **Forward-Looking Statements**: What does the company say about future tariff impacts?

Provide specific quotes, section references, and filing dates wherever possible.`;

    const response = await valyu.deepresearch.create({
      query: researchQuery,
      mode: "fast",
      outputFormats: ["markdown"],
      search: {
        searchType: "all",
        includedSources: ["valyu/valyu-sec-filings", "valyu/valyu-fred", "valyu/valyu-bls"],
      },
    });

    return NextResponse.json({
      success: true,
      taskId: response.deepresearch_id,
      status: response.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Research creation failed";
    console.error("Research create error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
