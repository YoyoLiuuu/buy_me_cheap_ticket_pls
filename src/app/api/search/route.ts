import { NextRequest } from "next/server";
import { z } from "zod";
import { addDays, format, parseISO } from "date-fns";
import { buildGoogleFlightsUrl, expandAirports } from "@/lib/flights";
import { scrapeFlightsForDate } from "@/lib/scrape";
import { launchBrowser, newStealthContext } from "@/lib/browser";
import type { SearchParams, LegResult, FlightOffer, LegParams } from "@/types";

export const maxDuration = 60; // seconds — raise to 300 on Vercel Pro

const LegSchema = z.object({
  from: z.string().min(3).max(4),
  to: z.string().min(3).max(4),
  fromCity: z.string(),
  toCity: z.string(),
  earliestDeparture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  arriveBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  earliestDepartureTime: z.string().optional(),
  latestDepartureTime: z.string().optional(),
  earliestArrivalTime: z.string().optional(),
  latestArrivalTime: z.string().optional(),
  maxDurationHours: z.number().optional(),
});

const SearchSchema = z.object({
  legs: z.array(LegSchema).min(1).max(6),
  filters: z.object({
    avoidConflictZones: z.boolean(),
    avoidMiddleEast: z.boolean(),
    customAvoidCountries: z.array(z.string()),
    maxLayoverHours: z.number().optional(),
  }),
  flexibility: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  pricePremiumPct: z.number().min(0).max(100),
  adults: z.number().min(1).max(9),
  currency: z.string().length(3),
});

// Core dates = the explicit window the user wants to fly on.
// Flex dates = extra days from the ±2/±7 flexibility slider.
function getCoreDates(leg: LegParams): string[] {
  const earliest = parseISO(leg.earliestDeparture);
  const latest = parseISO(leg.arriveBy);
  const dates: string[] = [];
  let d = earliest;
  while (d <= latest) {
    dates.push(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }
  return dates;
}

function getFlexOnlyDates(leg: LegParams, flexibility: number): string[] {
  const range = flexibility === 2 ? 7 : flexibility === 1 ? 2 : 0;
  if (range === 0) return [];
  const earliest = parseISO(leg.earliestDeparture);
  const latest = parseISO(leg.arriveBy);
  const flex: string[] = [];
  for (let i = 1; i <= range; i++) {
    flex.push(format(addDays(earliest, -i), "yyyy-MM-dd"));
    flex.push(format(addDays(latest, i), "yyyy-MM-dd"));
  }
  return flex.sort();
}

// Link-only placeholder cards for dates we're not scraping live.
function buildLinkOffers(leg: LegParams, dates: string[], currency: string): FlightOffer[] {
  return dates.map((date, i) => ({
    id: `link-${leg.from}-${leg.to}-${date}-${i}`,
    price: 0,
    currency,
    itineraries: [{
      segments: [{
        departure: { iataCode: leg.from, cityName: leg.fromCity, countryCode: "", at: `${date}T00:00:00` },
        arrival: { iataCode: leg.to, cityName: leg.toCity, countryCode: "", at: `${date}T00:00:00` },
        carrierCode: "", carrierName: "", flightNumber: "",
        duration: "PT0H0M", durationMinutes: 0,
      }],
      totalDurationMinutes: 0,
      stops: -1,
    }],
    validatingCarrierCode: "",
    deepLink: buildGoogleFlightsUrl(leg.fromCity, leg.toCity, date, currency),
    conflictZoneWarnings: [],
    departureDate: date,
    isIdealDate: false, // flex dates are outside the ideal window
  }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SearchSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid parameters", details: parsed.error.issues }, { status: 400 });
  }

  const params = parsed.data as SearchParams;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      let browser;
      try {
        emit({ type: "status", message: "Launching browser..." });
        browser = await launchBrowser();
        const context = await newStealthContext(browser);

        for (let legIdx = 0; legIdx < params.legs.length; legIdx++) {
          const leg = params.legs[legIdx];
          emit({
            type: "progress",
            legIndex: legIdx,
            total: params.legs.length,
            message: `Searching ${leg.fromCity} → ${leg.toCity}...`,
          });

          // Expand metro codes (SEL → ICN,GMP) for scraping
          const fromCodes = expandAirports(leg.from);
          const toCodes = expandAirports(leg.to);
          const coreDates = getCoreDates(leg);
          const flexDates = getFlexOnlyDates(leg, params.flexibility);

          const allOffers: FlightOffer[] = [];
          const cheapestByDate: Record<string, number> = {};

          // Scrape core dates for each from/to airport combination, 3 pages at a time
          const scrapeJobs = coreDates.flatMap((date) =>
            fromCodes.flatMap((fromCode) =>
              toCodes.map((toCode) => ({ date, fromCode, toCode }))
            )
          );

          for (let i = 0; i < scrapeJobs.length; i += 3) {
            const batch = scrapeJobs.slice(i, i + 3);
            const results = await Promise.allSettled(
              batch.map(async ({ date, fromCode, toCode }) => {
                const expandedLeg: LegParams = { ...leg, from: fromCode, to: toCode };
                const page = await context.newPage();
                try {
                  return { date, offers: await scrapeFlightsForDate(page, expandedLeg, date, params.currency, params.filters) };
                } finally {
                  await page.close().catch(() => {});
                }
              })
            );

            for (const result of results) {
              if (result.status === "rejected") {
                console.warn(`[search] scrape job failed:`, result.reason);
              }
              if (result.status === "fulfilled") {
                const { date, offers } = result.value;
                if (offers.length > 0) {
                  const cheapest = Math.min(...offers.map((o) => o.price));
                  if (!cheapestByDate[date] || cheapest < cheapestByDate[date]) {
                    cheapestByDate[date] = cheapest;
                  }
                  allOffers.push(...offers);
                }
              }
            }
          }

          // Flex dates as link-only placeholders
          const linkOffers = buildLinkOffers(leg, flexDates, params.currency);

          allOffers.sort((a, b) => a.price - b.price);
          const idealOffers = allOffers.filter((o) => o.isIdealDate);
          const absoluteCheapest = allOffers.length > 0 ? Math.min(...allOffers.map((o) => o.price)) : 0;
          const cheapestOnIdealDates = idealOffers.length > 0 ? Math.min(...idealOffers.map((o) => o.price)) : null;

          const legResult: LegResult = {
            leg,
            offers: [...allOffers, ...linkOffers],
            cheapestByDate,
            absoluteCheapest,
            cheapestOnIdealDates,
            pricePremiumForIdeal:
              cheapestOnIdealDates !== null && absoluteCheapest > 0
                ? cheapestOnIdealDates - absoluteCheapest
                : null,
          };

          emit({ type: "leg", legIndex: legIdx, data: legResult });
        }

        await browser.close();
        emit({
          type: "done",
          searchedAt: new Date().toISOString(),
          currency: params.currency,
          flexibility: params.flexibility,
        });
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Scrape failed" });
        try { await browser?.close(); } catch {}
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
