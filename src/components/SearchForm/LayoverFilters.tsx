"use client";
import { useState } from "react";
import { CONFLICT_ZONES } from "@/lib/conflict-zones";
import { cn } from "@/lib/utils";
import type { SearchFilters } from "@/types";

interface LayoverFiltersProps {
  filters: SearchFilters;
  onChange: (updated: SearchFilters) => void;
}

const SEVERITY_COLORS = {
  war: "bg-red-100 text-red-700 border-red-200",
  conflict: "bg-orange-100 text-orange-700 border-orange-200",
  instability: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export function LayoverFilters({ filters, onChange }: LayoverFiltersProps) {
  const [showCustom, setShowCustom] = useState(false);

  function update(patch: Partial<SearchFilters>) {
    onChange({ ...filters, ...patch });
  }

  function toggleCustomCountry(code: string) {
    const current = filters.customAvoidCountries;
    update({
      customAvoidCountries: current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    });
  }

  const activeConflicts = CONFLICT_ZONES.filter(
    (z) => z.severity === "war" || z.severity === "conflict"
  );
  const middleEastZones = CONFLICT_ZONES.filter((z) => z.isMiddleEast);

  return (
    <div className="space-y-3">
      {/* Conflict zone toggle */}
      <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={filters.avoidConflictZones}
          onChange={(e) => update({ avoidConflictZones: e.target.checked })}
          className="mt-0.5 rounded accent-sky-600"
        />
        <div>
          <span className="text-sm font-medium text-slate-800">Avoid active conflict zones</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Exclude layovers in countries with ongoing wars or major conflicts
            ({activeConflicts.length} countries currently)
          </p>
          {filters.avoidConflictZones && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activeConflicts.map((z) => (
                <span
                  key={z.countryCode}
                  title={z.conflictName}
                  className={cn("text-xs px-1.5 py-0.5 rounded border", SEVERITY_COLORS[z.severity])}
                >
                  {z.countryName}
                </span>
              ))}
            </div>
          )}
        </div>
      </label>

      {/* Middle East toggle */}
      <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={filters.avoidMiddleEast}
          onChange={(e) => update({ avoidMiddleEast: e.target.checked })}
          className="mt-0.5 rounded accent-sky-600"
        />
        <div>
          <span className="text-sm font-medium text-slate-800">Avoid all Middle East layovers</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Includes Gulf hubs like Dubai, Doha, Riyadh, Istanbul — even if not in active conflict
          </p>
          {filters.avoidMiddleEast && (
            <div className="flex flex-wrap gap-1 mt-2">
              {middleEastZones.map((z) => (
                <span
                  key={z.countryCode}
                  className="text-xs px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200"
                >
                  {z.countryName}
                </span>
              ))}
            </div>
          )}
        </div>
      </label>

      {/* Max layover time */}
      <div className="rounded-lg border border-slate-200 p-3">
        <label className="block text-sm font-medium text-slate-800 mb-2">
          Max total trip time (hours)
        </label>
        <input
          type="number"
          min={4}
          max={72}
          value={filters.maxLayoverHours ?? ""}
          placeholder="No limit"
          onChange={(e) =>
            update({ maxLayoverHours: e.target.value ? parseInt(e.target.value) : undefined })
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <p className="text-xs text-slate-500 mt-1">Total time from departure to arrival including all stops</p>
      </div>

      {/* Custom countries */}
      <div className="rounded-lg border border-slate-200 p-3">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
        >
          <span className={cn("transition-transform", showCustom && "rotate-90")}>▶</span>
          Custom country exclusions
          {filters.customAvoidCountries.length > 0 && (
            <span className="ml-1 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
              {filters.customAvoidCountries.length}
            </span>
          )}
        </button>
        {showCustom && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CONFLICT_ZONES.map((z) => {
              const selected = filters.customAvoidCountries.includes(z.countryCode);
              return (
                <button
                  key={z.countryCode}
                  type="button"
                  onClick={() => toggleCustomCountry(z.countryCode)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border transition-colors",
                    selected
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-sky-400"
                  )}
                >
                  {z.countryName}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
