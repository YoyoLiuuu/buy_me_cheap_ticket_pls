// Debug: dump aria-labels / structure of Google Flights result items.
import { launchBrowser, newStealthContext } from "../src/lib/browser.js";
import { buildGoogleFlightsUrl } from "../src/lib/flights.js";

async function main() {
  const url = buildGoogleFlightsUrl("YYZ", "ICN", "2026-08-10", "CAD");
  const browser = await launchBrowser();
  const context = await newStealthContext(browser);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("ul.Rk10dc", { timeout: 15000 });
  await page.waitForTimeout(2000);

  const items = await page.evaluate(() => {
    const out: { idx: number; tag: string; aria: string; labeled: string[]; href: string }[] = [];
    document.querySelectorAll("ul.Rk10dc > li").forEach((li, idx) => {
      const labeled: string[] = [];
      li.querySelectorAll("[aria-label]").forEach((el) => {
        const l = el.getAttribute("aria-label") ?? "";
        if (l.length > 10) labeled.push(l.slice(0, 300));
      });
      out.push({
        idx,
        tag: li.className,
        aria: (li.getAttribute("aria-label") ?? "").slice(0, 400),
        labeled: labeled.slice(0, 6),
        href: (li.querySelector("a") as HTMLAnchorElement | null)?.href ?? "",
      });
    });
    return out;
  });

  for (const it of items.slice(0, 4)) {
    console.log(`\n=== li #${it.idx} class=${it.tag}`);
    console.log("  own aria:", it.aria || "(none)");
    it.labeled.forEach((l, i) => console.log(`  child[${i}]:`, l));
  }
  console.log(`\ntotal items: ${items.length}`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
