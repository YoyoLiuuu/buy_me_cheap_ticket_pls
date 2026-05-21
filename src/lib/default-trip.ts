import type { SearchParams } from "@/types";

export const DEFAULT_TRIP: SearchParams = {
  tripType: "multi-leg",
  legs: [
    {
      from: "YYZ",
      to: "ICN",
      fromCity: "Toronto",
      toCity: "Seoul",
      earliestDeparture: "2026-07-03",
      latestDeparture: "2026-07-05",
      earliestDepartureTime: "18:00",
      latestArrivalTime: "08:00",
      maxDurationHours: 20,
    },
    {
      from: "ICN",
      to: "PEK",
      fromCity: "Seoul",
      toCity: "Beijing",
      earliestDeparture: "2026-07-11",
      latestDeparture: "2026-07-12",
      earliestDepartureTime: "18:00",
    },
    {
      from: "PEK",
      to: "YYZ",
      fromCity: "Beijing",
      toCity: "Toronto",
      earliestDeparture: "2026-07-24",
      latestDeparture: "2026-07-26",
      latestArrivalTime: "06:00",
    },
  ],
  filters: {
    avoidConflictZones: true,
    avoidMiddleEast: true,
    customAvoidCountries: [],
    maxLayoverHours: 24,
  },
  flexibility: 1, // balanced — show ±2 days with price comparison
  hardDeadline: {
    legIndex: 2,
    latestArrival: "2026-07-27T08:00:00",
  },
  pricePremiumPct: 15, // willing to pay up to 15% more for ideal dates
  adults: 1,
  currency: "CAD",
  alertThreshold: 10,
  digestEnabled: true,
};
