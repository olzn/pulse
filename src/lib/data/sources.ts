import type {
  BlockscoutStats,
  BlockscoutChartResponse,
  BeaconCommitteeResponse,
  DefiLlamaChain,
  DefiLlamaHistoricalTVL,
  CoinGeckoResponse,
  FiatRates,
} from "./types";

const BLOCKSCOUT_API_URL =
  process.env.BLOCKSCOUT_API_URL || "https://gnosis.blockscout.com/api/v2";
const BEACON_URL =
  process.env.GNOSIS_BEACON_URL || "https://rpc-gbc.gnosischain.com";
const COINGECKO_API_URL =
  process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
const DEFILLAMA_API_URL =
  process.env.DEFILLAMA_API_URL || "https://api.llama.fi";

// --- Retry utility ---

async function fetchWithRetry<T>(
  url: string,
  retries = 2,
  backoffMs = 1000,
): Promise<T> {
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
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * (attempt + 1)),
        );
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
  return fetchWithRetry<BlockscoutChartResponse>(
    `${BLOCKSCOUT_API_URL}/stats/charts/transactions`,
  );
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
  const chains = await fetchWithRetry<DefiLlamaChain[]>(
    `${DEFILLAMA_API_URL}/v2/chains`,
  );

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

let fiatRatesCache: { rates: FiatRates; fetchedAt: number } | null = null;
const FIAT_RATES_CACHE_TTL = 120 * 1000; // 120 seconds

const FALLBACK_RATES: FiatRates = { usd: 1, gbp: 0.79, eur: 0.92 };

export async function fetchFiatRates(): Promise<FiatRates> {
  // Return cached value if fresh (respect CoinGecko rate limits)
  if (fiatRatesCache && Date.now() - fiatRatesCache.fetchedAt < FIAT_RATES_CACHE_TTL) {
    return fiatRatesCache.rates;
  }

  try {
    const data = await fetchWithRetry<CoinGeckoResponse>(
      `${COINGECKO_API_URL}/simple/price?ids=xdai&vs_currencies=usd,gbp,eur`,
    );

    const rates: FiatRates = {
      usd: data.xdai.usd,
      gbp: data.xdai.gbp,
      eur: data.xdai.eur,
    };

    fiatRatesCache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    // Fall back to hardcoded rates if CoinGecko is unavailable
    if (fiatRatesCache) return fiatRatesCache.rates;
    return FALLBACK_RATES;
  }
}
