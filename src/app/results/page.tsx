"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { LegResults } from "@/components/Results/LegResults";
import { PriceHistory } from "@/components/Results/PriceHistory";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { SearchResult, SearchParams } from "@/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<SearchParams | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const q = searchParams.get("q");

  async function fetchResults(searchData: SearchParams) {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Search failed");
    }

    return res.json() as Promise<SearchResult>;
  }

  useEffect(() => {
    if (!q) {
      setError("No search parameters found.");
      setLoading(false);
      return;
    }

    try {
      const parsed: SearchParams = JSON.parse(decodeURIComponent(q));
      setParams(parsed);
      fetchResults(parsed)
        .then(setResult)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } catch {
      setError("Invalid search parameters.");
      setLoading(false);
    }
  }, [q]);

  async function refresh() {
    if (!params) return;
    setRefreshing(true);
    try {
      const fresh = await fetchResults(params);
      setResult(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Searching flights...</p>
          <p className="text-slate-400 text-sm">Checking prices across all your dates</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-red-600 font-medium">{error}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft size={14} className="mr-2" />
            Back to search
          </Button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const totalCheapest = result.legs.reduce((s, l) => s + l.absoluteCheapest, 0);
  const totalIdeal = result.legs.reduce(
    (s, l) => s + (l.cheapestOnIdealDates ?? l.absoluteCheapest),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft size={14} className="mr-1.5" />
            Edit search
          </Button>
          <div className="text-center">
            {totalCheapest > 0 ? (
              <>
                <div className="text-xs text-slate-500">Cheapest combo</div>
                <div className="text-lg font-bold text-slate-900">{formatPrice(totalCheapest, result.currency)}</div>
              </>
            ) : (
              <div className="text-sm text-slate-500">Click dates to see prices</div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? "animate-spin mr-1.5" : "mr-1.5"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* Link-mode info banner */}
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-sm text-sky-800">
          <strong>Click any date below to search live prices on Google Flights.</strong>
          {" "}If you saved this search, monitored prices will appear here within 6 hours and update automatically.
        </div>

        {/* Summary banner */}
        {result.legs.length > 1 && totalIdeal !== totalCheapest && (
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">Cheapest possible (any date)</div>
                <div className="text-2xl font-bold text-slate-900">{formatPrice(totalCheapest, result.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Cheapest on your ideal dates</div>
                <div className="text-2xl font-bold text-sky-700">{formatPrice(totalIdeal, result.currency)}</div>
              </div>
            </div>
            {totalIdeal > totalCheapest && (
              <p className="text-center text-sm text-slate-500 mt-3">
                Your ideal dates cost{" "}
                <strong>{formatPrice(totalIdeal - totalCheapest, result.currency)} more</strong> combined
                {" "}({Math.round(((totalIdeal - totalCheapest) / totalCheapest) * 100)}%)
              </p>
            )}
          </div>
        )}

        {/* Per-leg results */}
        {result.legs.map((legResult, i) => (
          <div key={i} className="space-y-4">
            <div className="border-t border-slate-200 pt-6">
              <LegResults
                legResult={legResult}
                legIndex={i}
                currency={result.currency}
                flexibility={result.flexibility}
                pricePremiumPct={params?.pricePremiumPct ?? 10}
              />
            </div>
          </div>
        ))}

        <p className="text-center text-xs text-slate-400">
          Prices scraped from Google Flights · Last updated {new Date(result.searchedAt).toLocaleTimeString()}
          {" · "}Results cached for 1 hour
        </p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
