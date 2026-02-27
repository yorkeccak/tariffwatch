import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tariffwatch.valyu.ai"),
  title: {
    default: "TariffWatch - Find Tariff Exposure in SEC Filings | Valyu",
    template: "%s | TariffWatch",
  },
  description: "Search any US public company for tariff risk disclosures buried in SEC filings. Instant analysis of 10-K and 10-Q tariff language with exact quotes and section references.",
  keywords: [
    "tariff exposure", "SEC filings", "10-K analysis", "trade risk",
    "tariff risk", "supply chain risk", "trade war", "import duties",
    "corporate tariff disclosure", "investment research",
  ],
  applicationName: "TariffWatch by Valyu",
  authors: [{ name: "Valyu", url: "https://valyu.ai" }],
  openGraph: {
    title: "TariffWatch - Find Tariff Exposure in SEC Filings",
    description: "US public companies disclose their tariff exposure in SEC filings - but those disclosures are buried in 200-page documents. TariffWatch surfaces them in seconds.",
    url: "/",
    siteName: "TariffWatch by Valyu",
    locale: "en_US",
    type: "website",
    images: [{ url: "/sec-hero-bg.jpg", width: 5704, height: 3803, alt: "TariffWatch - SEC Filing Analysis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TariffWatch - Tariff Exposure in SEC Filings",
    description: "Search any US public company for tariff risk disclosures. Instant analysis from 10-K and 10-Q filings.",
    creator: "@valaborator",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} antialiased`}>
          <Nav />
          <main className="min-h-screen">
            {children}
          </main>
      </body>
    </html>
  );
}
