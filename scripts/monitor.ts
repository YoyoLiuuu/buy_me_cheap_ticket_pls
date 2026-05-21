// GitHub Actions monitoring script — runs every 6 hours via cron.
// Scrapes Google Flights for all active saved searches, stores results in DB,
// sends email alerts and daily digest.
//
// Run: npx tsx scripts/monitor.ts
// Env: DATABASE_URL, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_BASE_URL

import "dotenv/config";
import { chromium } from "playwright";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { scrapeFlightsForDate } from "./scrape.js";
import { sendPriceAlert, sendDailyDigest } from "../src/lib/email.js";
import { expandAirports } from "../src/lib/flights.js";
import type { LegParams, SearchFilters, Flexibility, LegResult } from "../src/types/index.js";
import { addDays, format, parseISO } from "date-fns";

const IS_DIGEST_RUN = process.env.DIGEST_RUN === "true" || new Date().getUTCHours() === 9;

function getFlexDates(leg: LegParams, flexibility: Flexibility): string[] {
  const range = flexibility === 2 ? 7 : flexibility === 1 ? 2 : 0;
  const earliest = parseISO(leg.earliestDeparture);
  const latest = parseISO(leg.arriveBy);
  const dates = new Set<string>();
  let d = earliest;
  while (d <= latest) {
    dates.add(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }
  for (let i = 1; i <= range; i++) {
    dates.add(format(addDays(earliest, -i), "yyyy-MM-dd"));
    dates.add(format(addDays(latest, i), "yyyy-MM-dd"));
  }
  return Array.from(dates).sort();
}

async function scrapeAllLegs(
  page: import("playwright").Page,
  legs: LegParams[],
  filters: SearchFilters,
  flexibility: Flexibility,
  currency: string
): Promise<LegResult[]> {
  const results: LegResult[] = [];

  for (const leg of legs) {
    const dates = getFlexDates(leg, flexibility);
    const allOffers: import("../src/types/index.js").FlightOffer[] = [];
    const cheapestByDate: Record<string, number> = {};

    // Expand metro codes (e.g. SEL → [ICN, GMP]) so each airport is scraped
    const fromCodes = expandAirports(leg.from);
    const toCodes = expandAirports(leg.to);

    for (const date of dates) {
      for (const fromCode of fromCodes) {
        for (const toCode of toCodes) {
          const expandedLeg: LegParams = { ...leg, from: fromCode, to: toCode };
          try {
            console.log(`  Scraping ${fromCode} → ${toCode} on ${date}…`);
            const offers = await scrapeFlightsForDate(page, expandedLeg, date, currency, filters);
            if (offers.length > 0) {
              const cheapest = Math.min(...offers.map((o) => o.price));
              if (!cheapestByDate[date] || cheapest < cheapestByDate[date]) {
                cheapestByDate[date] = cheapest;
              }
              allOffers.push(...offers);
            }
            await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
          } catch (err) {
            console.error(`  Failed ${fromCode} → ${toCode} ${date}:`, err);
          }
        }
      }
    }

    allOffers.sort((a, b) => a.price - b.price);
    const idealOffers = allOffers.filter((o) => o.isIdealDate);
    const absoluteCheapest = allOffers.length > 0 ? Math.min(...allOffers.map((o) => o.price)) : 0;
    const cheapestOnIdealDates = idealOffers.length > 0 ? Math.min(...idealOffers.map((o) => o.price)) : null;

    results.push({
      leg,
      offers: allOffers.slice(0, 50),
      cheapestByDate,
      absoluteCheapest,
      cheapestOnIdealDates,
      pricePremiumForIdeal: cheapestOnIdealDates !== null ? cheapestOnIdealDates - absoluteCheapest : null,
    });
  }

  return results;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set. Add it to GitHub Actions secrets (Settings → Secrets → Actions).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const searches = await prisma.savedSearch.findMany({
    where: { active: true },
    include: { priceRecords: { orderBy: { checkedAt: "desc" }, take: 1 } },
  });

  console.log(`Found ${searches.length} active search(es) to monitor.`);
  if (searches.length === 0) { await prisma.$disconnect(); return; }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-CA",
    viewport: { width: 1280, height: 900 },
  });

  // Mask webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  const stats = { checked: 0, alerted: 0, digested: 0, errors: 0, noResults: 0 };

  for (const search of searches) {
    console.log(`\nProcessing search ${search.id} (${search.email})…`);
    try {
      const legs = search.legs as unknown as LegParams[];
      const filters = search.filters as unknown as SearchFilters;
      const flexibility = search.flexibility as Flexibility;

      const legResults = await scrapeAllLegs(page, legs, filters, flexibility, "CAD");
      const cheapestNow = legResults.reduce((s, l) => s + l.absoluteCheapest, 0);

      if (cheapestNow === 0) {
        console.warn(`  No results found for search ${search.id}`);
        stats.noResults++;
        continue;
      }

      await prisma.priceRecord.create({
        data: {
          searchId: search.id,
          cheapestPrice: cheapestNow,
          currency: "CAD",
          topResults: legResults.map((l) => l.offers.slice(0, 5)) as object,
        },
      });

      stats.checked++;
      console.log(`  Cheapest now: $${cheapestNow.toFixed(0)}`);

      // Price drop alert
      const prevRecord = search.priceRecords[0];
      if (prevRecord) {
        const dropPct = ((prevRecord.cheapestPrice - cheapestNow) / prevRecord.cheapestPrice) * 100;
        console.log(`  Previous: $${prevRecord.cheapestPrice.toFixed(0)} → drop: ${dropPct.toFixed(1)}%`);
        if (dropPct >= search.alertThreshold) {
          await sendPriceAlert({
            email: search.email,
            token: search.token,
            legResults,
            searchParams: { tripType: "multi-leg", legs, filters, flexibility, pricePremiumPct: 10, adults: 1, currency: "CAD" },
            droppedLeg: 0,
            newPrice: cheapestNow,
            oldPrice: prevRecord.cheapestPrice,
            currency: "CAD",
          });
          await prisma.alertLog.create({ data: { searchId: search.id, type: "alert", price: cheapestNow } });
          stats.alerted++;
          console.log(`  Alert sent!`);
        }
      }

      // Daily digest
      if (IS_DIGEST_RUN && search.digestEnabled) {
        await sendDailyDigest({ email: search.email, token: search.token, legResults, currency: "CAD" });
        await prisma.alertLog.create({ data: { searchId: search.id, type: "digest", price: cheapestNow } });
        stats.digested++;
        console.log(`  Digest sent.`);
      }

      // Polite delay between searches
      await new Promise((r) => setTimeout(r, 5000 + Math.random() * 5000));
    } catch (err) {
      console.error(`  Error processing search ${search.id}:`, err);
      stats.errors++;
    }
  }

  await browser.close();
  await prisma.$disconnect();

  console.log("\n── Monitor run complete ──");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
