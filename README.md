# [TariffWatch](https://tariffwatch.valyu.ai)

> **Find tariff exposure buried in SEC filings - instantly.** Search any US public company for tariff risk disclosures extracted from 10-K and 10-Q filings, with exact quotes and section references.

![TariffWatch](screenshot.png)

## Why TariffWatch?

Tariff risk disclosures are buried in 200-page SEC filings. TariffWatch surfaces them in seconds.

Powered by [Valyu](https://valyu.ai), which has indexed **every SEC filing ever made** - 10-Ks, 10-Qs, 8-Ks, proxy statements, and more. Real-time updates as new filings hit EDGAR, not the stale quarterly snapshots you get from providers charging $10K+/year. Combined with FRED/BLS economic data and real-time news, you get a complete picture of any company's tariff exposure.

[See how Valyu compares to other search APIs for SEC filing search](https://www.valyu.ai/blogs/benchmarking-search-apis-for-ai-agents)

## Features

| Feature | What it does |
|---|---|
| **SEC Filing Search** | Search any US public company - extract tariff-related language from 10-K/10-Q filings with exact quotes and section references |
| **AI Q&A** | Ask natural language questions about any company's tariff exposure, grounded in SEC filing data |
| **Deep Research** | Comprehensive tariff exposure reports pulling from SEC filings, FRED, BLS, and news |
| **Company Comparison** | Side-by-side tariff exposure analysis of any two companies |
| **Featured Companies** | Pre-analyzed view of 40+ major companies across sectors with exposure ratings |
| **Live News** | Real-time tariff and trade policy news feed |

## How it works

```
                                    ┌─────────────────────┐
                                    │   Search a company    │
                                    │   or browse sectors   │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                          ┌────────────────────────────────────────┐
                          │            Valyu API                    │
                          │                                        │
                          │  Searches SEC filings, economic data,  │
                          │  and news in parallel                  │
                          └──────────────────┬─────────────────────┘
                                             │
                      ┌──────────┬───────────┼───────────┬──────────┐
                      ▼          ▼           ▼           ▼          ▼
                 ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐
                 │ Filing │ │  AI    │ │  Deep    │ │ Sector │ │ Live   │
                 │Excerpts│ │  Q&A   │ │ Research │ │ Charts │ │  News  │
                 └────────┘ └────────┘ └──────────┘ └────────┘ └────────┘
```

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/yorkeccak/tariffwatch.git
   cd tariffwatch
   pnpm install
   cp .env.example .env.local
   ```

2. **Add your Valyu API key** to `.env.local` (get one free at [platform.valyu.ai](https://platform.valyu.ai)):
   ```env
   VALYU_API_KEY=your_valyu_api_key_here
   ```

3. **Run**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yorkeccak/tariffwatch&env=VALYU_API_KEY&envDescription=Get%20your%20API%20key%20at%20platform.valyu.ai)

Or deploy anywhere that supports Next.js - just set the `VALYU_API_KEY` environment variable.

## Data Sources

- **SEC Filings** - Every filing ever made. 10-K annual, 10-Q quarterly, and more.
- **Economic Data** - FRED and BLS datasets
- **News** - Real-time web search (last 7 days)

## Stack

Next.js 16 / React 19 / Tailwind CSS 4 / Framer Motion / Streamdown / [Valyu API](https://docs.valyu.ai) / TypeScript

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<p align="center">
  <a href="https://valyu.ai">Valyu</a> -
  <a href="https://twitter.com/valyuOfficial">Twitter</a> -
  <a href="https://www.linkedin.com/company/valyu-ai">LinkedIn</a>
</p>
