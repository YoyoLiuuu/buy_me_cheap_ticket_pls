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

function parseDurationMinutes(text: string): number {
  const hrMin = text.match(/(\d+)\s*h(?:r|our)?s?\s*(?:(\d+)\s*m(?:in)?)?/i);
  if (hrMin) return parseInt(hrMin[1]) * 60 + parseInt(hrMin[2] ?? "0");
  const minOnly = text.match(/(\d+)\s*min/i);
  if (minOnly) return parseInt(minOnly[1]);
  return 0;
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

function parseAriaLabel(
  label: string,
  departureDate: string,
): Partial<RawFlightData> | null {
  if (!label || label.length < 20) return null;

  const priceMatch = label.match(/[\$C]?\s?[\$]?\s?(\d[\d,]+)\s*(?:Canadian|CAD|USD|dollars?)?/i);
  const price = priceMatch ? parsePrice(priceMatch[0]) : null;

  const timeMatches = label.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi) ?? [];
  const departureTime = timeMatches[0] ? `${departureDate}T${parseTime(timeMatches[0])}:00` : "";
  const arrivalTime = timeMatches[1] ? `${departureDate}T${parseTime(timeMatches[1])}:00` : "";

  const durationMatch = label.match(/(\d+)\s*hr?\s*(?:(\d+)\s*min?)?/i);
  const durationMinutes = durationMatch
    ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2] ?? "0")
    : 0;

  const stopMatch = label.match(/(\d+)\s*stop/i);
  const nonstopMatch = /nonstop|non-stop|direct/i.test(label);
  const stops = nonstopMatch ? 0 : stopMatch ? parseInt(stopMatch[1]) : 0;

  const layoverMatch = label.match(/(?:stop|via|layover)\s+in\s+([A-Z]{3})/gi) ?? [];
  const layoverCodes = layoverMatch
    .map((m) => m.match(/([A-Z]{3})$/)?.[1] ?? "")
    .filter(Boolean);

  const airlineMatch = label.match(/^([^.]+?)\./);
  const airline = airlineMatch ? airlineMatch[1].trim() : "";
  const carrierCode = getCarrierCodeFromName(airline);

  if (!price || durationMinutes === 0) return null;

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

    const listItems = document.querySelectorAll("ul li[jsname], ul li[data-id]");
    listItems.forEach((li) => {
      const label = li.getAttribute("aria-label") || li.querySelector("[aria-label]")?.getAttribute("aria-label") || "";
      const priceEl = li.querySelector("[data-iata-price], .FpEdX, [jsname='FpEdX']") as HTMLElement | null;
      const linkEl = li.querySelector("a[href*='flights']") as HTMLAnchorElement | null;
      if (label.length > 30) {
        results.push({ ariaLabel: label, priceText: priceEl?.textContent?.trim() ?? "", deepLink: linkEl?.href ?? params.url });
      }
    });

    if (results.length === 0) {
      document.querySelectorAll("[role='listitem']").forEach((el) => {
        const label = el.getAttribute("aria-label") || "";
        if (label.length > 30 && /\$|CAD|USD/.test(label)) {
          results.push({ ariaLabel: label, priceText: "", deepLink: params.url });
        }
      });
    }

    if (results.length === 0) {
      document.querySelectorAll("[data-price], [jsdata*='price']").forEach((el) => {
        const parent = el.closest("li, [role='listitem']");
        if (parent) {
          const label = parent.getAttribute("aria-label") || parent.textContent?.trim().slice(0, 200) || "";
          results.push({ ariaLabel: label, priceText: el.textContent?.trim() ?? "", deepLink: params.url });
        }
      });
    }

    return results;
  }, { url });

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
    for (const code of layoverCodes) {
      const countryCode = code.startsWith("INFERRED_")
        ? code.replace("INFERRED_", "")
        : (AIRPORT_COUNTRY_MAP[code] ?? "??");
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

    const departHHMM = (parsed.departureTime ?? "").slice(11, 16);
    let withinWindow = true;
    if (leg.earliestDepartureTime && departHHMM < leg.earliestDepartureTime) withinWindow = false;
    if (leg.latestDepartureTime && departHHMM > leg.latestDepartureTime) withinWindow = false;

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
      flightNumber: `${parsed.carrierCode ?? ""}???`,
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
      price: withinWindow ? price : price * 999,
      currency,
      itineraries: [itinerary],
      validatingCarrierCode: parsed.carrierCode ?? "",
      deepLink: deepLink || buildGoogleFlightsUrl(leg.fromCity || leg.from, leg.toCity || leg.to, date, currency),
      conflictZoneWarnings: warnings,
      departureDate: date,
      isIdealDate: date >= leg.earliestDeparture && date <= leg.arriveBy,
    });
  }

  return offers.filter((o) => o.price < 999999).sort((a, b) => a.price - b.price);
}
