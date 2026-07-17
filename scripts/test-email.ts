// Send a real digest email through the actual email.ts code path to verify Resend works.
// Usage: npx tsx scripts/test-email.ts you@example.com
import "dotenv/config";
import { sendDailyDigest } from "../src/lib/email.js";
import type { LegResult } from "../src/types/index.js";

const to = process.argv[2] ?? "liuyimeng01@gmail.com";

const sampleLeg: LegResult = {
  leg: {
    from: "YYZ", to: "ICN", fromCity: "Toronto", toCity: "Seoul",
    earliestDeparture: "2026-08-20", arriveBy: "2026-08-20",
  },
  offers: [{
    id: "test-1", price: 564, currency: "CAD",
    itineraries: [{
      segments: [{
        departure: { iataCode: "YYZ", cityName: "Toronto", countryCode: "CA", at: "2026-08-20T09:00:00" },
        arrival: { iataCode: "ICN", cityName: "Seoul", countryCode: "KR", at: "2026-08-21T18:45:00" },
        carrierCode: "WS", carrierName: "WestJet", flightNumber: "",
        duration: "PT20H45M", durationMinutes: 1245,
      }],
      totalDurationMinutes: 1245, stops: 1,
    }],
    validatingCarrierCode: "WS", conflictZoneWarnings: [],
    departureDate: "2026-08-20", isIdealDate: true,
  }],
  cheapestByDate: { "2026-08-20": 564 },
  absoluteCheapest: 564,
  cheapestOnIdealDates: 564,
  pricePremiumForIdeal: 0,
};

async function main() {
  console.log(`FROM: ${process.env.EMAIL_FROM}`);
  console.log(`Sending test digest to: ${to} …`);
  const res = await sendDailyDigest({
    email: to, token: "test-token-123", legResults: [sampleLeg], currency: "CAD",
  });
  console.log("Resend response:", JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error("SEND FAILED:", e); process.exit(1); });
