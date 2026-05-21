import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CheapTicket — Find the cheapest flight",
  description:
    "Search flexible date ranges, filter conflict-zone layovers, and get email alerts when prices drop.",
  openGraph: {
    title: "CheapTicket",
    description: "Find the cheapest flight — with flexible dates, conflict-zone filters, and price alerts.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
