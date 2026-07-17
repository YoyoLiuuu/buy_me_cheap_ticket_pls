# CheapTicket

Find the cheapest flights with flexible date ranges, conflict-zone layover filters, and email price alerts — powered by live Google Flights scraping (no paid flight API needed).

## 🚀 Try it out

### Option 1 — Hosted demo (quick look)

**Live demo:** https://buy-me-cheap-ticket-pls.vercel.app 

Good for clicking around the UI and running a **small, single-leg search**.

> ⚠️ **If a search spins and returns "No prices found", it timed out — not a bug.**
> The hosted version runs on Vercel's free tier, which kills any request after **60 seconds**. Scraping a full multi-leg trip (or a wide date range) takes longer than that, so the browser gets cut off before results come back. For complete results, run it locally 👇

### Option 2 — Run locally (full results)

Running on your own machine has **no time limit**, so every search — including the full multi-city example trip — returns complete results. Setup takes a few minutes (see below).

## Features

- **Multi-leg search** — one-way, round-trip, or multi-city
- **Flexible date ranges** — strict / ±2 days / ±7 days modes with price-vs-date tradeoff display
- **Price calendar** — heatmap showing cheapest days at a glance
- **Conflict-zone layover filter** — hardcoded list of active wars + Middle East toggle + custom exclusions
- **Email alerts** — price-drop alerts + daily digest, managed via magic link (no login)
- **Default preset** — one click to load the YYZ→ICN→PEK→YYZ example trip

## Local setup

### 1. Clone & install

```bash
git clone https://github.com/YoyoLiuuu/buy_me_cheap_ticket_pls
cd buy_me_cheap_ticket_pls
npm install
```

### 2. Install the scraping browser

The app scrapes Google Flights with a headless Chromium via Playwright — no flight API key required.

```bash
# Downloads Chromium. On Linux, --with-deps also installs the system
# libraries it needs (libnss3, etc.) — this part uses sudo.
npx playwright install --with-deps chromium
```

### 3. Get your (free) service keys

| Service | What for | Link |
|---|---|---|
| **Neon** | PostgreSQL database (free tier) | [neon.tech](https://neon.tech) |
| **Resend** | Email alerts (free tier) | [resend.com](https://resend.com) |

> **Email note:** with Resend's default sandbox sender (`onboarding@resend.dev`), you can only send to the email address you signed up to Resend with. To send alerts to any address, verify a domain at [resend.com/domains](https://resend.com/domains) and set `EMAIL_FROM` to an address on that domain.

### 4. Configure environment

```bash
cp .env.example .env
# Fill in the values:
#   DATABASE_URL          your Neon connection string
#   RESEND_API_KEY        your Resend API key
#   EMAIL_FROM            onboarding@resend.dev (or your verified domain address)
#   NEXT_PUBLIC_BASE_URL  http://localhost:3000 locally
```

### 5. Set up the database

```bash
npx prisma migrate deploy   # apply migrations to your Neon DB
```

### 6. Run it

```bash
npm run dev
# Open http://localhost:3000
```

Click **Load example** (or enter any route) and hit **Search** for live prices.

## Email alerts (how they actually send)

Browsing the site **never emails you**. Search shows results in the browser; **Subscribe** just saves your search to the database and returns a manage link.

Emails (price-drop alerts + daily digest) are sent by the **monitor script**, run separately:

```bash
# Scrape all saved searches, record prices, and send a digest right now:
DIGEST_RUN=true npx tsx scripts/monitor.ts
```

A **price alert** only fires when a later run finds a price ≥ your threshold (default 10%) below a previous record, so the **digest** is the quickest way to confirm email works end-to-end.

In production this same script runs automatically every 6 hours via GitHub Actions (see below).

## Deploy to Vercel (optional)

```bash
vercel deploy
```

Add `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_BASE_URL` in the Vercel project's Environment Variables.

> Remember the 60-second limit on Vercel's free tier: the hosted demo is best for small searches. Point people to the local setup above for full multi-leg results.

### GitHub Actions (automated price monitoring)

Add these repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | Your sender address |
| `APP_URL` | Your Vercel deployment URL (used for manage links in emails) |

The [workflow](.github/workflows/price-monitor.yml) runs every 6 hours and emails alerts automatically. It installs Chromium with `--with-deps`, so it isn't affected by Vercel's time limit — a reliable way to keep getting full results without running anything yourself.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Home — search form
│   ├── results/page.tsx          # Results — flight cards + price calendar
│   ├── manage/[token]/page.tsx   # Alert management (magic link)
│   └── api/
│       ├── search/route.ts       # Live flight search (streams results per leg)
│       ├── subscribe/route.ts    # Save search + subscribe to alerts
│       ├── manage/[token]/route.ts
│       └── monitor/route.ts       # Monitoring endpoint
├── components/
│   ├── SearchForm/               # Full search form with all fields
│   └── Results/                  # Flight cards, price calendar, history chart
└── lib/
    ├── browser.ts                # Playwright/Chromium launch (local + serverless)
    ├── scrape.ts                 # Google Flights scraping + result parsing
    ├── flights.ts                # URL builder + metro-airport expansion
    ├── conflict-zones.ts         # Conflict-zone data + layover filters
    ├── email.ts                  # Resend email templates
    ├── cache.ts                  # 1-hour in-process cache
    └── default-trip.ts           # YYZ→ICN→PEK→YYZ preset

scripts/
└── monitor.ts                    # Cron-run price monitor (scrape → DB → email)
```
