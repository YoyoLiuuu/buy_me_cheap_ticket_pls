"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { FlightCard } from "./FlightCard";
import { PriceCalendar } from "./PriceCalendar";
import { cn, formatPrice } from "@/lib/utils";
import type { LegResult, Flexibility } from "@/types";

interface LegResultsProps {
  legResult: LegResult;
  legIndex: number;
  currency: string;
  flexibility: Flexibility;
  pricePremiumPct: number;
}

export function LegResults({ legResult, legIndex, currency, flexibility, pricePremiumPct }: LegResultsProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "ideal" | "cheapest">("all");

  const { leg, offers, cheapestByDate, absoluteCheapest, cheapestOnIdealDates, pricePremiumForIdeal } = legResult;

  const filtered = offers
    .filter((o) => {
      if (selectedDate) return o.departureDate === selectedDate;
      if (filter === "ideal") return o.isIdealDate;
      return true;
    })
    .sort((a, b) => {
      if (filter === "cheapest" && a.price > 0 && b.price > 0) return a.price - b.price;
      return 0;
    });

  const displayed = showAll ? filtered : filtered.slice(0, 5);
  const hasWarnings = offers.some((o) => o.conflictZoneWarnings.length > 0);

  const idealLabel = `${leg.fromCity} (${leg.from}) → ${leg.toCity} (${leg.to})`;

  return (
    <div className="space-y-4">
      {/* Leg header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{idealLabel}</h3>
          <p className="text-sm text-slate-500">
            {leg.earliestDeparture === leg.arriveBy
              ? `depart ${leg.earliestDeparture}`
              : `depart ${leg.earliestDeparture} · arrive by ${leg.arriveBy}`}
            {flexibility > 0 && " (±extended range)"}
          </p>
        </div>
        {absoluteCheapest > 0 && (
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-slate-900">{formatPrice(absoluteCheapest, currency)}</div>
            <div className="text-xs text-slate-500">from (any date)</div>
          </div>
        )}
      </div>

      {/* Price tradeoff banner */}
      {flexibility > 0 && pricePremiumForIdeal !== null && (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm border",
            pricePremiumForIdeal <= 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : pricePremiumForIdeal / absoluteCheapest <= pricePremiumPct / 100
              ? "bg-sky-50 border-sky-200 text-sky-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}
        >
          {pricePremiumForIdeal <= 0 ? (
            <span>
              <strong>Your ideal dates are also the cheapest!</strong> No compromise needed.
            </span>
          ) : pricePremiumForIdeal / absoluteCheapest <= pricePremiumPct / 100 ? (
            <span>
              Ideal dates cost <strong>{formatPrice(pricePremiumForIdeal, currency)} more</strong> than the cheapest option — within your {pricePremiumPct}% tolerance.
              <strong> Recommendation: stick to your ideal dates.</strong>
            </span>
          ) : (
            <span>
              Ideal dates cost <strong>{formatPrice(pricePremiumForIdeal, currency)} more</strong> (
              {Math.round((pricePremiumForIdeal / absoluteCheapest) * 100)}%) than the cheapest option — above your {pricePremiumPct}% tolerance.
              <strong> You could save by flying on cheaper dates.</strong>
            </span>
          )}
        </div>
      )}

      {/* Calendar (flexible mode) */}
      {flexibility >= 1 && Object.keys(cheapestByDate).length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Price by date — click to filter</h4>
          <PriceCalendar
            cheapestByDate={cheapestByDate}
            leg={leg}
            currency={currency}
            onSelectDate={(d) => setSelectedDate(selectedDate === d ? null : d)}
            selectedDate={selectedDate ?? undefined}
          />
          {selectedDate && (
            <button
              className="mt-2 text-xs text-sky-600 hover:text-sky-700"
              onClick={() => setSelectedDate(null)}
            >
              Clear date filter
            </button>
          )}
        </div>
      )}

      {/* Filter tabs */}
      {!selectedDate && (
        <div className="flex gap-2">
          {(["all", "ideal", "cheapest"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filter === f
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-sky-400"
              )}
            >
              {f === "all" ? "All dates" : f === "ideal" ? "Ideal dates only" : "Cheapest first"}
            </button>
          ))}
          {hasWarnings && (
            <span className="ml-auto flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle size={12} />
              Some flights have layover warnings
            </span>
          )}
        </div>
      )}

      {/* Flight cards */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No flights found for the selected filters.</div>
        ) : (
          displayed.map((offer) => (
            <FlightCard
              key={offer.id + offer.departureDate}
              offer={offer}
              currency={currency}
              cheapestOnIdealDates={cheapestOnIdealDates}
              absoluteCheapest={absoluteCheapest}
              pricePremiumPct={pricePremiumPct}
            />
          ))
        )}
      </div>

      {filtered.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 py-2 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
        >
          {showAll ? (
            <>Show less <ChevronUp size={14} /></>
          ) : (
            <>Show all {filtered.length} options <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
