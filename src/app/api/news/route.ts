import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { query = "US tariff policy trade war import duties", maxResults = 8 } = body;

    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "VALYU_API_KEY not configured" }, { status: 500 });
    }

    const valyu = new Valyu(apiKey);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await valyu.search(query, {
      searchType: "news" as any,
      maxNumResults: maxResults,
      responseLength: "medium",
      countryCode: "US",
      startDate: sevenDaysAgo,
    } as any);

    return NextResponse.json({
      success: true,
      results: response.results || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "News search failed";
    console.error("News error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
