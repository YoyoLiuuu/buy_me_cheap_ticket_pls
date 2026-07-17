// Debug harness: run one live Google Flights scrape and report what we got.
// Usage: npx tsx scripts/test-scrape.ts [FROM] [TO] [YYYY-MM-DD]
import { launchBrowser, newStealthContext } from "../src/lib/browser.js";
import { scrapeFlightsForDate } from "../src/lib/scrape.js";
import { buildGoogleFlightsUrl } from "../src/lib/flights.js";

const from = process.argv[2] ?? "YYZ";
const to = process.argv[3] ?? "ICN";
const date = process.argv[4] ?? "2026-08-10";

async function main() {
  const url = buildGoogleFlightsUrl(from, to, date, "CAD");
  console.log("URL:", url);

  const browser = await launchBrowser();
  const context = await newStealthContext(browser);
  const page = await context.newPage();

  try {
    const offers = await scrapeFlightsForDate(
      page,
      { from, to, fromCity: from, toCity: to, earliestDeparture: date, arriveBy: date },
      date,
      "CAD",
      {
        avoidConflictZones: false,
        avoidMiddleEast: false,
        customAvoidCountries: (process.env.CUSTOM_EXCLUDE ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      }
    );
    console.log(`\nGot ${offers.length} offers`);
    for (const o of offers.slice(0, 5)) {
      console.log(
        `  $${o.price} ${o.validatingCarrierCode || "??"} ${o.itineraries[0].stops} stops, ` +
        `${o.itineraries[0].totalDurationMinutes} min, dep ${o.itineraries[0].segments[0].departure.at}`
      );
    }
    if (offers.length === 0) {
      console.log("\n-- no offers; diagnostics --");
      console.log("page title:", await page.title());
      console.log("url now:", page.url());
      const counts = await page.evaluate(() => ({
        liJsname: document.querySelectorAll("ul li[jsname], ul li[data-id]").length,
        listitem: document.querySelectorAll("[role='listitem']").length,
        ulRk10dc: document.querySelectorAll("ul.Rk10dc").length,
        ulRk10dcLi: document.querySelectorAll("ul.Rk10dc li").length,
        anyAria: document.querySelectorAll("[aria-label]").length,
      }));
      console.log("selector counts:", counts);
      await page.screenshot({ path: "/tmp/claude-1000/-home-yoyo-GitHub-not-work-buy-me-cheap-ticket-pls/bc097118-7a87-4d51-ad93-5ad4a2286c9e/scratchpad/scrape-debug.png", fullPage: false });
      console.log("screenshot saved to scratchpad/scrape-debug.png");
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
