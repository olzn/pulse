import { Redis } from "@upstash/redis";
import type { MetricsResponse } from "./types";

// --- In-memory fallback cache (hot path) ---

let cachedResponse: MetricsResponse | null = null;
let cachedAt = 0;

export function getCachedMetrics(): MetricsResponse | null {
  return cachedResponse;
}

export function setCachedMetrics(data: MetricsResponse): void {
  cachedResponse = data;
  cachedAt = Date.now();
}

export function isCacheStale(maxAgeMs = 5 * 60 * 1000): boolean {
  if (!cachedResponse) return true;
  return Date.now() - cachedAt > maxAgeMs;
}

// --- Upstash Redis (daily trend snapshots) ---

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

function todayKey(metric: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `snapshot:${metric}:${date}`;
}

function dateKey(metric: string, date: string): string {
  return `snapshot:${metric}:${date}`;
}

/**
 * Save a daily snapshot for a metric. TTL: 14 days.
 */
export async function saveSnapshot(metric: string, value: number): Promise<void> {
  const r = getRedis();
  if (!r) return;

  await r.set(todayKey(metric), value, { ex: 86400 * 14 });
}

/**
 * Get a snapshot for a specific date.
 */
export async function getSnapshot(metric: string, date: string): Promise<number | null> {
  const r = getRedis();
  if (!r) return null;

  const val = await r.get<number>(dateKey(metric, date));
  return val;
}

/**
 * Compute 7-day trend percentage for a metric.
 * Returns null if no snapshot exists from 7 days ago.
 */
export async function getTrend7d(
  metric: string,
  currentValue: number,
): Promise<number | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000)
    .toISOString()
    .split("T")[0];

  const previousValue = await getSnapshot(metric, sevenDaysAgo);
  if (previousValue === null || previousValue === 0) return null;

  return ((currentValue - previousValue) / previousValue) * 100;
}
