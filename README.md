# CheapTicket

Find the cheapest flights with flexible date ranges, conflict-zone layover filters, and email price alerts.

## Features

- **Multi-leg search** — one-way, round-trip, or multi-city
- **Flexible date ranges** — strict / ±2 days / ±7 days modes with price-vs-date tradeoff display
- **Price calendar** — heatmap showing cheapest days at a glance
- **Conflict-zone layover filter** — hardcoded list of active wars + Middle East toggle + custom exclusions
- **Email alerts** — price drop alerts + daily digest, managed via magic link (no login)
- **Price history** — charts showing how prices change over time for saved searches
- **Default preset** — one click to load the YYZ→ICN→PEK→YYZ example trip

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YoyoLiuuu/buy_me_cheap_ticket_pls
cd buy_me_cheap_ticket_pls
npm install
```

### 2. Get your API keys

| Service | What for | Link |
|---|---|---|
| **Amadeus for Developers** | Real flight prices (free) | [developers.amadeus.com](https://developers.amadeus.com) |
| **Neon** | PostgreSQL database (free) | [neon.tech](https://neon.tech) |
| **Resend** | Email alerts (free: 3k/month) | [resend.com](https://resend.com) |

For Amadeus: register, create an app, then apply for **Production** access (usually approved same day).

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in all values
```

### 4. Set up database

```bash
npx prisma migrate dev --name init
```

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel

```bash
vercel deploy
```

Add all env vars from `.env.example` in Vercel project settings.

### GitHub Actions (price monitoring)

Add these secrets to your GitHub repo (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `APP_URL` | Your Vercel deployment URL |
| `MONITOR_SECRET` | Same value as `MONITOR_SECRET` in your env |

The workflow runs every 6 hours and sends alerts automatically.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Home — search form
│   ├── results/page.tsx          # Results — flight cards + price calendar
│   ├── manage/[token]/page.tsx   # Alert management (magic link)
│   └── api/
│       ├── search/route.ts       # Flight search (cached 1hr)
│       ├── subscribe/route.ts    # Save search + subscribe
│       ├── manage/[token]/route.ts
│       └── monitor/route.ts      # Called by GitHub Actions
├── components/
│   ├── SearchForm/               # Full search form with all fields
│   └── Results/                  # Flight cards, price calendar, history chart
└── lib/
    ├── amadeus.ts                # Amadeus API + flexibility date expansion
    ├── conflict-zones.ts         # Hardcoded conflict zone data + filters
    ├── email.ts                  # Resend email templates
    ├── cache.ts                  # 1-hour in-process cache
    └── default-trip.ts           # YYZ→ICN→PEK→YYZ preset
```
