import type { ConflictZone } from "@/types";

export const CONFLICT_ZONES: ConflictZone[] = [
  // Active wars
  { countryCode: "RU", countryName: "Russia", region: "Eastern Europe", conflictName: "Russia-Ukraine War", severity: "war", isMiddleEast: false },
  { countryCode: "UA", countryName: "Ukraine", region: "Eastern Europe", conflictName: "Russia-Ukraine War", severity: "war", isMiddleEast: false },
  { countryCode: "PS", countryName: "Palestine (Gaza/West Bank)", region: "Middle East", conflictName: "Gaza Conflict", severity: "war", isMiddleEast: true },
  { countryCode: "IL", countryName: "Israel", region: "Middle East", conflictName: "Gaza Conflict", severity: "war", isMiddleEast: true },
  { countryCode: "LB", countryName: "Lebanon", region: "Middle East", conflictName: "Regional Conflict", severity: "conflict", isMiddleEast: true },
  { countryCode: "SD", countryName: "Sudan", region: "Africa", conflictName: "Sudan Civil War", severity: "war", isMiddleEast: false },
  { countryCode: "SS", countryName: "South Sudan", region: "Africa", conflictName: "South Sudan Conflict", severity: "conflict", isMiddleEast: false },
  { countryCode: "YE", countryName: "Yemen", region: "Middle East", conflictName: "Yemen Civil War", severity: "war", isMiddleEast: true },
  { countryCode: "SY", countryName: "Syria", region: "Middle East", conflictName: "Syrian Conflict", severity: "conflict", isMiddleEast: true },
  { countryCode: "MM", countryName: "Myanmar", region: "Southeast Asia", conflictName: "Myanmar Civil War", severity: "war", isMiddleEast: false },
  { countryCode: "AF", countryName: "Afghanistan", region: "South Asia", conflictName: "Taliban Control / Ongoing Instability", severity: "conflict", isMiddleEast: false },
  { countryCode: "IQ", countryName: "Iraq", region: "Middle East", conflictName: "Ongoing Instability", severity: "instability", isMiddleEast: true },
  { countryCode: "LY", countryName: "Libya", region: "Africa / Middle East", conflictName: "Libya Conflict", severity: "conflict", isMiddleEast: false },
  { countryCode: "SO", countryName: "Somalia", region: "Africa", conflictName: "Al-Shabaab Insurgency", severity: "conflict", isMiddleEast: false },
  { countryCode: "ML", countryName: "Mali", region: "Africa", conflictName: "Jihadist Insurgency", severity: "conflict", isMiddleEast: false },
  { countryCode: "BF", countryName: "Burkina Faso", region: "Africa", conflictName: "Jihadist Insurgency", severity: "conflict", isMiddleEast: false },
  { countryCode: "NE", countryName: "Niger", region: "Africa", conflictName: "Political Instability", severity: "instability", isMiddleEast: false },
  { countryCode: "CD", countryName: "DR Congo", region: "Africa", conflictName: "Eastern Congo Conflict", severity: "conflict", isMiddleEast: false },
  { countryCode: "HT", countryName: "Haiti", region: "Caribbean", conflictName: "Gang Violence / State Collapse", severity: "conflict", isMiddleEast: false },
  { countryCode: "IR", countryName: "Iran", region: "Middle East", conflictName: "Regional Tensions / Sanctions", severity: "instability", isMiddleEast: true },
  // Middle East transit hubs (no active conflict, but user may want to avoid)
  { countryCode: "SA", countryName: "Saudi Arabia", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "AE", countryName: "United Arab Emirates", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "QA", countryName: "Qatar", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "KW", countryName: "Kuwait", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "BH", countryName: "Bahrain", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "OM", countryName: "Oman", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "JO", countryName: "Jordan", region: "Middle East", conflictName: "Gulf Region", severity: "instability", isMiddleEast: true },
  { countryCode: "TR", countryName: "Turkey", region: "Middle East / Europe", conflictName: "Regional Tensions", severity: "instability", isMiddleEast: true },
];

