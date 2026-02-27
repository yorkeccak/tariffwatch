import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function highlightTariffTerms(text: string): string {
  const terms = [
    'tariffs', 'tariff', 'duties', 'duty', 'import tax', 'export tax',
    'trade war', 'trade barrier', 'customs', 'quotas', 'quota',
    'anti-dumping', 'countervailing', 'section 301', 'section 232',
    'trade restriction', 'trade policy', 'trade agreement',
    'supply chain', 'reshoring', 'nearshoring', 'onshoring',
  ];
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
  return text.replace(regex, '**$1**');
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
