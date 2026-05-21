"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { LegResults } from "@/components/Results/LegResults";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { SearchResult, SearchParams, LegResult, Flexibility } from "@/types";

type StreamChunk =
  | { type: "status"; message: string }
  | { type: "progress"; legIndex: number; total: number; message: string }
  | { type: "leg"; legIndex: number; data: LegResult }
  | { type: "done"; searchedAt: string; currency: string; flexibility: number }
  | { type: "error"; message: string };

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [legs, setLegs] = useState<(LegResult | null)[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Launching browser...");
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<SearchParams | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const q = searchParams.get("q");

  async function streamSearch(searchData: SearchParams, isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
      setLegs([]);
      setResult(null);
      setError(null);
    }
    setStatusMsg("Launching browser...");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchData),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error ?? "Search failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      let currency = searchData.currency;
      let flexibility = searchData.flexibility;
      const collectedLegs: LegResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as StreamChunk;
            if (chunk.type === "status") {
              setStatusMsg(chunk.message);
            } else if (chunk.type === "progress") {
              setStatusMsg(`${chunk.message} (${chunk.legIndex + 1}/${chunk.total})`);
              // Pre-allocate null slot so we can show skeletons
              setLegs((prev) => {
                const next = [...prev];
                if (!next[chunk.legIndex]) next[chunk.legIndex] = null;
                return next;
              });
            } else if (chunk.type === "leg") {
              collectedLegs[chunk.legIndex] = chunk.data;
              setLegs((prev) => {
                const next = [...prev];
                next[chunk.legIndex] = chunk.data;
                return next;
              });
            } else if (chunk.type === "done") {
              currency = chunk.currency;
              flexibility = chunk.flexibility as Flexibility;
              setResult({
                legs: collectedLegs,
                searchedAt: chunk.searchedAt,
                currency,
                flexibility,
              });
            } else if (chunk.type === "error") {
              setError(chunk.message);
            }
          } catch {
            // malformed JSON line — skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      // Pre-fill leg skeleton slots
      setLegs(parsed.legs.map(() => null));
      streamSearch(parsed);
    } catch {
      setError("Invalid search parameters.");
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const currency = result?.currency ?? params?.currency ?? "CAD";
  const flexibility = result?.flexibility ?? params?.flexibility ?? 0;
  const pricePremiumPct = params?.pricePremiumPct ?? 10;

  const totalCheapest = result
    ? result.legs.reduce((s, l) => s + l.absoluteCheapest, 0)
    : 0;
  const totalIdeal = result
    ? result.legs.reduce((s, l) => s + (l.cheapestOnIdealDates ?? l.absoluteCheapest), 0)
    : 0;

  if (error && legs.length === 0) {
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
            {loading || refreshing ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                {statusMsg}
              </div>
            ) : totalCheapest > 0 ? (
              <>
                <div className="text-xs text-slate-500">Cheapest combo</div>
                <div className="text-lg font-bold text-slate-900">{formatPrice(totalCheapest, currency)}</div>
              </>
            ) : (
              <div className="text-sm text-slate-500">No prices found</div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => params && streamSearch(params, true)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin mr-1.5" : "mr-1.5"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* Price summary — only once all legs are loaded */}
        {result && result.legs.length > 1 && totalIdeal !== totalCheapest && totalCheapest > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">Cheapest possible (any date)</div>
                <div className="text-2xl font-bold text-slate-900">{formatPrice(totalCheapest, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Cheapest on your ideal dates</div>
                <div className="text-2xl font-bold text-sky-700">{formatPrice(totalIdeal, currency)}</div>
              </div>
            </div>
            {totalIdeal > totalCheapest && (
              <p className="text-center text-sm text-slate-500 mt-3">
                Ideal dates cost{" "}
                <strong>{formatPrice(totalIdeal - totalCheapest, currency)} more</strong>
                {" "}({Math.round(((totalIdeal - totalCheapest) / totalCheapest) * 100)}%)
              </p>
            )}
          </div>
        )}

        {/* Per-leg results — stream in as each scrape finishes */}
        {legs.map((legResult, i) => (
          <div key={i} className="border-t border-slate-200 pt-6">
            {legResult ? (
              <LegResults
                legResult={legResult}
                legIndex={i}
                currency={currency}
                flexibility={flexibility}
                pricePremiumPct={pricePremiumPct}
              />
            ) : (
              /* Skeleton while this leg is still scraping */
              <div className="space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-slate-200 rounded w-48" />
                  <div className="h-5 bg-slate-200 rounded w-20" />
                </div>
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-8 bg-slate-200 rounded w-32" />
                    <div className="h-4 bg-slate-200 rounded w-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Initial loading state before any leg starts */}
        {loading && legs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 size={36} className="animate-spin text-sky-600" />
            <p className="text-slate-600 font-medium">{statusMsg}</p>
            <p className="text-slate-400 text-sm">Scraping Google Flights across all your dates...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <p className="text-center text-xs text-slate-400">
            Prices scraped from Google Flights · Last updated {new Date(result.searchedAt).toLocaleTimeString()}
            {" · "}Results are live
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={36} className="animate-spin text-sky-600" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
