"use client";
import { cn } from "@/lib/utils";
import type { Flexibility } from "@/types";

const LEVELS = [
  {
    value: 0 as Flexibility,
    label: "Strict",
    description: "Only my exact dates",
    color: "bg-slate-500",
  },
  {
    value: 1 as Flexibility,
    label: "Balanced",
    description: "±2 days — show price diff",
    color: "bg-sky-500",
  },
  {
    value: 2 as Flexibility,
    label: "Flexible",
    description: "±7 days — show calendar",
    color: "bg-emerald-500",
  },
];

interface FlexibilitySliderProps {
  value: Flexibility;
  onChange: (v: Flexibility) => void;
  pricePremiumPct: number;
  onPremiumChange: (pct: number) => void;
}

export function FlexibilitySlider({
  value,
  onChange,
  pricePremiumPct,
  onPremiumChange,
}: FlexibilitySliderProps) {
  const current = LEVELS[value];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "flex-1 rounded-lg border-2 p-3 text-left transition-all",
              value === level.value
                ? "border-sky-500 bg-sky-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  value === level.value ? level.color : "bg-slate-300"
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  value === level.value ? "text-sky-700" : "text-slate-600"
                )}
              >
                {level.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">{level.description}</p>
          </button>
        ))}
      </div>

      {value > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <label className="block text-sm font-medium text-amber-800 mb-2">
            Max % extra I&apos;d pay to fly on my ideal dates
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={pricePremiumPct}
              onChange={(e) => onPremiumChange(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="w-12 text-right text-sm font-bold text-amber-700">
              {pricePremiumPct}%
            </span>
          </div>
          <p className="text-xs text-amber-600 mt-1">
            {pricePremiumPct === 0
              ? "Show the absolute cheapest regardless of dates"
              : `If ideal dates cost less than ${pricePremiumPct}% more, recommend them — otherwise show the cheaper option`}
          </p>
        </div>
      )}

      {value === 2 && (
        <p className="text-xs text-slate-500">
          Results will include a price calendar heatmap so you can see the cheapest days at a glance.
        </p>
      )}
    </div>
  );
}
