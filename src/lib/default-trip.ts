import type { SearchParams } from "@/types";

const BASE_TRIP: SearchParams = {
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

// Once the preset's first departure has passed, slide the whole trip forward so it
// starts ~6 weeks from today, preserving the spacing between legs. (Shifting by whole
// years would eventually push dates past Google Flights' ~11-month booking horizon.)
const DEMO_LEAD_DAYS = 42;
const MS_PER_DAY = 86_400_000;

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setTime(d.getTime() + days * MS_PER_DAY);
  return d.toISOString().slice(0, 10);
}

function withFutureDates(trip: SearchParams): SearchParams {
  const first = trip.legs[0]?.earliestDeparture;
  if (!first) return trip;
  const today = new Date().toISOString().slice(0, 10);
  if (first >= today) return trip;

  const anchor = shiftDays(today, DEMO_LEAD_DAYS);
  const offsetDays = Math.round(
    (new Date(`${anchor}T00:00:00Z`).getTime() - new Date(`${first}T00:00:00Z`).getTime()) / MS_PER_DAY
  );
  return {
    ...trip,
    legs: trip.legs.map((leg) => ({
      ...leg,
      earliestDeparture: shiftDays(leg.earliestDeparture, offsetDays),
      arriveBy: shiftDays(leg.arriveBy, offsetDays),
    })),
  };
}

export const DEFAULT_TRIP: SearchParams = withFutureDates(BASE_TRIP);
