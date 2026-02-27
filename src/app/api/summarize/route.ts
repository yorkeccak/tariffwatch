import { NextRequest } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a senior tariff and trade policy analyst. You analyze SEC filing excerpts and produce clear, structured summaries of a company's tariff exposure.

CITATION FORMAT (CRITICAL - follow this exactly):
When referencing information from a source, wrap the cited text in these markers:
{{cite:N}}the quoted or paraphrased text from the source{{/cite}}

Where N is the source number (1-based). The markers must wrap meaningful phrases or sentences - not single words. Keep each citation within a single paragraph.

EXAMPLE:
The company has {{cite:1}}significant exposure to tariffs on Chinese imports, with approximately 40% of components sourced from affected regions{{/cite}}. Management has acknowledged this as a {{cite:2}}material risk to operating margins in the near term{{/cite}}.

RULES:
- Every factual claim MUST be wrapped in {{cite:N}}...{{/cite}} markers
- Do NOT put paragraph breaks inside citation markers
- Structure your response with ## headings
- Be precise - use exact language from filings when impactful
- Highlight severity: is this existential risk or manageable cost?
- Call out mitigation strategies the company has disclosed
- Note trends across filings if visible (getting better/worse)
- Aim for 500-800 words
- Bold key terms: **tariffs**, **duties**, **trade war**, **supply chain**, **import**, **export**, etc.

STRUCTURE:
## Overview
Brief 2-3 sentence executive summary of tariff exposure level.

## Key Exposures
Specific tariff risks with cited text from filing sections.

## Financial Impact
Any quantified impacts, cost estimates, or margin effects mentioned.

## Mitigation Strategies
What the company is doing about it (reshoring, diversification, pricing).

## Outlook
Forward-looking statements and trend direction.`;

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

    const { ticker, companyName, results } = body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return new Response(JSON.stringify({ error: "Search results required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openai = new OpenAI({ apiKey });

    // Truncate filing content to keep prompt manageable for fast TTFT
    const MAX_CONTENT_CHARS = 4000;
    const context = results.slice(0, 4).map((r: any, i: number) => {
      const meta = r.metadata || {};
      const date = r.publication_date || meta.date || "Unknown date";
      const formType = meta.form_type || "SEC Filing";
      const raw = typeof r.content === "string" ? r.content : JSON.stringify(r.content);
      const content = raw.length > MAX_CONTENT_CHARS ? raw.slice(0, MAX_CONTENT_CHARS) + "\n[...truncated]" : raw;

      return `[Source ${i + 1}]
Title: ${r.title}
URL: ${r.url}
Filing Type: ${formType}
Date: ${date}
Company: ${meta.name || companyName || ticker}

Content:
${content}`;
    }).join("\n\n---\n\n");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      stream: true,
      reasoning_effort: "none",
      max_completion_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze the tariff exposure for **${companyName || ticker}** (${ticker}) based on these ${Math.min(results.length, 4)} SEC filing excerpts.

IMPORTANT: Cite by wrapping text in {{cite:N}}...{{/cite}} where N is the source number (1-${Math.min(results.length, 4)}).

---

${context}`,
        },
      ],
    });

    // Stream as SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources metadata first
        const sourcesPayload = JSON.stringify({
          sources: results.slice(0, 4).map((r: any, i: number) => ({
            index: i + 1,
            title: r.title,
            url: r.url,
            form_type: r.metadata?.form_type || "SEC Filing",
            date: r.publication_date || r.metadata?.date || null,
            relevance_score: r.relevance_score,
          })),
        });
        controller.enqueue(encoder.encode(`data: ${sourcesPayload}\n\n`));

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Summarize failed";
    console.error("Summarize error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
