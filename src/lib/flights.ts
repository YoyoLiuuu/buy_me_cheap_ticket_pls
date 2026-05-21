// Shared flight URL utilities used by both the web app and the scraper.

export function buildGoogleFlightsUrl(
  from: string,
  to: string,
  date: string,
  currency = "CAD"
): string {
  const q = encodeURIComponent(`one way flights from ${from} to ${to} on ${date}`);
  return `https://www.google.com/travel/flights?q=${q}&curr=${currency}&hl=en`;
}
