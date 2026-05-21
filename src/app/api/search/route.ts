import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildGoogleFlightsUrl } from "@/lib/flights";
import { addDays, format, parseISO } from "date-fns";
import type { SearchParams, SearchResult, LegResult, FlightOffer } from "@/types";

const LegSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  fromCity: z.string(),
  toCity: z.string(),
  earliestDeparture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latestDeparture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  earliestDepartureTime: z.string().optional(),
  latestDepartureTime: z.string().optional(),
  earliestArrivalTime: z.string().optional(),
  latestArrivalTime: z.string().optional(),
  maxDurationHours: z.number().optional(),
});

const FiltersSchema = z.object({
  avoidConflictZones: z.boolean(),
  avoidMiddleEast: z.boolean(),
  customAvoidCountries: z.array(z.string()),
  maxLayoverHours: z.number().optional(),
});

const SearchSchema = z.object({
  legs: z.array(LegSchema).min(1).max(6),
  filters: FiltersSchema,
  flexibility: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  pricePremiumPct: z.number().min(0).max(100),
  adults: z.number().min(1).max(9),
  currency: z.string().length(3),
});

function getFlexDates(
  earliestDeparture: string,
  latestDeparture: string,
  flexibility: number
): string[] {
  const range = flexibility === 2 ? 7 : flexibility === 1 ? 2 : 0;
  const earliest = parseISO(earliestDeparture);
  const latest = parseISO(latestDeparture);
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

// Generate placeholder "link offers" that point to Google Flights searches.
// These appear in the results UI so the user can click through to see live prices.
// Real prices are populated by the background monitor (scripts/monitor.ts).
function buildLinkOffers(
  leg: z.infer<typeof LegSchema>,
  dates: string[],
  currency: string
): FlightOffer[] {
  return dates.map((date, i) => {
    const isIdeal = date >= leg.earliestDeparture && date <= leg.latestDeparture;
    return {
      id: `link-${leg.from}-${leg.to}-${date}`,
      price: 0, // unknown — user clicks through to see live price
      currency,
      itineraries: [{
        segments: [{
          departure: { iataCode: leg.from, cityName: leg.fromCity, countryCode: "", at: `${date}T00:00:00` },
          arrival: { iataCode: leg.to, cityName: leg.toCity, countryCode: "", at: `${date}T00:00:00` },
          carrierCode: "", carrierName: "", flightNumber: "",
          duration: "PT0H0M", durationMinutes: 0,
        }],
        totalDurationMinutes: 0,
        stops: -1, // unknown
      }],
      validatingCarrierCode: "",
      deepLink: buildGoogleFlightsUrl(leg.from, leg.to, date, currency),
      conflictZoneWarnings: [],
      departureDate: date,
      isIdealDate: isIdeal,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.issues }, { status: 400 });
    }

    const params = parsed.data as SearchParams;

    // Build link-based results for each leg (instant — no API call)
    const legResults: LegResult[] = params.legs.map((leg) => {
      const dates = getFlexDates(leg.earliestDeparture, leg.latestDeparture, params.flexibility);
      const offers = buildLinkOffers(leg, dates, params.currency);

      return {
        leg,
        offers,
        cheapestByDate: {},
        absoluteCheapest: 0,
        cheapestOnIdealDates: null,
        pricePremiumForIdeal: null,
      };
    });

    const result: SearchResult = {
      legs: legResults,
      searchedAt: new Date().toISOString(),
      flexibility: params.flexibility,
      currency: params.currency,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
