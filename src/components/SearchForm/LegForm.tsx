"use client";
import { AirportSearch } from "./AirportSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { LegParams } from "@/types";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegFormProps {
  leg: LegParams;
  title: string;
  canRemove: boolean;
  showErrors?: boolean;
  onChange: (patch: Partial<LegParams>) => void;
  onRemove: () => void;
}

export function LegForm({ leg, title, canRemove, showErrors, onChange, onRemove }: LegFormProps) {
  // Pass the patch straight up; the parent merges it into current state. Do NOT
  // spread `leg` here — two fields committing in the same tick (e.g. an airport
  // resolving on blur right before a date change) would clobber each other's
  // update by spreading a stale `leg` snapshot.
  const update = onChange;

  const invalidClass = "border-red-400 ring-1 ring-red-200";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
          {title}
        </h3>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-slate-400 hover:text-red-500 p-1">
            <Trash2 size={15} />
          </Button>
        )}
      </div>

      {/* Route */}
      <div className="grid grid-cols-2 gap-3">
        <AirportSearch
          label="From"
          value={leg.from}
          cityValue={leg.fromCity}
          onChange={(iata, city) => update({ from: iata, fromCity: city })}
          placeholder="Departure city"
          invalid={showErrors && !leg.from}
        />
        <AirportSearch
          label="To"
          value={leg.to}
          cityValue={leg.toCity}
          onChange={(iata, city) => update({ to: iata, toCity: city })}
          placeholder="Arrival city"
          invalid={showErrors && !leg.to}
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Earliest departure</Label>
          <Input
            type="date"
            value={leg.earliestDeparture}
            onChange={(e) => update({ earliestDeparture: e.target.value })}
            className={cn(showErrors && !leg.earliestDeparture && invalidClass)}
          />
        </div>
        <div>
          <Label>Arrive by (date)</Label>
          <Input
            type="date"
            value={leg.arriveBy}
            onChange={(e) => update({ arriveBy: e.target.value })}
            className={cn(showErrors && !leg.arriveBy && invalidClass)}
          />
        </div>
      </div>

      {/* Time windows */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-sky-600 hover:text-sky-700 font-medium list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Time window preferences <span className="text-slate-400 font-normal">(optional)</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label>Depart no earlier than</Label>
            <Input
              type="time"
              value={leg.earliestDepartureTime ?? ""}
              onChange={(e) => update({ earliestDepartureTime: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label>Depart no later than</Label>
            <Input
              type="time"
              value={leg.latestDepartureTime ?? ""}
              onChange={(e) => update({ latestDepartureTime: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label>Arrive no earlier than</Label>
            <Input
              type="time"
              value={leg.earliestArrivalTime ?? ""}
              onChange={(e) => update({ earliestArrivalTime: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label>Arrive no later than</Label>
            <Input
              type="time"
              value={leg.latestArrivalTime ?? ""}
              onChange={(e) => update({ latestArrivalTime: e.target.value || undefined })}
            />
          </div>
          <div className="col-span-2">
            <Label>Max total journey time (hours)</Label>
            <Input
              type="number"
              min={2}
              max={72}
              value={leg.maxDurationHours ?? ""}
              placeholder="e.g. 20"
              onChange={(e) =>
                update({ maxDurationHours: e.target.value ? parseInt(e.target.value) : undefined })
              }
            />
          </div>
        </div>
      </details>
    </div>
  );
}
