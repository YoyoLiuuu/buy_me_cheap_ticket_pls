"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AirportSearchProps {
  value: string;
  cityValue: string;
  onChange: (iata: string, city: string, country: string) => void;
  placeholder?: string;
  label?: string;
}

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  isCity?: boolean; // metro/city-wide entry covering multiple airports
  airports?: string[]; // constituent IATAs for city entries
}

// City-wide entries appear first when searching a multi-airport city.
// Individual airports follow.
const AIRPORTS: Airport[] = [
  // ── City-wide (metro) entries ────────────────────────────────────────────
  { iata: "YTO", name: "Any Toronto airport", city: "Toronto", country: "Canada", isCity: true, airports: ["YYZ", "YTZ"] },
  { iata: "SEL", name: "Any Seoul airport", city: "Seoul", country: "South Korea", isCity: true, airports: ["ICN", "GMP"] },
  { iata: "TYO", name: "Any Tokyo airport", city: "Tokyo", country: "Japan", isCity: true, airports: ["NRT", "HND"] },
  { iata: "NYC", name: "Any New York airport", city: "New York", country: "USA", isCity: true, airports: ["JFK", "LGA", "EWR"] },
  { iata: "LON", name: "Any London airport", city: "London", country: "UK", isCity: true, airports: ["LHR", "LGW"] },
  { iata: "BJS", name: "Any Beijing airport", city: "Beijing", country: "China", isCity: true, airports: ["PEK", "PKX"] },
  { iata: "PAR", name: "Any Paris airport", city: "Paris", country: "France", isCity: true, airports: ["CDG", "ORY"] },
  { iata: "OSA", name: "Any Osaka airport", city: "Osaka", country: "Japan", isCity: true, airports: ["KIX", "ITM"] },
  { iata: "MIL", name: "Any Milan airport", city: "Milan", country: "Italy", isCity: true, airports: ["MXP", "LIN"] },
  // ── Canada ───────────────────────────────────────────────────────────────
  { iata: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada" },
  { iata: "YTZ", name: "Billy Bishop (downtown)", city: "Toronto", country: "Canada" },
  { iata: "YVR", name: "Vancouver", city: "Vancouver", country: "Canada" },
  { iata: "YUL", name: "Montreal Trudeau", city: "Montreal", country: "Canada" },
  { iata: "YYC", name: "Calgary", city: "Calgary", country: "Canada" },
  // ── USA ──────────────────────────────────────────────────────────────────
  { iata: "JFK", name: "John F. Kennedy", city: "New York", country: "USA" },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "USA" },
  { iata: "EWR", name: "Newark", city: "New York", country: "USA" },
  { iata: "LAX", name: "Los Angeles", city: "Los Angeles", country: "USA" },
  { iata: "ORD", name: "O'Hare", city: "Chicago", country: "USA" },
  { iata: "SFO", name: "San Francisco", city: "San Francisco", country: "USA" },
  { iata: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "USA" },
  // ── South Korea ──────────────────────────────────────────────────────────
  { iata: "ICN", name: "Incheon", city: "Seoul", country: "South Korea" },
  { iata: "GMP", name: "Gimpo (domestic + some intl)", city: "Seoul", country: "South Korea" },
  // ── China ────────────────────────────────────────────────────────────────
  { iata: "PEK", name: "Capital Airport", city: "Beijing", country: "China" },
  { iata: "PKX", name: "Daxing", city: "Beijing", country: "China" },
  { iata: "PVG", name: "Pudong", city: "Shanghai", country: "China" },
  { iata: "SHA", name: "Hongqiao", city: "Shanghai", country: "China" },
  { iata: "CAN", name: "Guangzhou Baiyun", city: "Guangzhou", country: "China" },
  { iata: "CTU", name: "Chengdu Tianfu", city: "Chengdu", country: "China" },
  // ── Japan ────────────────────────────────────────────────────────────────
  { iata: "NRT", name: "Narita", city: "Tokyo", country: "Japan" },
  { iata: "HND", name: "Haneda (closer to city)", city: "Tokyo", country: "Japan" },
  { iata: "KIX", name: "Kansai", city: "Osaka", country: "Japan" },
  { iata: "ITM", name: "Itami (domestic)", city: "Osaka", country: "Japan" },
  // ── Rest of Asia ─────────────────────────────────────────────────────────
  { iata: "HKG", name: "Hong Kong", city: "Hong Kong", country: "Hong Kong" },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore" },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand" },
  { iata: "KUL", name: "KLIA", city: "Kuala Lumpur", country: "Malaysia" },
  { iata: "MNL", name: "Ninoy Aquino", city: "Manila", country: "Philippines" },
  { iata: "TPE", name: "Taoyuan", city: "Taipei", country: "Taiwan" },
  // ── Europe ───────────────────────────────────────────────────────────────
  { iata: "LHR", name: "Heathrow", city: "London", country: "UK" },
  { iata: "LGW", name: "Gatwick", city: "London", country: "UK" },
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
  { iata: "ORY", name: "Orly", city: "Paris", country: "France" },
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany" },
  { iata: "MUC", name: "Munich", city: "Munich", country: "Germany" },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "Netherlands" },
  { iata: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland" },
  { iata: "VIE", name: "Vienna", city: "Vienna", country: "Austria" },
  { iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium" },
  { iata: "FCO", name: "Fiumicino", city: "Rome", country: "Italy" },
  { iata: "MXP", name: "Malpensa", city: "Milan", country: "Italy" },
  { iata: "MAD", name: "Barajas", city: "Madrid", country: "Spain" },
  { iata: "BCN", name: "El Prat", city: "Barcelona", country: "Spain" },
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "Denmark" },
  { iata: "HEL", name: "Helsinki", city: "Helsinki", country: "Finland" },
  { iata: "IST", name: "Istanbul", city: "Istanbul", country: "Turkey" },
  // ── Oceania / South Asia / Middle East ───────────────────────────────────
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "Australia" },
  { iata: "MEL", name: "Tullamarine", city: "Melbourne", country: "Australia" },
  { iata: "BOM", name: "Chhatrapati Shivaji", city: "Mumbai", country: "India" },
  { iata: "DEL", name: "Indira Gandhi", city: "New Delhi", country: "India" },
  { iata: "DXB", name: "Dubai", city: "Dubai", country: "UAE" },
  { iata: "DOH", name: "Hamad", city: "Doha", country: "Qatar" },
];

