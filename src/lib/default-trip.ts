import type { SearchParams } from "@/types";

export const DEFAULT_TRIP: SearchParams = {
  tripType: "multi-leg",
  legs: [
    {
      from: "YTO",
      to: "SEL",
      fromCity: "Toronto",
      toCity: "Seoul",
      earliestDeparture: "2026-07-03",
      arriveBy: "2026-07-06",        // ~14hr flight; depart Jul 3–5, arrive by Jul 6
      earliestDepartureTime: "18:00",
      maxDurationHours: 20,
    },
    {
      from: "SEL",
      to: "BJS",
      fromCity: "Seoul",
      toCity: "Beijing",
      earliestDeparture: "2026-07-11",
      arriveBy: "2026-07-13",        // ~2hr flight; depart Jul 11–12, arrive by Jul 13
      earliestDepartureTime: "18:00",
    },
    {
      from: "BJS",
      to: "YTO",
      fromCity: "Beijing",
      toCity: "Toronto",
      earliestDeparture: "2026-07-24",
      arriveBy: "2026-07-27",        // ~13hr flight; depart Jul 24–26, arrive by Jul 27
    },
  ],
  filters: {
    avoidConflictZones: true,
    avoidMiddleEast: true,
    customAvoidCountries: [],
    maxLayoverHours: 24,
  },
  flexibility: 1,
  pricePremiumPct: 15,
  adults: 1,
  currency: "CAD",
  alertThreshold: 10,
  digestEnabled: true,
};
