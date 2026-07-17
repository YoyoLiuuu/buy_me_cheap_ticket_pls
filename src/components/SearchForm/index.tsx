"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Plane, Zap } from "lucide-react";
import { LegForm } from "./LegForm";
import { FlexibilitySlider } from "./FlexibilitySlider";
import { LayoverFilters } from "./LayoverFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_TRIP } from "@/lib/default-trip";
import type { SearchParams, LegParams, Flexibility } from "@/types";
import { cn } from "@/lib/utils";

const EMPTY_LEG: LegParams = {
  from: "",
  to: "",
  fromCity: "",
  toCity: "",
  earliestDeparture: "",
  arriveBy: "",
};

const DEFAULT_PARAMS: SearchParams = {
  tripType: "one-way",
  legs: [{ ...EMPTY_LEG }],
  filters: {
    avoidConflictZones: false,
    avoidMiddleEast: false,
    customAvoidCountries: [],
  },
  flexibility: 0,
  pricePremiumPct: 10,
  adults: 1,
  currency: "CAD",
  alertThreshold: 10,
  digestEnabled: true,
};

export function SearchForm() {
  const router = useRouter();
  const [params, setParams] = useState<SearchParams>(DEFAULT_PARAMS);
  const [email, setEmail] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  function loadDefault() {
    setParams(DEFAULT_TRIP);
  }

  function updateLeg(index: number, updated: LegParams) {
    setParams((p) => {
      const legs = [...p.legs];
      legs[index] = updated;
      return { ...p, legs };
    });
  }

  function addLeg() {
    setParams((p) => ({ ...p, legs: [...p.legs, { ...EMPTY_LEG }] }));
  }

  function removeLeg(index: number) {
    setParams((p) => ({ ...p, legs: p.legs.filter((_, i) => i !== index) }));
  }

  function setFlexibility(v: Flexibility) {
    setParams((p) => ({ ...p, flexibility: v }));
  }

  function setTripType(type: SearchParams["tripType"]) {
    setParams((p) => {
      if (type === "one-way") {
        // One-way is a single leg — drop any extra legs that were showing.
        return { ...p, tripType: type, legs: [p.legs[0]] };
      }
      if (type === "round-trip") {
        // Exactly two legs: keep the outbound, and a return (swap from/to if we
        // don't already have a second leg from a previous multi-leg selection).
        const first = p.legs[0];
        const second = p.legs[1] ?? {
          ...EMPTY_LEG,
          from: first.to,
          to: first.from,
          fromCity: first.toCity,
          toCity: first.fromCity,
        };
        return { ...p, tripType: type, legs: [first, second] };
      }
      // multi-leg keeps whatever legs already exist.
      return { ...p, tripType: type };
    });
  }

  function legTitle(index: number): string {
    if (params.tripType === "one-way") return "Flight";
    if (params.tripType === "round-trip") return index === 0 ? "Outbound flight" : "Return flight";
    return index === 0 ? "Outbound flight" : `Leg ${index + 1}`;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      for (const leg of params.legs) {
        if (!leg.from || !leg.to || !leg.earliestDeparture || !leg.arriveBy) {
          throw new Error("Please fill in all departure and arrival cities and dates.");
        }
      }

      const searchPayload = { ...params };

      // If email provided, save the search for monitoring
      if (email) {
        const subRes = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...searchPayload,
            email,
            alertThreshold,
            digestEnabled,
          }),
        });
        if (subRes.ok) setSubscribed(true);
      }

      // Navigate to results with search params
      const encoded = encodeURIComponent(JSON.stringify(searchPayload));
      router.push(`/results?q=${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="space-y-6">
      {/* Default preset banner */}
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 p-4 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Try the example trip</p>
          <p className="text-sky-100 text-xs mt-0.5">
            Toronto → Seoul → Beijing → Toronto · Jul 3–27
          </p>
        </div>
        <Button
          type="button"
          onClick={loadDefault}
          className="bg-white text-sky-700 hover:bg-sky-50 text-sm font-semibold px-4 py-2 rounded-lg shrink-0"
        >
          <Zap size={14} className="mr-1.5" />
          Load example
        </Button>
      </div>

      {/* Trip type */}
      <div>
        <Label>Trip type</Label>
        <div className="flex gap-2 mt-1">
          {(["one-way", "round-trip", "multi-leg"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                params.tripType === type
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-sky-400"
              )}
            >
              {type === "one-way" ? "One-way" : type === "round-trip" ? "Round trip" : "Multi-leg"}
            </button>
          ))}
        </div>
      </div>

      {/* Legs */}
      <div className="space-y-3">
        {params.legs.map((leg, i) => (
          <LegForm
            key={i}
            leg={leg}
            title={legTitle(i)}
            canRemove={params.legs.length > 1 && params.tripType === "multi-leg"}
            onChange={(updated) => updateLeg(i, updated)}
            onRemove={() => removeLeg(i)}
          />
        ))}
        {params.tripType === "multi-leg" && (
          <Button
            type="button"
            variant="outline"
            onClick={addLeg}
            className="w-full border-dashed"
          >
            <Plus size={15} className="mr-1.5" />
            Add leg
          </Button>
        )}
      </div>

      {/* Adults + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Passengers (adults)</Label>
          <Input
            type="number"
            min={1}
            max={9}
            value={params.adults}
            onChange={(e) => setParams((p) => ({ ...p, adults: parseInt(e.target.value) || 1 }))}
          />
        </div>
        <div>
          <Label>Currency</Label>
          <select
            value={params.currency}
            onChange={(e) => setParams((p) => ({ ...p, currency: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="KRW">KRW — Korean Won</option>
            <option value="CNY">CNY — Chinese Yuan</option>
            <option value="JPY">JPY — Japanese Yen</option>
          </select>
        </div>
      </div>

      {/* Flexibility */}
      <div>
        <Label>Date flexibility & price tradeoff</Label>
        <FlexibilitySlider
          value={params.flexibility as Flexibility}
          onChange={setFlexibility}
          pricePremiumPct={params.pricePremiumPct}
          onPremiumChange={(pct) => setParams((p) => ({ ...p, pricePremiumPct: pct }))}
        />
      </div>

      {/* Layover filters */}
      <div>
        <Label>Layover preferences</Label>
        <LayoverFilters
          filters={params.filters}
          onChange={(f) => setParams((p) => ({ ...p, filters: f }))}
        />
      </div>

      {/* Price monitoring */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Price monitoring (optional)</p>
          <p className="text-xs text-slate-500 mt-0.5">
            We&apos;ll check prices every 6 hours and email you if they drop.
          </p>
        </div>
        <div>
          <Label>Your email</Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {email && (
          <div className="space-y-2">
            <div>
              <Label>Alert me when price drops by more than</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  className="flex-1 accent-sky-600"
                />
                <span className="text-sm font-bold text-sky-700 w-8">{alertThreshold}%</span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={digestEnabled}
                onChange={(e) => setDigestEnabled(e.target.checked)}
                className="rounded accent-sky-600"
              />
              <span className="text-sm text-slate-700">Also send daily digest at 9am</span>
            </label>
          </div>
        )}
        {subscribed && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            Subscribed! We&apos;ll send updates to {email}.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        <Plane size={16} className="mr-2" />
        {loading ? "Searching..." : "Search flights"}
      </Button>
    </form>
  );
}