function displayLabel(airport: Airport): string {
  if (airport.isCity && airport.airports) {
    return `${airport.city} — Any airport (${airport.airports.join(" + ")})`;
  }
  return `${airport.city} (${airport.iata})`;
}

export function AirportSearch({ value, cityValue, onChange, placeholder, label }: AirportSearchProps) {
  const selected = AIRPORTS.find((a) => a.iata === value);
  const [query, setQuery] = useState(selected ? displayLabel(selected) : "");
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<Airport[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (val.length < 1) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const q = val.toLowerCase();
    const matches = AIRPORTS.filter(
      (a) =>
        a.iata.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.airports?.some((code) => code.toLowerCase().includes(q))
    );
    // City-wide entries sort first within matches
    matches.sort((a, b) => (b.isCity ? 1 : 0) - (a.isCity ? 1 : 0));
    setFiltered(matches.slice(0, 9));
    setOpen(matches.length > 0);
  }

  function select(airport: Airport) {
    setQuery(displayLabel(airport));
    setOpen(false);
    onChange(airport.iata, airport.city, airport.country);
  }

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => query.length > 0 && filtered.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "City or airport code"}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 overflow-y-auto">
          {filtered.map((a) => (
            <li
              key={a.iata}
              onMouseDown={() => select(a)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm",
                a.isCity
                  ? "bg-sky-50 hover:bg-sky-100 border-b border-sky-100"
                  : "hover:bg-slate-50",
                value === a.iata && "bg-sky-100"
              )}
            >
              <span
                className={cn(
                  "font-mono font-bold w-10 shrink-0 text-xs",
                  a.isCity ? "text-sky-600" : "text-slate-500"
                )}
              >
                {a.isCity ? "ANY" : a.iata}
              </span>
              <div className="flex-1 min-w-0">
                <div className={cn("truncate", a.isCity ? "text-sky-900 font-medium" : "text-slate-800")}>
                  {a.isCity ? `${a.city} — any airport` : a.name}
                </div>
                {a.isCity && a.airports && (
                  <div className="text-xs text-sky-600 mt-0.5">{a.airports.join(" · ")}</div>
                )}
                {!a.isCity && (
                  <div className="text-xs text-slate-400">{a.city}</div>
                )}
              </div>
              <span className="text-slate-400 text-xs shrink-0">{a.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