export function getActiveConflictZones(): ConflictZone[] {
  return CONFLICT_ZONES.filter((z) => z.severity === "war" || z.severity === "conflict");
}

export function getMiddleEastZones(): ConflictZone[] {
  return CONFLICT_ZONES.filter((z) => z.isMiddleEast);
}

export function getConflictZoneByCountry(countryCode: string): ConflictZone | undefined {
  return CONFLICT_ZONES.find((z) => z.countryCode === countryCode);
}

export function checkLayoverConflicts(
  countryCode: string,
  avoidConflictZones: boolean,
  avoidMiddleEast: boolean,
  customAvoidCountries: string[]
): { flagged: boolean; zone?: ConflictZone } {
  const zone = getConflictZoneByCountry(countryCode);

  if (customAvoidCountries.includes(countryCode)) {
    return { flagged: true, zone };
  }

  if (avoidMiddleEast && zone?.isMiddleEast) {
    return { flagged: true, zone };
  }

  if (avoidConflictZones && zone && (zone.severity === "war" || zone.severity === "conflict")) {
    return { flagged: true, zone };
  }

  return { flagged: false };
}

// IATA airport code → ISO country code for common layover airports
export const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  // Middle East hubs
  DXB: "AE", AUH: "AE", SHJ: "AE", // UAE
  DOH: "QA", // Qatar
  RUH: "SA", JED: "SA", DMM: "SA", // Saudi Arabia
  KWI: "KW", // Kuwait
  BAH: "BH", // Bahrain
  MCT: "OM", // Oman
  AMM: "JO", // Jordan
  BEY: "LB", // Lebanon
  TLV: "IL", // Israel
  IST: "TR", ADB: "TR", SAW: "TR", // Turkey
  THR: "IR", IKA: "IR", // Iran
  BGW: "IQ", BSR: "IQ", // Iraq
  DAM: "SY", // Syria
  CAI: "EG", // Egypt (not in list but common layover)
  // Eastern Europe
  SVO: "RU", DME: "RU", LED: "RU", VKO: "RU", // Russia
  KBP: "UA", LWO: "UA", // Ukraine
  // South/Southeast Asia
  KHI: "PK", LHE: "PK", ISB: "PK", // Pakistan
  KGL: "RW", // Rwanda
  ADD: "ET", // Ethiopia
  NBO: "KE", // Kenya
  // Common Asia hubs (not conflict zones, just for reference)
  ICN: "KR", GMP: "KR", // South Korea
  PEK: "CN", PVG: "CN", CAN: "CN", PKX: "CN", // China
  NRT: "JP", HND: "JP", KIX: "JP", // Japan
  HKG: "HK", // Hong Kong
  SIN: "SG", // Singapore
  BKK: "TH", DMK: "TH", // Thailand
  KUL: "MY", // Malaysia
  MNL: "PH", // Philippines
  TPE: "TW", // Taiwan
  SZX: "CN", TFU: "CN", XMN: "CN", HGH: "CN", // China (more)
  HAN: "VN", SGN: "VN", // Vietnam
  YYZ: "CA", YVR: "CA", YUL: "CA", YYC: "CA", YTZ: "CA", // Canada
  JFK: "US", EWR: "US", LAX: "US", ORD: "US", SFO: "US", SEA: "US",
  DFW: "US", DTW: "US", MSP: "US", ATL: "US", IAH: "US", DEN: "US",
  // IATA metropolitan area codes
  YTO: "CA", SEL: "KR", TYO: "JP", NYC: "US", LON: "GB", BJS: "CN", PAR: "FR", OSA: "JP", STO: "SE", MIL: "IT",
  LHR: "GB", LGW: "GB", MAN: "GB", // UK
  CDG: "FR", ORY: "FR", // France
  FRA: "DE", MUC: "DE", // Germany
  AMS: "NL", // Netherlands
  ZRH: "CH", GVA: "CH", // Switzerland
  VIE: "AT", // Austria
  FCO: "IT", MXP: "IT", // Italy
  MAD: "ES", LIS: "PT", HEL: "FI", CPH: "DK", WAW: "PL",
};
