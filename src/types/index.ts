export type TripType = "one-way" | "round-trip" | "multi-leg";
export type Flexibility = 0 | 1 | 2; // strict | balanced (±2d) | flexible (±7d)

export interface LegParams {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  earliestDeparture: string; // YYYY-MM-DD
  arriveBy: string;
  earliestDepartureTime?: string; // HH:MM
  latestDepartureTime?: string;
  earliestArrivalTime?: string;
  latestArrivalTime?: string;
  maxDurationHours?: number;
}

export interface SearchFilters {
  avoidConflictZones: boolean;
  avoidMiddleEast: boolean;
  customAvoidCountries: string[]; // ISO country codes
  maxLayoverHours?: number;
}

export interface SearchParams {
  tripType: TripType;
  legs: LegParams[];
  filters: SearchFilters;
  flexibility: Flexibility;
  hardDeadline?: {
    legIndex: number;
    latestArrival: string; // ISO datetime
  };
  pricePremiumPct: number; // how much more % user will pay for ideal dates
  adults: number;
  currency: string;
  email?: string;
  alertThreshold?: number; // % drop to trigger alert
  digestEnabled?: boolean;
}

export interface FlightSegment {
  departure: {
    iataCode: string;
    cityName: string;
    countryCode: string;
    at: string; // ISO datetime
  };
  arrival: {
    iataCode: string;
    cityName: string;
    countryCode: string;
    at: string;
  };
  carrierCode: string;
  carrierName: string;
  flightNumber: string;
  duration: string; // PT2H30M format
  durationMinutes: number;
}

export interface FlightItinerary {
  segments: FlightSegment[];
  totalDurationMinutes: number;
  stops: number;
}

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  itineraries: FlightItinerary[];
  validatingCarrierCode: string;
  deepLink?: string;
  conflictZoneWarnings: ConflictZoneWarning[];
  departureDate: string; // actual date of first segment
  isIdealDate: boolean; // matches user's preferred date range
  priceDiffFromIdeal?: number; // $ more/less than cheapest ideal-date price
}

export interface ConflictZoneWarning {
  airportCode: string;
  countryCode: string;
  countryName: string;
  conflictName: string;
  severity: "war" | "conflict" | "instability";
}

export interface SearchResult {
  legs: LegResult[];
  searchedAt: string;
  flexibility: Flexibility;
  currency: string;
}

export interface LegResult {
  leg: LegParams;
  offers: FlightOffer[];
  cheapestByDate: Record<string, number>; // date -> cheapest price (for calendar)
  absoluteCheapest: number;
  cheapestOnIdealDates: number | null;
  pricePremiumForIdeal: number | null; // extra $ to fly on ideal dates
}

export interface AirportOption {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
}

export interface ConflictZone {
  countryCode: string;
  countryName: string;
  region: string;
  conflictName: string;
  severity: "war" | "conflict" | "instability";
  isMiddleEast: boolean;
}
