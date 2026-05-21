"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bell, BellOff, Trash2, ArrowLeft, Clock, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { PriceHistory } from "@/components/Results/PriceHistory";

interface SearchData {
  id: string;
  email: string;
  active: boolean;
  alertThreshold: number;
  digestEnabled: boolean;
  createdAt: string;
  legs: Array<{ from: string; to: string; fromCity: string; toCity: string; earliestDeparture: string; latestDeparture: string }>;
  priceRecords: Array<{ checkedAt: string; cheapestPrice: number; currency: string }>;
  alertLogs: Array<{ sentAt: string; type: string; price: number }>;
}

export default function ManagePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/manage/${token}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  async function toggleActive() {
    if (!data) return;
    setSaving(true);
    const res = await fetch(`/api/manage/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !data.active }),
    });
    const updated = await res.json();
    setData((d) => d ? { ...d, active: updated.active } : d);
    setMessage(updated.active ? "Alerts re-enabled." : "Alerts paused.");
    setSaving(false);
  }

  async function unsubscribe() {
    setSaving(true);
    await fetch(`/api/manage/${token}`, { method: "DELETE" });
    setData((d) => d ? { ...d, active: false } : d);
    setMessage("Unsubscribed. You won't receive any more alerts.");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Alert not found.</p>
      </div>
    );
  }

  const latestPrice = data.priceRecords[0]?.cheapestPrice;
  const currency = data.priceRecords[0]?.currency ?? "CAD";
  const legLabel = data.legs.map((l) => `${l.fromCity} → ${l.toCity}`).join(" + ");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} />
          Back to search
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manage alerts</h1>
              <p className="text-sm text-slate-500 mt-1">{data.email}</p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                data.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {data.active ? "Active" : "Paused"}
            </span>
          </div>

          <div className="text-sm text-slate-700">
            <p className="font-medium mb-1">Tracking:</p>
            {data.legs.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-600">
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{l.from}</span>
                →
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{l.to}</span>
                <span className="text-slate-400">{l.earliestDeparture} – {l.latestDeparture}</span>
              </div>
            ))}
          </div>

          {latestPrice && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Last checked price</div>
                <div className="text-xl font-bold text-slate-900">{formatPrice(latestPrice, currency)}</div>
              </div>
              <div className="text-xs text-slate-400">
                {data.priceRecords[0] && format(parseISO(data.priceRecords[0].checkedAt), "MMM d, HH:mm")}
              </div>
            </div>
          )}

          {message && (
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{message}</div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={toggleActive}
              disabled={saving}
              className="flex-1"
            >
              {data.active ? (
                <><BellOff size={14} className="mr-2" />Pause alerts</>
              ) : (
                <><Bell size={14} className="mr-2" />Re-enable alerts</>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={unsubscribe}
              disabled={saving || !data.active}
              className="flex-1"
            >
              <Trash2 size={14} className="mr-2" />
              Unsubscribe
            </Button>
          </div>
        </div>

        {/* Price history chart */}
        {data.priceRecords.length >= 2 && (
          <PriceHistory
            history={data.priceRecords}
            currency={currency}
            legLabel={legLabel}
          />
        )}

        {/* Alert log */}
        {data.alertLogs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Alert history</h2>
            <div className="space-y-2">
              {data.alertLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {log.type === "alert" ? (
                    <TrendingDown size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Clock size={14} className="text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-600">
                    {log.type === "alert" ? "Price drop alert" : "Daily digest"}
                  </span>
                  <span className="font-medium text-slate-900">{formatPrice(log.price, currency)}</span>
                  <span className="text-slate-400 ml-auto text-xs">
                    {format(parseISO(log.sentAt), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
