import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  // Vercel's output tracing misses playwright-core's browsers.json (loaded via a
  // computed path in coreBundle.js) and sparticuz's brotli-packed Chromium binary,
  // so the serverless function crashes with "Cannot find module …/browsers.json".
  // Force-include both packages for every scraping route.
  outputFileTracingIncludes: {
    "/api/search": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/monitor": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

export default nextConfig;
