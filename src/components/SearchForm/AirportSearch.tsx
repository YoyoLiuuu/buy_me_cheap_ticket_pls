"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

interface AirportSearchProps {
  value: string;
  cityValue: string;
  onChange: (iata: string, city: string, country: string) => void;
  placeholder?: string;
  label?: string;
}

// Top airports list for autocomplete — city names + IATA
const AIRPORTS: Airport[] = [
  { iata: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada" },
  { iata: "YVR", name: "Vancouver", city: "Vancouver", country: "Canada" },
  { iata: "YUL", name: "Montreal Trudeau", city: "Montreal", country: "Canada" },
  { iata: "YYC", name: "Calgary", city: "Calgary", country: "Canada" },
  { iata: "JFK", name: "John F. Kennedy", city: "New York", country: "USA" },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "USA" },
  { iata: "EWR", name: "Newark", city: "New York", country: "USA" },
  { iata: "LAX", name: "Los Angeles", city: "Los Angeles", country: "USA" },
  { iata: "ORD", name: "O'Hare", city: "Chicago", country: "USA" },
  { iata: "SFO", name: "San Francisco", city: "San Francisco", country: "USA" },
  { iata: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "USA" },
  { iata: "ICN", name: "Incheon", city: "Seoul", country: "South Korea" },
  { iata: "GMP", name: "Gimpo", city: "Seoul", country: "South Korea" },
  { iata: "PEK", name: "Capital Airport", city: "Beijing", country: "China" },
  { iata: "PKX", name: "Daxing", city: "Beijing", country: "China" },
  { iata: "PVG", name: "Pudong", city: "Shanghai", country: "China" },
  { iata: "SHA", name: "Hongqiao", city: "Shanghai", country: "China" },
  { iata: "CAN", name: "Guangzhou Baiyun", city: "Guangzhou", country: "China" },
  { iata: "CTU", name: "Chengdu Tianfu", city: "Chengdu", country: "China" },
  { iata: "NRT", name: "Narita", city: "Tokyo", country: "Japan" },
  { iata: "HND", name: "Haneda", city: "Tokyo", country: "Japan" },
  { iata: "KIX", name: "Kansai", city: "Osaka", country: "Japan" },
  { iata: "HKG", name: "Hong Kong", city: "Hong Kong", country: "Hong Kong" },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore" },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand" },
  { iata: "KUL", name: "KLIA", city: "Kuala Lumpur", country: "Malaysia" },
  { iata: "MNL", name: "Ninoy Aquino", city: "Manila", country: "Philippines" },
  { iata: "TPE", name: "Taoyuan", city: "Taipei", country: "Taiwan" },
  { iata: "LHR", name: "Heathrow", city: "London", country: "UK" },
  { iata: "LGW", name: "Gatwick", city: "London", country: "UK" },
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany" },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "Netherlands" },
  { iata: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland" },
  { iata: "FCO", name: "Fiumicino", city: "Rome", country: "Italy" },
  { iata: "MXP", name: "Malpensa", city: "Milan", country: "Italy" },
  { iata: "MAD", name: "Barajas", city: "Madrid", country: "Spain" },
  { iata: "BCN", name: "El Prat", city: "Barcelona", country: "Spain" },
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "Australia" },
  { iata: "MEL", name: "Tullamarine", city: "Melbourne", country: "Australia" },
  { iata: "BOM", name: "Chhatrapati Shivaji", city: "Mumbai", country: "India" },
  { iata: "DEL", name: "Indira Gandhi", city: "New Delhi", country: "India" },
  { iata: "DXB", name: "Dubai", city: "Dubai", country: "UAE" },
  { iata: "DOH", name: "Hamad", city: "Doha", country: "Qatar" },
  { iata: "IST", name: "Istanbul", city: "Istanbul", country: "Turkey" },
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "Denmark" },
  { iata: "HEL", name: "Helsinki", city: "Helsinki", country: "Finland" },
  { iata: "VIE", name: "Vienna", city: "Vienna", country: "Austria" },
  { iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium" },
  { iata: "MUC", name: "Munich", city: "Munich", country: "Germany" },
];

export function AirportSearch({ value, cityValue, onChange, placeholder, label }: AirportSearchProps) {
  const [query, setQuery] = useState(value ? `${cityValue} (${value})` : "");
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
        a.country.toLowerCase().includes(q)
    ).slice(0, 8);
    setFiltered(matches);
    setOpen(matches.length > 0);
  }

  function select(airport: Airport) {
    setQuery(`${airport.city} (${airport.iata})`);
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
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
          {filtered.map((a) => (
            <li
              key={a.iata}
              onMouseDown={() => select(a)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-sky-50 text-sm",
                value === a.iata && "bg-sky-50"
              )}
            >
              <span className="font-mono font-bold text-sky-700 w-10 shrink-0">{a.iata}</span>
              <span className="text-slate-800">{a.city}</span>
              <span className="text-slate-400 text-xs ml-auto">{a.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
