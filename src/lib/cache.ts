import type { LegResult } from "@/types";

interface CacheEntry {
  data: LegResult;
  expiresAt: number;
}

// In-process cache — lives for the duration of a serverless function warm instance.
// For cross-instance caching, Vercel KV or Redis should be used.
const cache = new Map<string, CacheEntry>();

const TTL_MS = 60 * 60 * 1000; // 1 hour

export function getCacheKey(
  from: string,
  to: string,
  dates: string,
  flexibility: number,
  filters: string
): string {
  return `${from}-${to}-${dates}-${flexibility}-${filters}`;
}

export function getCachedResult(key: string): LegResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedResult(key: string, data: LegResult): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export function buildCacheKey(
  from: string,
  to: string,
  earliestDeparture: string,
  latestDeparture: string,
  flexibility: number,
  avoidMiddleEast: boolean,
  avoidConflictZones: boolean
): string {
  return `${from}|${to}|${earliestDeparture}|${latestDeparture}|flex${flexibility}|me${avoidMiddleEast}|cz${avoidConflictZones}`;
}
