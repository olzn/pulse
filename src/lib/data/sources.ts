import type {
  BeaconCommitteeResponse,
  BlockscoutChartResponse,
  BlockscoutStats,
  CoinGeckoMarketChart,
  CoinGeckoResponse,
  CryptoCompareHistoryResponse,
  DefiLlamaChain,
  DefiLlamaHistoricalTVL,
  FiatRates,
} from "./types";

const BLOCKSCOUT_API_URL = process.env.BLOCKSCOUT_API_URL || "https://gnosis.blockscout.com/api/v2";
const BEACON_URL = process.env.GNOSIS_BEACON_URL || "https://rpc-gbc.gnosischain.com";
const COINGECKO_API_URL = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
const DEFILLAMA_API_URL = process.env.DEFILLAMA_API_URL || "https://api.llama.fi";

// --- Retry utility ---

async function fetchWithRetry<T>(url: string, retries = 2, backoffMs = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status >= 400 && response.status < 500) {
        throw new Error(`${url} returned ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.message.includes("returned 4")) {
        throw lastError;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// --- Blockscout ---

export async function fetchBlockscoutStats(): Promise<BlockscoutStats> {
  return fetchWithRetry<BlockscoutStats>(`${BLOCKSCOUT_API_URL}/stats`);
}

export async function fetchBlockscoutTxChart(): Promise<BlockscoutChartResponse> {
  return fetchWithRetry<BlockscoutChartResponse>(`${BLOCKSCOUT_API_URL}/stats/charts/transactions`);
}

// --- Beacon chain (validators) ---

let validatorCache: { count: number; fetchedAt: number } | null = null;
const VALIDATOR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchValidatorCount(): Promise<number> {
  // Return cached value if fresh
  if (validatorCache && Date.now() - validatorCache.fetchedAt < VALIDATOR_CACHE_TTL) {
    return validatorCache.count;
  }

  const data = await fetchWithRetry<BeaconCommitteeResponse>(
    `${BEACON_URL}/eth/v1/beacon/states/head/committees`,
    1, // fewer retries — large response
    2000,
  );

  // Count unique validator indices across all committees
  const uniqueValidators = new Set<string>();
  for (const committee of data.data) {
    for (const v of committee.validators) {
      uniqueValidators.add(v);
    }
  }

  const count = uniqueValidators.size;
  validatorCache = { count, fetchedAt: Date.now() };
  return count;
}

// --- DefiLlama (TVL) ---

export async function fetchTVL(): Promise<number> {
  const chains = await fetchWithRetry<DefiLlamaChain[]>(`${DEFILLAMA_API_URL}/v2/chains`);

  const gnosis = chains.find((c) => c.name === "Gnosis");
  if (!gnosis) throw new Error("Gnosis not found in DefiLlama chains");

  return gnosis.tvl;
}

export async function fetchHistoricalTVL(): Promise<DefiLlamaHistoricalTVL[]> {
  return fetchWithRetry<DefiLlamaHistoricalTVL[]>(
    `${DEFILLAMA_API_URL}/v2/historicalChainTvl/Gnosis`,
  );
}

// --- CoinGecko (fiat rates) ---

let coinGeckoCache: { data: { rates: FiatRates; gno: GnoPrice }; fetchedAt: number } | null = null;
const FIAT_RATES_CACHE_TTL = 120 * 1000; // 120 seconds

const FALLBACK_RATES: FiatRates = { usd: 1, gbp: 0.79, eur: 0.92 };

export interface GnoPrice {
  usd: number;
  gbp: number;
  eur: number;
  trend24h: number | null;
}

const FALLBACK_GNO: GnoPrice = { usd: 0, gbp: 0, eur: 0, trend24h: null };

export async function fetchFiatRatesAndGno(): Promise<{ rates: FiatRates; gno: GnoPrice }> {
  // Return cached value if fresh (respect CoinGecko rate limits)
  if (coinGeckoCache && Date.now() - coinGeckoCache.fetchedAt < FIAT_RATES_CACHE_TTL) {
    return coinGeckoCache.data;
  }

  try {
    const data = await fetchWithRetry<CoinGeckoResponse>(
      `${COINGECKO_API_URL}/simple/price?ids=xdai,gnosis&vs_currencies=usd,gbp,eur&include_24hr_change=true`,
    );

    const rates: FiatRates = {
      usd: data.xdai.usd,
      gbp: data.xdai.gbp,
      eur: data.xdai.eur,
    };

    const gno: GnoPrice = {
      usd: data.gnosis.usd,
      gbp: data.gnosis.gbp,
      eur: data.gnosis.eur,
      trend24h: data.gnosis.usd_24h_change ?? null,
    };

    const result = { rates, gno };
    coinGeckoCache = { data: result, fetchedAt: Date.now() };
    return result;
  } catch {
    // Fall back if CoinGecko is unavailable
    if (coinGeckoCache) return coinGeckoCache.data;
    return { rates: FALLBACK_RATES, gno: FALLBACK_GNO };
  }
}

// --- CoinGecko (GNO historical price — kept for backwards compat) ---

export async function fetchGnoPriceHistory(): Promise<CoinGeckoMarketChart> {
  return fetchWithRetry<CoinGeckoMarketChart>(
    `${COINGECKO_API_URL}/coins/gnosis/market_chart?vs_currency=usd&days=30&interval=daily`,
  );
}

// --- CryptoCompare (GNO price history — minute/hourly/daily) ---

const CRYPTOCOMPARE_API_URL = "https://min-api.cryptocompare.com/data/v2";

export async function fetchGnoPriceMinute(limit: number): Promise<CryptoCompareHistoryResponse> {
  return fetchWithRetry<CryptoCompareHistoryResponse>(
    `${CRYPTOCOMPARE_API_URL}/histominute?fsym=GNO&tsym=USD&limit=${limit}`,
  );
}

export async function fetchGnoPriceHourly(limit: number): Promise<CryptoCompareHistoryResponse> {
  return fetchWithRetry<CryptoCompareHistoryResponse>(
    `${CRYPTOCOMPARE_API_URL}/histohour?fsym=GNO&tsym=USD&limit=${limit}`,
  );
}

export async function fetchGnoPriceDaily(
  limit: number,
  allData = false,
): Promise<CryptoCompareHistoryResponse> {
  const params = allData ? "fsym=GNO&tsym=USD&allData=true" : `fsym=GNO&tsym=USD&limit=${limit}`;
  return fetchWithRetry<CryptoCompareHistoryResponse>(
    `${CRYPTOCOMPARE_API_URL}/histoday?${params}`,
  );
}

export function normalizeCryptoCompare(
  data: CryptoCompareHistoryResponse,
): Array<{ timestamp: string; value: number }> {
  return data.Data.Data.map((d) => ({
    timestamp: new Date(d.time * 1000).toISOString(),
    value: d.close,
  }));
}
