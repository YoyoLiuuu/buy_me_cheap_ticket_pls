// Core scraping logic — used by both the web API and scripts/monitor.ts.
// Imports use @/ aliases (Next.js) so this file lives under src/.

import type { Page } from "playwright-core";
import type {
  FlightOffer, FlightSegment, FlightItinerary,
  ConflictZoneWarning, LegParams, SearchFilters,
} from "@/types";
import { AIRPORT_COUNTRY_MAP, checkLayoverConflicts } from "@/lib/conflict-zones";
import { buildGoogleFlightsUrl } from "@/lib/flights";

// ── Carrier → home hub country (for inferring layover regions) ───────────────
const CARRIER_HUB: Record<string, string> = {
  EK: "AE", QR: "QA", EY: "AE", FZ: "AE", G9: "AE", WY: "OM", GF: "BH",
  TK: "TR", TF: "TR", PC: "TR",
  RJ: "JO", ME: "LB", SV: "SA", WB: "SA", HZ: "SA",
  IR: "IR", EP: "IR",
  IA: "IQ",
  RB: "SY",
  SU: "RU", DP: "RU", N4: "RU", U6: "RU",
  PS: "UA", QU: "UA",
  AC: "CA", WS: "CA", TS: "CA",
  AA: "US", UA: "US", DL: "US", AS: "US", B6: "US", NK: "US", F9: "US",
  KE: "KR", OZ: "KR", ZE: "KR",
  CA: "CN", MU: "CN", CZ: "CN", FM: "CN", ZH: "CN", "3U": "CN", HU: "CN", GS: "CN",
  NH: "JP", JL: "JP", MM: "JP", GK: "JP",
  CX: "HK", HX: "HK", UO: "HK",
  SQ: "SG", TR: "SG", MI: "SG",
  TG: "TH", WE: "TH", FD: "TH",
  MH: "MY", AK: "MY", OD: "MY",
  PR: "PH", Z2: "PH",
  CI: "TW", BR: "TW",
  LH: "DE", LX: "CH", OS: "AT", SK: "SE", AY: "FI", DY: "NO", KL: "NL",
  AF: "FR", BA: "GB", IB: "ES", AZ: "IT", SN: "BE",
  EI: "IE", U2: "GB", FR: "IE", VY: "ES", W6: "HU",
  QF: "AU", VA: "AU", JQ: "AU",
  AI: "IN", "6E": "IN", SG: "IN",
};

function inferLayoverCountry(carrierCode: string): string | null {
  return CARRIER_HUB[carrierCode] ?? null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) || n <= 0 ? null : n;
}

