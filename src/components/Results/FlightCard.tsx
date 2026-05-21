"use client";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import type { FlightOffer } from "@/types";

interface FlightCardProps {
  offer: FlightOffer;
  currency: string;
  cheapestOnIdealDates: number | null;
  absoluteCheapest: number;
  pricePremiumPct: number;
  highlight?: boolean;
}

const SEVERITY_STYLES = {
  war: "text-red-700 bg-red-50 border-red-200",
  conflict: "text-orange-700 bg-orange-50 border-orange-200",
  instability: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

export function FlightCard({
  offer,
  currency,
  cheapestOnIdealDates,
  absoluteCheapest,
  pricePremiumPct,
  highlight,
}: FlightCardProps) {
  const itin = offer.itineraries[0];
  if (!itin) return null;

  // Link-only card (price unknown — user clicks through to Google Flights)
  const isLinkOnly = offer.price === 0;

  const firstSeg = itin.segments[0];
  const lastSeg = itin.segments[itin.segments.length - 1];

  const savings =
    cheapestOnIdealDates !== null && !offer.isIdealDate
      ? cheapestOnIdealDates - offer.price
      : null;

  const extraCost =
    cheapestOnIdealDates !== null && offer.isIdealDate && offer.price > absoluteCheapest
      ? offer.price - absoluteCheapest
      : null;

  const isRecommended =
    offer.isIdealDate &&
    cheapestOnIdealDates !== null &&
    absoluteCheapest !== null &&
    ((cheapestOnIdealDates - absoluteCheapest) / absoluteCheapest) * 100 <= pricePremiumPct;

  const hasWarnings = offer.conflictZoneWarnings.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 transition-shadow hover:shadow-md",
        isRecommended && "border-emerald-400 ring-1 ring-emerald-400",
        highlight && "border-sky-400",
        hasWarnings && !isRecommended && "border-orange-200"
      )}
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {isRecommended && (
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
            Best value on ideal dates
          </span>
        )}
        {!offer.isIdealDate && savings !== null && savings > 0 && (
          <span className="text-xs font-semibold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
            {formatPrice(savings, currency)} cheaper than ideal dates
          </span>
        )}
        {offer.isIdealDate && (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            Ideal date
          </span>
        )}
        {hasWarnings && (
          <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle size={10} />
            Layover warning
          </span>
        )}
      </div>

      {/* Price + route header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          {isLinkOnly ? (
            <div className="text-base font-medium text-slate-500 italic">Price on Google Flights →</div>
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-900">{formatPrice(offer.price, currency)}</div>
              {extraCost !== null && extraCost > 0 && (
                <div className="text-xs text-slate-500 mt-0.5">
                  +{formatPrice(extraCost, currency)} vs cheapest overall
                </div>
              )}
            </>
          )}
        </div>
        <div className="text-right text-sm text-slate-600">
          <div className="font-medium">{format(new Date(offer.departureDate), "EEE, MMM d")}</div>
          <div className="text-slate-400">{offer.validatingCarrierCode}</div>
        </div>
      </div>

      {/* Flight path */}
      <div className="flex items-center gap-2 text-sm mb-3">
        <div className="text-center">
          <div className="font-bold text-slate-900 text-base">{firstSeg.departure.iataCode}</div>
          <div className="text-slate-500">{firstSeg.departure.at.slice(11, 16)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          {!isLinkOnly && <div className="text-xs text-slate-400">{formatDuration(itin.totalDurationMinutes)}</div>}
          <div className="flex items-center w-full gap-1">
            <div className="flex-1 border-t border-dashed border-slate-300" />
            <ArrowRight size={12} className="text-slate-400 shrink-0" />
          </div>
          <div className="text-xs text-slate-400">
            {isLinkOnly ? "see Google Flights" : itin.stops === 0 ? "Direct" : `${itin.stops} stop${itin.stops > 1 ? "s" : ""}`}
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 text-base">{lastSeg.arrival.iataCode}</div>
          <div className="text-slate-500">{lastSeg.arrival.at.slice(11, 16)}</div>
        </div>
      </div>

      {/* Segments detail */}
      {itin.stops > 0 && (
        <div className="bg-slate-50 rounded-lg p-2 mb-3 space-y-1">
          {itin.segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-mono font-medium w-6">{seg.carrierCode}</span>
              <span>{seg.flightNumber}</span>
              <span className="font-medium">{seg.departure.iataCode}</span>
              <ArrowRight size={10} />
              <span className="font-medium">{seg.arrival.iataCode}</span>
              <span className="text-slate-400 ml-auto">{formatDuration(seg.durationMinutes)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Conflict warnings */}
      {hasWarnings && (
        <div className="space-y-1.5 mb-3">
          {offer.conflictZoneWarnings.map((w, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 text-xs rounded-lg px-2.5 py-2 border",
                SEVERITY_STYLES[w.severity]
              )}
            >
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{w.airportCode} ({w.countryName})</span>
                {" — "}{w.conflictName}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book link */}
      <a
        href={offer.deepLink ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-sky-600 hover:text-sky-700 border border-sky-200 rounded-lg py-2 hover:bg-sky-50 transition-colors"
      >
        {isLinkOnly ? "See prices on Google Flights" : "Search on Google Flights"}
        <ExternalLink size={13} />
      </a>
    </div>
  );
}
