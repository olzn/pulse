import { formatFiatCost } from "@/lib/utils/format";
import { deriveStatus } from "@/lib/utils/health";
import { getCachedMetrics, getTrend7d, setCachedMetrics } from "./cache";
import {
  fetchBlockscoutStats,
  fetchBlockscoutTxChart,
  fetchFiatRatesAndGno,
  fetchHistoricalTVL,
  fetchTVL,
  fetchValidatorCount,
  type GnoPrice,
} from "./sources";
import type { DefiLlamaHistoricalTVL, FiatRates, MetricsResponse } from "./types";

const STANDARD_TRANSFER_GAS = 21_000;
const BLOCK_TIME_TARGET = 5;

function computeTvlTrend(history: DefiLlamaHistoricalTVL[]): number | null {
  if (history.length < 31) return null;
  const recent = history[history.length - 1].tvl;
  const past = history[history.length - 31].tvl;
  if (past === 0) return null;
  return ((recent - past) / past) * 100;
}

export async function aggregateMetrics(): Promise<MetricsResponse> {
  const sources: string[] = [];

  // Fetch all sources independently
  const [statsResult, chartResult, validatorsResult, tvlResult, tvlHistoryResult, coinGeckoResult] =
    await Promise.allSettled([
      fetchBlockscoutStats(),
      fetchBlockscoutTxChart(),
      fetchValidatorCount(),
      fetchTVL(),
      fetchHistoricalTVL(),
      fetchFiatRatesAndGno(),
    ]);

  // --- Blockscout stats (primary — required) ---
  if (statsResult.status === "rejected") {
    const cached = getCachedMetrics();
    if (cached) {
      return { ...cached, meta: { ...cached.meta, stale: true } };
    }
    throw new Error(`Blockscout stats unavailable: ${statsResult.reason}`);
  }

  const stats = statsResult.value;
  sources.push("blockscout");

  const gasPriceGwei = stats.gas_prices.average;
  const coinPriceUsd = Number.parseFloat(stats.coin_price) || 1;
  const transactionsToday = Number.parseInt(stats.transactions_today, 10) || 0;
  const blockTimeMs = stats.average_block_time;
  const blockTimeSeconds = blockTimeMs / 1000;
  const fiatCost = formatFiatCost(gasPriceGwei, STANDARD_TRANSFER_GAS, coinPriceUsd);
  const deviationPercent = Math.abs(
    ((blockTimeSeconds - BLOCK_TIME_TARGET) / BLOCK_TIME_TARGET) * 100,
  );

  // --- Transaction 7d trend ---
  let txTrend7d: number | null = null;
  if (chartResult.status === "fulfilled") {
    const chartData = chartResult.value.chart_data;
    if (chartData.length >= 8) {
      const recent = chartData[chartData.length - 1].transactions_count;
      const weekAgo = chartData[chartData.length - 8].transactions_count;
      if (weekAgo > 0) {
        txTrend7d = ((recent - weekAgo) / weekAgo) * 100;
      }
    }
  }

  // --- Validators ---
  let validatorCount = 0;
  let validatorTrend7d: number | null = null;
  if (validatorsResult.status === "fulfilled") {
    validatorCount = validatorsResult.value;
    sources.push("beacon");
    try {
      validatorTrend7d = await getTrend7d("validators", validatorCount);
    } catch {
      // KV unavailable — no trend
    }
  }

  // --- Gas price trend from KV ---
  let gasTrend7d: number | null = null;
  try {
    gasTrend7d = await getTrend7d("gas", gasPriceGwei);
  } catch {
    // KV unavailable — no trend
  }

  // --- TVL ---
  let tvlUsd = 0;
  let tvlTrend30d: number | null = null;
  if (tvlResult.status === "fulfilled") {
    tvlUsd = tvlResult.value;
    sources.push("defillama");
  }
  if (tvlHistoryResult.status === "fulfilled") {
    tvlTrend30d = computeTvlTrend(tvlHistoryResult.value);
  }

  // --- Fiat rates + GNO price ---
  let fiatRates: FiatRates = { usd: 1, gbp: 0.79, eur: 0.92 };
  let gno: GnoPrice = { usd: 0, gbp: 0, eur: 0, trend24h: null };
  if (coinGeckoResult.status === "fulfilled") {
    fiatRates = coinGeckoResult.value.rates;
    gno = coinGeckoResult.value.gno;
    sources.push("coingecko");
  }

  const metrics: MetricsResponse["metrics"] = {
    gasPrice: {
      current: gasPriceGwei,
      fiatCost,
      trend7d: gasTrend7d,
    },
    transactions24h: {
      count: transactionsToday,
      trend7d: txTrend7d,
    },
    blockTime: {
      averageSeconds: blockTimeSeconds,
      target: BLOCK_TIME_TARGET,
      deviationPercent,
    },
    validators: {
      active: validatorCount,
      trend7d: validatorTrend7d,
    },
    tvl: {
      totalUsd: tvlUsd,
      trend30d: tvlTrend30d,
    },
    gnoPrice: {
      usd: gno.usd,
      trend24h: gno.trend24h,
    },
  };

  const status = deriveStatus(metrics);

  const response: MetricsResponse = {
    timestamp: new Date().toISOString(),
    status,
    metrics,
    fiatRates,
    meta: {
      lastUpdated: new Date().toISOString(),
      sources,
      stale: false,
    },
  };

  setCachedMetrics(response);
  return response;
}