function parseTime(text: string): string {
  const m12 = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const min = m12[2];
    const ampm = m12[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }
  const m24 = text.match(/(\d{1,2}):(\d{2})/);
  if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}`;
  return text;
}

const MONTH_NUM: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Google labels give the arrival date as "Tuesday, August 11" with no year.
// Anchor it to the departure date; if it lands earlier in the calendar, it wrapped a year.
function resolveArrivalDate(monthName: string, day: number, departureDate: string): string {
  const month = MONTH_NUM[monthName.toLowerCase()];
  if (!month) return departureDate;
  const [depYear, depMonth, depDay] = departureDate.split("-").map(Number);
  const year =
    month < depMonth || (month === depMonth && day < depDay) ? depYear + 1 : depYear;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// City/airport keywords → IATA code, for layovers named in aria-labels
// ("… layover at Calgary International Airport in Calgary").
const CITY_IATA: Record<string, string> = {
  Istanbul: "IST", Dubai: "DXB", "Abu Dhabi": "AUH", Doha: "DOH", Jeddah: "JED",
  Riyadh: "RUH", Cairo: "CAI", Amman: "AMM", Beirut: "BEY", "Tel Aviv": "TLV",
  Moscow: "SVO", "Addis Ababa": "ADD", Nairobi: "NBO",
  Calgary: "YYC", Vancouver: "YVR", Montreal: "YUL", Montréal: "YUL", Toronto: "YYZ",
  Dallas: "DFW", Chicago: "ORD", "San Francisco": "SFO", "Los Angeles": "LAX",
  Seattle: "SEA", "New York": "JFK", Newark: "EWR", Detroit: "DTW",
  Minneapolis: "MSP", Atlanta: "ATL", Houston: "IAH", Denver: "DEN",
  Incheon: "ICN", Seoul: "ICN", Gimpo: "GMP", Narita: "NRT", Haneda: "HND",
  Tokyo: "NRT", Osaka: "KIX", Kansai: "KIX",
  Beijing: "PEK", Daxing: "PKX", Shanghai: "PVG", Guangzhou: "CAN", Shenzhen: "SZX",
  Chengdu: "TFU", Xiamen: "XMN", Hangzhou: "HGH",
  "Hong Kong": "HKG", Taipei: "TPE", Taoyuan: "TPE", Singapore: "SIN",
  Bangkok: "BKK", "Kuala Lumpur": "KUL", Manila: "MNL", Hanoi: "HAN", "Ho Chi Minh": "SGN",
  London: "LHR", Heathrow: "LHR", Gatwick: "LGW", Paris: "CDG", Frankfurt: "FRA",
  Munich: "MUC", Amsterdam: "AMS", Zurich: "ZRH", Zürich: "ZRH", Vienna: "VIE",
  Rome: "FCO", Madrid: "MAD", Lisbon: "LIS", Helsinki: "HEL", Copenhagen: "CPH", Warsaw: "WAW",
};

function layoverNameToIata(name: string): string {
  for (const [keyword, code] of Object.entries(CITY_IATA)) {
    if (name.toLowerCase().includes(keyword.toLowerCase())) return code;
  }
  return "";
}

interface RawFlightData {
  price: number;
  airline: string;
  carrierCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  layoverCodes: string[];
  deepLink: string;
}

// Parses Google Flights result aria-labels, which read like:
// "From 623 Canadian dollars. 1 stop flight with WestJet. Leaves Toronto Pearson
//  International Airport at 10:00 AM on Monday, August 10 and arrives at Incheon
//  International Airport at 6:45 PM on Tuesday, August 11. Total duration 19 hr 45 min.
//  Layover (1 of 1) is a 3 hr 40 min layover at Calgary International Airport in Calgary."
function parseAriaLabel(
  label: string,
  departureDate: string,
): Partial<RawFlightData> | null {
  if (!label) return null;

  const priceMatch = label.match(/From ([\d,]+) (?:Canadian |US |Australian )?dollars/i)
    ?? label.match(/From ([\d,]+) (?:euros|pounds)/i);
  const price = priceMatch ? parsePrice(priceMatch[1]) : null;
  if (!price) return null;

  const stops = /\bnonstop\b/i.test(label)
    ? 0
    : parseInt(label.match(/(\d+) stops? flight/i)?.[1] ?? "0", 10);

  const airlineMatch = label.match(/flights? with ([^.]+)\./i);
  const airline = airlineMatch ? airlineMatch[1].trim() : "";
  const carrierCode = getCarrierCodeFromName(airline);

  const depMatch = label.match(/Leaves .+? at (\d{1,2}:\d{2}\s*[AP]M) on/i);
  const departureTime = depMatch ? `${departureDate}T${parseTime(depMatch[1])}:00` : "";

  const arrMatch = label.match(
    /arrives at .+? at (\d{1,2}:\d{2}\s*[AP]M) on\s+\w+,\s+([A-Za-z]+) (\d{1,2})/i
  );
  const arrivalTime = arrMatch
    ? `${resolveArrivalDate(arrMatch[2], parseInt(arrMatch[3], 10), departureDate)}T${parseTime(arrMatch[1])}:00`
    : "";

  const durMatch = label.match(/Total duration (?:(\d+) hr)?\s*(?:(\d+) min)?/i);
  const durationMinutes = durMatch
    ? parseInt(durMatch[1] ?? "0", 10) * 60 + parseInt(durMatch[2] ?? "0", 10)
    : 0;
  if (durationMinutes === 0) return null;

  const layoverCodes = [...label.matchAll(/layover at ([^.]+?)\./gi)]
    .map((m) => layoverNameToIata(m[1]))
    .filter(Boolean);

  return { price, airline, carrierCode, departureTime, arrivalTime, durationMinutes, stops, layoverCodes };
}

function getCarrierCodeFromName(name: string): string {
  const map: Record<string, string> = {
    "Air Canada": "AC", "WestJet": "WS", "Transat": "TS",
    "Korean Air": "KE", "Asiana": "OZ", "Jeju Air": "ZE",
    "Air China": "CA", "China Eastern": "MU", "China Southern": "CZ",
    "ANA": "NH", "Japan Airlines": "JL", "JAL": "JL",
    "Cathay Pacific": "CX", "Singapore Airlines": "SQ",
    "Emirates": "EK", "Qatar Airways": "QR", "Etihad": "EY",
    "Turkish": "TK",
    "Lufthansa": "LH", "Air France": "AF", "British Airways": "BA",
    "United": "UA", "American": "AA", "Delta": "DL",
    "EVA": "BR", "China Airlines": "CI", "Hainan": "HU", "Xiamen": "MF",
    "Zipair": "ZG", "Air Premia": "YP", "Philippine": "PR", "Vietnam Airlines": "VN",
  };
  for (const [name_, code] of Object.entries(map)) {
    if (name.toLowerCase().includes(name_.toLowerCase())) return code;
  }
  return "";
}

export async function scrapeFlightsForDate(
  page: Page,
  leg: LegParams,
  date: string,
  currency: string,
  filters: SearchFilters
): Promise<FlightOffer[]> {
  const url = buildGoogleFlightsUrl(
    leg.fromCity || leg.from,
    leg.toCity || leg.to,
    date,
    currency
  );

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  const listSelectors = ["ul.Rk10dc", "[jsname='TBqc4c']", "div[role='list']", ".gws-flights__result-list"];
  for (const sel of listSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      break;
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(1000 + Math.random() * 1500);

  const rawData = await page.evaluate((params) => {
    const results: { ariaLabel: string; priceText: string; deepLink: string }[] = [];
    const seen = new Set<string>();

    // Result rows live in ul.Rk10dc ("Top flights" and "Other flights" lists).
    // The full flight summary is the aria-label of a child element, starting "From <price> …".
    // Note: no named inner functions here — tsx/esbuild would inject a __name helper
    // that doesn't exist inside the browser page.
    let items = Array.from(document.querySelectorAll("ul.Rk10dc > li"));
    if (items.length === 0) {
      items = Array.from(document.querySelectorAll("ul li[jsname], ul li[data-id], [role='listitem']"));
    }
    for (const li of items) {
      let best = "";
      for (const el of Array.from(li.querySelectorAll("[aria-label]"))) {
        const l = el.getAttribute("aria-label") ?? "";
        if (l.startsWith("From ") && l.length > best.length) best = l;
      }
      if (best && !seen.has(best)) {
        seen.add(best);
        const linkEl = li.querySelector("a[href*='flights']") as HTMLAnchorElement | null;
        results.push({ ariaLabel: best, priceText: "", deepLink: linkEl?.href ?? params.url });
      }
    }

    return results;
  }, { url });

  if (rawData.length === 0) {
    // Distinguish "no flights that day" from Google serving a consent/bot page
    // (shows up in Vercel function logs / GitHub Actions output).
    const title = await page.title().catch(() => "?");
    const finalUrl = page.url();
    console.warn(
      `[scrape] 0 results for ${leg.from}→${leg.to} ${date} — page title: "${title}"` +
      (finalUrl !== url ? ` (redirected to ${finalUrl.slice(0, 120)})` : "")
    );
  }

  const offers: FlightOffer[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const { ariaLabel, priceText, deepLink } = rawData[i];
    const parsed = parseAriaLabel(ariaLabel, date);
    if (!parsed) continue;

    const price = parsed.price ?? parsePrice(priceText) ?? 0;
    if (price <= 0) continue;

    let layoverCodes = parsed.layoverCodes ?? [];
    if (parsed.stops! > 0 && layoverCodes.length === 0 && parsed.carrierCode) {
      const inferred = inferLayoverCountry(parsed.carrierCode);
      if (inferred) layoverCodes = [`INFERRED_${inferred}`];
    }

    const warnings: ConflictZoneWarning[] = [];
    let excludedByCustom = false;
    for (const code of layoverCodes) {
      const countryCode = code.startsWith("INFERRED_")
        ? code.replace("INFERRED_", "")
        : (AIRPORT_COUNTRY_MAP[code] ?? "??");

      // Custom country exclusions are a hard filter: drop the whole offer,
      // vs. the conflict-zone toggles below which only annotate with warnings.
      if (filters.customAvoidCountries.includes(countryCode)) {
        excludedByCustom = true;
        break;
      }

      const result = checkLayoverConflicts(
        countryCode,
        filters.avoidConflictZones,
        filters.avoidMiddleEast,
        filters.customAvoidCountries
      );
      if (result.flagged && result.zone) {
        warnings.push({
          airportCode: code.startsWith("INFERRED_") ? `${parsed.carrierCode} hub` : code,
          countryCode,
          countryName: result.zone.countryName,
          conflictName: result.zone.conflictName,
          severity: result.zone.severity,
        });
      }
    }
    if (excludedByCustom) continue;

    const departHHMM = (parsed.departureTime ?? "").slice(11, 16);
    if (leg.earliestDepartureTime && departHHMM && departHHMM < leg.earliestDepartureTime) continue;
    if (leg.latestDepartureTime && departHHMM && departHHMM > leg.latestDepartureTime) continue;

    const segment: FlightSegment = {
      departure: {
        iataCode: leg.from,
        cityName: leg.fromCity,
        countryCode: AIRPORT_COUNTRY_MAP[leg.from] ?? "??",
        at: parsed.departureTime ?? `${date}T00:00:00`,
      },
      arrival: {
        iataCode: leg.to,
        cityName: leg.toCity,
        countryCode: AIRPORT_COUNTRY_MAP[leg.to] ?? "??",
        at: parsed.arrivalTime ?? `${date}T00:00:00`,
      },
      carrierCode: parsed.carrierCode ?? "",
      carrierName: parsed.airline ?? "",
      flightNumber: "",
      duration: `PT${Math.floor((parsed.durationMinutes ?? 0) / 60)}H${(parsed.durationMinutes ?? 0) % 60}M`,
      durationMinutes: parsed.durationMinutes ?? 0,
    };

    const itinerary: FlightItinerary = {
      segments: [segment],
      totalDurationMinutes: parsed.durationMinutes ?? 0,
      stops: parsed.stops ?? 0,
    };

    offers.push({
      id: `${date}-${leg.from}-${leg.to}-${i}`,
      price,
      currency,
      itineraries: [itinerary],
      validatingCarrierCode: parsed.carrierCode ?? "",
      deepLink: deepLink || buildGoogleFlightsUrl(leg.fromCity || leg.from, leg.toCity || leg.to, date, currency),
      conflictZoneWarnings: warnings,
      departureDate: date,
      isIdealDate: date >= leg.earliestDeparture && date <= leg.arriveBy,
    });
  }

  return offers.sort((a, b) => a.price - b.price);
}
