# TariffWatch

Try the hosted version at [tariffwatch.valyu.ai](https://tariffwatch.valyu.ai)

Then fork and get building...

> **Find tariff exposure buried in SEC filings - instantly** - Search any US public company for tariff risk disclosures extracted from 10-K and 10-Q filings, with exact quotes and section references. Powered by 1 search API.

![TariffWatch - SEC filing tariff exposure analysis](screenshot.png)

## Why TariffWatch?

**Your AI's search is only as good as the data it's searching over.**

Traditional tariff research means digging through 200-page SEC filings manually. TariffWatch changes everything by being powered by **[Valyu](https://platform.valyu.ai)** - the world's most powerful search API for AI agents. This isn't just another search tool; it's a tariff intelligence platform with access to:

- **SEC Filings Index** - Full-text search across 10-K and 10-Q filings for every US public company
- **Economic Data** - FRED and BLS datasets for macro tariff context
- **Real-Time News** - Breaking tariff and trade policy coverage
- **AI-Powered Q&A** - Ask natural language questions grounded in actual filing data
- **Deep Research** - Comprehensive multi-source tariff exposure reports

[See how Valyu compares to other search APIs](https://www.valyu.ai/blogs/benchmarking-search-apis-for-ai-agents) - Independent benchmarks show why Valyu delivers superior results for AI agents.

## Key Features

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

## Quick Start (Self-Hosted)

Self-hosted mode is the default and recommended way to run TariffWatch. No authentication required - just add your Valyu API key and go.

### Prerequisites

- Node.js 18+
- pnpm
- Valyu API key (get one free at [platform.valyu.ai](https://platform.valyu.ai))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yorkeccak/tariffwatch.git
   cd tariffwatch
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Valyu API key:

   ```env
   # Self-hosted mode (default - no auth required)
   NEXT_PUBLIC_APP_MODE=self-hosted

   # Valyu API key (required)
   VALYU_API_KEY=your_valyu_api_key_here
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yorkeccak/tariffwatch&env=VALYU_API_KEY&envDescription=Get%20your%20API%20key%20at%20platform.valyu.ai)

Or deploy anywhere that supports Next.js - just set the `VALYU_API_KEY` environment variable.

## Data Sources

All data is accessed through the [Valyu API](https://docs.valyu.ai):

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Valyu API Sources                               │
├──────────────────┬──────────────────┬───────────────────────────────┤
│  SEC Filings     │  Economic        │  News                         │
│  ├ 10-K annual   │  ├ FRED         │  └ Real-time web search       │
│  └ 10-Q quarterly│  └ BLS          │    (last 7 days)              │
└──────────────────┴──────────────────┴───────────────────────────────┘
```

## Valyu Mode (OAuth - Coming Soon)

> **Note:** Valyu OAuth apps will be in general availability soon. Currently client id/secret are not publicly available. Contact contact@valyu.ai if you need access.

Valyu mode is used by [tariffwatch.valyu.ai](https://tariffwatch.valyu.ai) for production deployment with full authentication via Valyu Platform OAuth.

For Valyu mode setup, set `NEXT_PUBLIC_APP_MODE=valyu` and configure the OAuth credentials. See `.env.example` for the full list of required variables.

## Architecture

- **Frontend**: Next.js 16 with App Router, React 19, Tailwind CSS 4
- **Data**: Valyu API for SEC filings, economic data, and news
- **AI Q&A**: Valyu Answer API with streaming SSE responses
- **Deep Research**: Valyu DeepResearch API for multi-source analysis
- **Animations**: Framer Motion
- **Markdown**: Streamdown for streaming markdown rendering

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Valyu](https://platform.valyu.ai) - The unified search API for AI agents
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with love by the Valyu team
</p>

<p align="center">
  <a href="https://twitter.com/valyuOfficial">Twitter</a> -
  <a href="https://www.linkedin.com/company/valyu-ai">LinkedIn</a> -
  <a href="https://github.com/yorkeccak/tariffwatch">GitHub</a>
</p>
