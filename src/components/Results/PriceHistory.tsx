"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";

interface PricePoint {
  checkedAt: string;
  cheapestPrice: number;
}

interface PriceHistoryProps {
  history: PricePoint[];
  currency: string;
  legLabel: string;
}

export function PriceHistory({ history, currency, legLabel }: PriceHistoryProps) {
  if (history.length < 2) return null;

  const data = history.map((p) => ({
    time: format(parseISO(p.checkedAt), "MMM d HH:mm"),
    price: p.cheapestPrice,
  }));

  const prices = history.map((p) => p.cheapestPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const trend = prices[prices.length - 1] < prices[0] ? "down" : "up";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800">{legLabel} — price history</h4>
        <span
          className={
            trend === "down"
              ? "text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
              : "text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full"
          }
        >
          {trend === "down" ? "Trending down" : "Trending up"}
        </span>
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatPrice(v, currency)}
              domain={[min * 0.97, max * 1.03]}
            />
            <Tooltip
              formatter={(value) => [typeof value === "number" ? formatPrice(value, currency) : value, "Price"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0284c7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
