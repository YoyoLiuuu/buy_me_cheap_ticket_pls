import type { SearchParams } from "@/types";

export const DEFAULT_TRIP: SearchParams = {
  tripType: "multi-leg",
  legs: [
    {
      from: "YYZ",
      to: "ICN",
      fromCity: "Toronto",
      toCity: "Seoul",
      earliestDeparture: "2025-07-03",
      latestDeparture: "2025-07-05",
      earliestDepartureTime: "18:00", // okay with evening July 3
      latestArrivalTime: "08:00",     // must arrive before morning July 6
      maxDurationHours: 20,
    },
    {
      from: "ICN",
      to: "PEK",
      fromCity: "Seoul",
      toCity: "Beijing",
      earliestDeparture: "2025-07-11",
      latestDeparture: "2025-07-12",
      earliestDepartureTime: "18:00", // evening/night July 11 or anytime July 12
    },
    {
      from: "PEK",
      to: "YYZ",
      fromCity: "Beijing",
      toCity: "Toronto",
      earliestDeparture: "2025-07-24",
      latestDeparture: "2025-07-26",
      latestArrivalTime: "06:00", // must land by early morning July 27
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
    latestArrival: "2025-07-27T08:00:00",
  },
  pricePremiumPct: 15, // willing to pay up to 15% more for ideal dates
  adults: 1,
  currency: "CAD",
  alertThreshold: 10,
  digestEnabled: true,
};
