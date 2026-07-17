import type { Browser } from "playwright-core";

// Launch Chromium for the web API.
// On Vercel (serverless): uses @sparticuz/chromium which provides a Lambda-compatible binary.
// On Railway / Render / local: falls back to the standard Playwright browser install.
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");

  // Vercel sets VERCEL=1; AWS Lambda sets AWS_LAMBDA_FUNCTION_NAME.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // sparticuz only extracts its bundled shared libraries (libnss3 etc.) and sets
    // LD_LIBRARY_PATH when AWS_EXECUTION_ENV / AWS_LAMBDA_JS_RUNTIME look like Lambda.
    // Vercel doesn't set those, so fake one BEFORE the import (the check runs at
    // module load) or Chromium dies with "libnss3.so: cannot open shared object file".
    if (!process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_JS_RUNTIME) {
      const major = parseInt(process.versions.node.split(".")[0], 10);
      process.env.AWS_LAMBDA_JS_RUNTIME = major >= 22 ? "nodejs22.x" : "nodejs20.x";
    }
    const { default: sparticuz } = await import("@sparticuz/chromium");
    // sparticuz.headless is the string "shell" (a Puppeteer convention);
    // Playwright requires a boolean.
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
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
