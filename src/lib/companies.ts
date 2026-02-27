export interface Company {
  ticker: string;
  name: string;
  sector?: string;
  exposure?: 'high' | 'moderate' | 'low';
  domain?: string;
}

export const FEATURED_COMPANIES: Company[] = [
  // High exposure - Manufacturing/Consumer
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', exposure: 'high', domain: 'apple.com' },
  { ticker: 'NKE', name: 'Nike', sector: 'Consumer Discretionary', exposure: 'high', domain: 'nike.com' },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Discretionary', exposure: 'high', domain: 'tesla.com' },
  { ticker: 'F', name: 'Ford Motor', sector: 'Consumer Discretionary', exposure: 'high', domain: 'ford.com' },
  { ticker: 'GM', name: 'General Motors', sector: 'Consumer Discretionary', exposure: 'high', domain: 'gm.com' },
  { ticker: 'CAT', name: 'Caterpillar', sector: 'Industrials', exposure: 'high', domain: 'cat.com' },
  { ticker: 'MMM', name: '3M', sector: 'Industrials', exposure: 'high', domain: '3m.com' },
  { ticker: 'DE', name: 'Deere & Co', sector: 'Industrials', exposure: 'high', domain: 'deere.com' },
  { ticker: 'QCOM', name: 'Qualcomm', sector: 'Technology', exposure: 'high', domain: 'qualcomm.com' },
  { ticker: 'WMT', name: 'Walmart', sector: 'Consumer Staples', exposure: 'high', domain: 'walmart.com' },
  { ticker: 'TGT', name: 'Target', sector: 'Consumer Discretionary', exposure: 'high', domain: 'target.com' },
  { ticker: 'HD', name: 'Home Depot', sector: 'Consumer Discretionary', exposure: 'high', domain: 'homedepot.com' },
  { ticker: 'LOW', name: "Lowe's", sector: 'Consumer Discretionary', exposure: 'high', domain: 'lowes.com' },
  { ticker: 'BA', name: 'Boeing', sector: 'Industrials', exposure: 'high', domain: 'boeing.com' },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials', exposure: 'high', domain: 'ge.com' },

  // Moderate exposure - Tech/Mixed
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', exposure: 'moderate', domain: 'microsoft.com' },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Communication Services', exposure: 'moderate', domain: 'google.com' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Communication Services', exposure: 'moderate', domain: 'meta.com' },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Discretionary', exposure: 'moderate', domain: 'amazon.com' },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', exposure: 'moderate', domain: 'nvidia.com' },
  { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology', exposure: 'moderate', domain: 'broadcom.com' },
  { ticker: 'INTC', name: 'Intel', sector: 'Technology', exposure: 'moderate', domain: 'intel.com' },
  { ticker: 'AMD', name: 'AMD', sector: 'Technology', exposure: 'moderate', domain: 'amd.com' },
  { ticker: 'CRM', name: 'Salesforce', sector: 'Technology', exposure: 'low', domain: 'salesforce.com' },
  { ticker: 'ORCL', name: 'Oracle', sector: 'Technology', exposure: 'low', domain: 'oracle.com' },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', exposure: 'moderate', domain: 'pg.com' },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', exposure: 'moderate', domain: 'coca-cola.com' },
  { ticker: 'PEP', name: 'PepsiCo', sector: 'Consumer Staples', exposure: 'moderate', domain: 'pepsico.com' },
  { ticker: 'COST', name: 'Costco', sector: 'Consumer Staples', exposure: 'moderate', domain: 'costco.com' },
  { ticker: 'MCD', name: "McDonald's", sector: 'Consumer Discretionary', exposure: 'moderate', domain: 'mcdonalds.com' },

  // Low exposure - Services/Domestic
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', exposure: 'low', domain: 'jpmorganchase.com' },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', exposure: 'low', domain: 'bankofamerica.com' },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', exposure: 'low', domain: 'goldmansachs.com' },
  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', exposure: 'low', domain: 'unitedhealthgroup.com' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', exposure: 'moderate', domain: 'jnj.com' },
  { ticker: 'PFE', name: 'Pfizer', sector: 'Healthcare', exposure: 'moderate', domain: 'pfizer.com' },
  { ticker: 'ABBV', name: 'AbbVie', sector: 'Healthcare', exposure: 'low', domain: 'abbvie.com' },
  { ticker: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', exposure: 'low', domain: 'lilly.com' },
  { ticker: 'V', name: 'Visa', sector: 'Financials', exposure: 'low', domain: 'visa.com' },
  { ticker: 'MA', name: 'Mastercard', sector: 'Financials', exposure: 'low', domain: 'mastercard.com' },
];

export const SECTORS = [
  'Technology',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Healthcare',
  'Financials',
  'Communication Services',
  'Energy',
  'Materials',
  'Utilities',
  'Real Estate',
];

export function getCompanyByTicker(ticker: string): Company | undefined {
  return FEATURED_COMPANIES.find(c => c.ticker.toLowerCase() === ticker.toLowerCase());
}

export function getCompaniesBySector(sector: string): Company[] {
  return FEATURED_COMPANIES.filter(c => c.sector === sector);
}

export function searchCompanies(query: string): Company[] {
  const q = query.toLowerCase();
  return FEATURED_COMPANIES.filter(
    c => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  );
}

export function resolveCompany(identifier: string): Company | undefined {
  const q = identifier.toLowerCase().trim();
  if (!q) return undefined;
  return FEATURED_COMPANIES.find(c => c.ticker.toLowerCase() === q)
    || FEATURED_COMPANIES.find(c => c.name.toLowerCase() === q)
    || (q.length > 2 ? FEATURED_COMPANIES.find(c => c.name.toLowerCase().includes(q)) : undefined);
}
