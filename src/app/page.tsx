import { SearchForm } from "@/components/SearchForm";
import { Plane } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-600 rounded-2xl mb-2 shadow-lg">
            <Plane size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Find the cheapest flight
          </h1>
          <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
            Search across flexible date ranges, filter out conflict-zone layovers, and get email
            alerts when prices drop — all for free.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { step: "1", label: "Set your route", sub: "dates + time windows" },
            { step: "2", label: "Set your filters", sub: "avoid conflict zones" },
            { step: "3", label: "Get alerts", sub: "email when price drops" },
          ].map((item) => (
            <div key={item.step} className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
              <div className="text-xs font-bold text-sky-600 mb-1">Step {item.step}</div>
              <div className="text-sm font-semibold text-slate-800">{item.label}</div>
              <div className="text-xs text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <SearchForm />
        </div>

        <p className="text-center text-xs text-slate-400">
          Prices scraped from Google Flights · Checked every 6 hours · No account needed
        </p>
      </div>
    </div>
  );
}
