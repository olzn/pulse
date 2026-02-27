/** Raw response from Blockscout /api/v2/stats */
export interface BlockscoutStats {
  average_block_time: number;
  coin_price: string;
  coin_price_change_percentage: number;
  gas_prices: {
    slow: number;
    average: number;
    fast: number;
  };
  gas_price_updated_at: string;
  transactions_today: string;
  total_transactions: string;
  total_addresses: string;
  total_blocks: string;
  network_utilization_percentage: number;
  tvl: string | null;
  gas_used_today: string;
  market_cap: string;
}

/** Raw response from Blockscout /api/v2/stats/charts/transactions */
export interface BlockscoutChartResponse {
  chart_data: Array<{
    date: string;
    transactions_count: number;
  }>;
}

/** Raw beacon chain committee response */
export interface BeaconCommitteeResponse {
  data: Array<{
    index: string;
    slot: string;
    validators: string[];
  }>;
}

/** DefiLlama /v2/chains response (array of chain objects) */
export interface DefiLlamaChain {
  gecko_id: string;
  tvl: number;
  tokenSymbol: string;
  cmcId: string;
  name: string;
  chainId: number | null;
}

/** DefiLlama historical TVL response */
export interface DefiLlamaHistoricalTVL {
  date: number;
  tvl: number;
}

/** CoinGecko simple price response */
export interface CoinGeckoResponse {
  xdai: {
    usd: number;
    gbp: number;
    eur: number;
  };
  gnosis: {
    usd: number;
    gbp: number;
    eur: number;
    usd_24h_change?: number;
  };
}

/** CoinGecko market_chart response */
export interface CoinGeckoMarketChart {
  prices: [number, number][]; // [timestamp_ms, price_usd]
}

/** CryptoCompare historical price response */
export interface CryptoCompareHistoryResponse {
  Data: {
    Data: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
  };
}

/** Supported fiat currencies */
export type FiatCurrency = "USD" | "GBP" | "EUR";

/** Fiat exchange rates for xDAI */
export interface FiatRates {
  usd: number;
  gbp: number;
  eur: number;
}

/** Normalised metrics response */
export interface MetricsResponse {
  timestamp: string;
  status: "healthy" | "degraded" | "down";
  metrics: {
    gasPrice: {
      current: number;
      fiatCost: number;
      trend7d: number | null;
    };
    transactions24h: {
      count: number;
      trend7d: number | null;
    };
    blockTime: {
      averageSeconds: number;
      target: number;
      deviationPercent: number;
    };
    validators: {
      active: number;
      trend7d: number | null;
    };
    tvl: {
      totalUsd: number;
      trend30d: number | null;
    };
    gnoPrice: {
      usd: number;
      trend24h: number | null;
    };
  };
  fiatRates: FiatRates;
  meta: {
    lastUpdated: string;
    sources: string[];
    stale: boolean;
  };
}

/** History API response */
export interface HistoryResponse {
  metric: string;
  timeframe: string;
  granularity: "minute" | "hourly" | "daily";
  points: Array<{
    timestamp: string;
    value: number;
  }>;
}
