import { NextRequest } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a senior tariff and trade policy analyst. You analyze SEC filing excerpts and produce clear, structured summaries of a company's tariff exposure.

RULES:
- Cite sources using inline markdown links: [N](url) where N is the source number
- Every substantive claim MUST have at least one citation
- Use multiple citations when findings appear across filings: [1](url1) [2](url2)
- Structure your response with clear markdown headings (##)
- Be precise - quote exact language from filings when impactful
- Highlight the severity: is this existential risk or manageable cost?
- Call out any mitigation strategies the company has disclosed
- Note trends across filings if visible (getting better/worse)
- Keep it concise but thorough - aim for 400-600 words
- Use bold for key tariff terms like **tariffs**, **duties**, **trade war**, **supply chain**, etc.

STRUCTURE:
## Overview
Brief 2-3 sentence executive summary of tariff exposure level.

## Key Exposures
Specific tariff risks with citations to filing sections.

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

    // Format results as numbered context for the model
    const context = results.map((r: any, i: number) => {
      const meta = r.metadata || {};
      const date = r.publication_date || meta.date || "Unknown date";
      const formType = meta.form_type || "SEC Filing";
      const content = typeof r.content === "string" ? r.content : JSON.stringify(r.content);

      return `[Source ${i + 1}]
Title: ${r.title}
URL: ${r.url}
Filing Type: ${formType}
Date: ${date}
Company: ${meta.name || companyName || ticker}

Content:
${content}`;
    }).join("\n\n---\n\n");

    const sourceUrls = results.map((r: any) => r.url);

    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      stream: true,
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze the tariff exposure for **${companyName || ticker}** (${ticker}) based on these ${results.length} SEC filing excerpts.

IMPORTANT: When citing, use the exact URLs provided. Format: [N](exact_url_from_source)

Source URLs for reference:
${sourceUrls.map((url: string, i: number) => `[${i + 1}] ${url}`).join("\n")}

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
          sources: results.map((r: any, i: number) => ({
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
