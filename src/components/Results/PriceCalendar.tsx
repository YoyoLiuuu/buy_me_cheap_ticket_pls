"use client";
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { cn, formatPrice } from "@/lib/utils";
import type { LegParams } from "@/types";

interface PriceCalendarProps {
  cheapestByDate: Record<string, number>;
  leg: LegParams;
  currency: string;
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
}

export function PriceCalendar({ cheapestByDate, leg, currency, onSelectDate, selectedDate }: PriceCalendarProps) {
  const dates = Object.keys(cheapestByDate).sort();
  if (dates.length === 0) return null;

  const prices = Object.values(cheapestByDate);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  function getPriceColor(price: number): string {
    if (priceRange === 0) return "bg-emerald-100 text-emerald-800";
    const ratio = (price - minPrice) / priceRange;
    if (ratio <= 0.25) return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
    if (ratio <= 0.5) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    if (ratio <= 0.75) return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    return "bg-red-100 text-red-800 hover:bg-red-200";
  }

  const isIdeal = (date: string) => date >= leg.earliestDeparture && date <= leg.latestDeparture;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200 inline-block" />
          Cheapest
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-200 inline-block" />
          Moderate
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" />
          Expensive
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-sky-500 inline-block" />
          Your ideal dates
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
        {dates.map((date) => {
          const price = cheapestByDate[date];
          const ideal = isIdeal(date);
          const selected = selectedDate === date;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate?.(date)}
              className={cn(
                "rounded-lg p-2 text-center transition-all border-2 cursor-pointer",
                getPriceColor(price),
                ideal ? "border-sky-400 font-semibold" : "border-transparent",
                selected && "ring-2 ring-sky-600 ring-offset-1"
              )}
            >
              <div className="text-xs font-medium leading-tight">
                {format(parseISO(date), "MMM d")}
              </div>
              <div className="text-xs font-bold mt-0.5 leading-tight">
                {formatPrice(price, currency)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
