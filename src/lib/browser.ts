import type { Browser } from "playwright-core";

// Launch Chromium for the web API.
// On Vercel (serverless): uses @sparticuz/chromium which provides a Lambda-compatible binary.
// On Railway / Render / local: falls back to the standard Playwright browser install.
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");

  // Vercel sets VERCEL=1; AWS Lambda sets AWS_LAMBDA_FUNCTION_NAME.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const { default: sparticuz } = await import("@sparticuz/chromium");
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: sparticuz.headless ?? true,
    });
  }

  // Traditional server — playwright install chromium must have been run during build.
  // If system deps (libnss3 etc.) can't be installed with sudo, extracted copies in
  // ~/.cache/ms-playwright/extra-libs are picked up via LD_LIBRARY_PATH.
  const { existsSync } = await import("node:fs");
  const { homedir } = await import("node:os");
  const extraLibs = `${homedir()}/.cache/ms-playwright/extra-libs`;
  const env = existsSync(extraLibs)
    ? {
        ...process.env,
        LD_LIBRARY_PATH: [extraLibs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
      }
    : undefined;

  return chromium.launch({
    headless: true,
    env,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
}

export async function newStealthContext(browser: Browser) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-CA",
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  return context;
}
