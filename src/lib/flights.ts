// Shared flight URL utilities used by both the web app and the scraper.

// IATA metropolitan area codes → constituent airport codes.
// These are official IATA city codes (not airport codes).
export const METRO_AIRPORTS: Record<string, string[]> = {
  YTO: ["YYZ", "YTZ"],       // Toronto
  SEL: ["ICN", "GMP"],       // Seoul
  TYO: ["NRT", "HND"],       // Tokyo
  NYC: ["JFK", "LGA", "EWR"], // New York
  LON: ["LHR", "LGW"],       // London
  BJS: ["PEK", "PKX"],       // Beijing
  PAR: ["CDG", "ORY"],       // Paris
  OSA: ["KIX", "ITM"],       // Osaka
  STO: ["ARN", "BMA"],       // Stockholm
  MIL: ["MXP", "LIN"],       // Milan
};

export function isMetroCode(code: string): boolean {
  return code in METRO_AIRPORTS;
}

// Returns individual IATA airport codes. Metro codes expand; airport codes pass through.
export function expandAirports(code: string): string[] {
  return METRO_AIRPORTS[code] ?? [code];
}

export function buildGoogleFlightsUrl(
  from: string,
  to: string,
  date: string,
  currency = "CAD"
): string {
  const q = encodeURIComponent(`one way flights from ${from} to ${to} on ${date}`);
  return `https://www.google.com/travel/flights?q=${q}&curr=${currency}&hl=en`;
}
