import { Resend } from "resend";
import type { LegResult, SearchParams } from "@/types";
import { format, parseISO } from "date-fns";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}
const FROM = process.env.EMAIL_FROM ?? "alerts@cheapticket.yoyo.dev";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cheapticket.yoyo.dev";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(price);
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function legSummaryHtml(leg: LegResult, currency: string): string {
  const top3 = leg.offers.slice(0, 3);
  const rows = top3
    .map(
      (o) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatPrice(o.price, currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${o.itineraries[0]?.stops === 0 ? "Direct" : `${o.itineraries[0]?.stops} stop(s)`}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDuration(o.itineraries[0]?.totalDurationMinutes ?? 0)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${format(parseISO(o.departureDate), "MMM d")}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${o.validatingCarrierCode}</td>
      ${o.conflictZoneWarnings.length > 0 ? `<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#dc2626;">⚠️ ${o.conflictZoneWarnings.map((w) => w.countryName).join(", ")}</td>` : "<td></td>"}
    </tr>`
    )
    .join("");

  return `
    <h3 style="margin:16px 0 8px;color:#1e293b;">${leg.leg.fromCity} (${leg.leg.from}) → ${leg.leg.toCity} (${leg.leg.to})</h3>
    <p style="margin:0 0 8px;color:#64748b;">Cheapest found: <strong>${formatPrice(leg.absoluteCheapest, currency)}</strong>
    ${leg.pricePremiumForIdeal !== null && leg.pricePremiumForIdeal > 0 ? ` · Ideal dates cost <strong>${formatPrice(leg.pricePremiumForIdeal, currency)} more</strong>` : ""}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:8px 12px;text-align:left;">Price</th>
        <th style="padding:8px 12px;text-align:left;">Stops</th>
        <th style="padding:8px 12px;text-align:left;">Duration</th>
        <th style="padding:8px 12px;text-align:left;">Date</th>
        <th style="padding:8px 12px;text-align:left;">Carrier</th>
        <th style="padding:8px 12px;text-align:left;">Warnings</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export async function sendPriceAlert({
  email,
  token,
  legResults,
  searchParams,
  droppedLeg,
  newPrice,
  oldPrice,
  currency,
}: {
  email: string;
  token: string;
  legResults: LegResult[];
  searchParams: SearchParams;
  droppedLeg: number;
  newPrice: number;
  oldPrice: number;
  currency: string;
}) {
  const legStr = `${searchParams.legs[droppedLeg]?.fromCity} → ${searchParams.legs[droppedLeg]?.toCity}`;
  const drop = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#16a34a;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">✈️ Price Drop Alert</h1>
        <p style="margin:8px 0 0;opacity:0.9;">${legStr} dropped ${drop}%</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;">
        <p style="font-size:28px;font-weight:bold;color:#16a34a;margin:0 0 4px;">
          ${formatPrice(newPrice, currency)}
        </p>
        <p style="color:#64748b;margin:0 0 20px;">was ${formatPrice(oldPrice, currency)}</p>

        ${legResults.map((l) => legSummaryHtml(l, currency)).join("<hr style='margin:20px 0;border:none;border-top:1px solid #e2e8f0;'/>")}

        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
          <a href="${BASE_URL}/manage/${token}" style="color:#64748b;font-size:13px;">Manage or unsubscribe from alerts</a>
        </div>
      </div>
    </div>`;

  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `✈️ Price drop ${drop}% on ${legStr} — now ${formatPrice(newPrice, currency)}`,
    html,
  });
  if (error) throw new Error(`Resend rejected price alert to ${email}: ${error.message}`);
  return data;
}

export async function sendDailyDigest({
  email,
  token,
  legResults,
  currency,
}: {
  email: string;
  token: string;
  legResults: LegResult[];
  currency: string;
}) {
  const totalCheapest = legResults.reduce((s, l) => s + l.absoluteCheapest, 0);

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f172a;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">✈️ Daily Flight Price Digest</h1>
        <p style="margin:8px 0 0;opacity:0.9;">${format(new Date(), "EEEE, MMMM d yyyy")}</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;">
        <p style="color:#64748b;margin:0 0 4px;">Combined cheapest across all legs:</p>
        <p style="font-size:28px;font-weight:bold;color:#0f172a;margin:0 0 24px;">${formatPrice(totalCheapest, currency)}</p>

        ${legResults.map((l) => legSummaryHtml(l, currency)).join("<hr style='margin:20px 0;border:none;border-top:1px solid #e2e8f0;'/>")}

        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
          <a href="${BASE_URL}/manage/${token}" style="color:#64748b;font-size:13px;">Manage or unsubscribe from alerts</a>
        </div>
      </div>
    </div>`;

  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `✈️ Daily digest — cheapest combo: ${formatPrice(totalCheapest, currency)}`,
    html,
  });
  if (error) throw new Error(`Resend rejected digest to ${email}: ${error.message}`);
  return data;
}
