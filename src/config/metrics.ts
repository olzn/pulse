export type MetricId =
  | "gasPrice"
  | "transactions24h"
  | "blockTime"
  | "validators"
  | "tvl"
  | "gnoPrice";

export type Timeframe = "live" | "1h" | "24h" | "7d" | "1mo" | "1yr" | "all";

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  live: "Live",
  "1h": "1H",
  "24h": "24H",
  "7d": "7D",
  "1mo": "1M",
  "1yr": "1Y",
  all: "All",
};

export const TIMEFRAME_SECS: Record<Timeframe, number> = {
  live: 300,
  "1h": 3_600,
  "24h": 86_400,
  "7d": 604_800,
  "1mo": 2_592_000,
  "1yr": 31_536_000,
  all: 157_680_000, // ~5 years
};

export interface MetricConfig {
  id: MetricId;
  label: string;
  description: string;
  explainer: string;
  format: (value: number) => string;
  invertSentiment?: boolean;
  trendPeriod: "7d" | "30d";
  timeframes: Timeframe[];
}

export function hasChart(config: MetricConfig): boolean {
  return config.timeframes.length > 1;
}

export function defaultTimeframe(config: MetricConfig): Timeframe {
  if (config.timeframes.includes("7d")) return "7d";
  const nonLive = config.timeframes.find((t) => t !== "live");
  return nonLive ?? "live";
}

export const METRICS: MetricConfig[] = [
  {
    id: "gasPrice",
    label: "Transaction cost",
    description: "Cost of a standard transfer",
    explainer:
      "This is how much it costs to send money on Gnosis Chain. " +
      "For context, a typical Ethereum transfer costs 100 to 500 times more.",
    format: (v: number) => {
      if (v < 0.01) return "< $0.01";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 3,
      }).format(v);
    },
    invertSentiment: true,
    trendPeriod: "7d",
    timeframes: ["live"],
  },
  {
    id: "transactions24h",
    label: "Transactions (24h)",
    description: "Transactions processed today",
    explainer:
      "The total number of transactions the network processed today. " +
      "More transactions generally means more people and apps are using the chain.",
    format: (v: number) => new Intl.NumberFormat("en-US").format(Math.round(v)),
    trendPeriod: "7d",
    timeframes: ["7d", "1mo"],
  },
  {
    id: "blockTime",
    label: "Block time",
    description: "Average time between blocks",
    explainer:
      "How quickly the network processes new batches of transactions. " +
      "Gnosis Chain targets one batch every 5 seconds. " +
      "Consistent block times mean the network is running smoothly.",
    format: (v: number) => `${v.toFixed(1)}s`,
    invertSentiment: true,
    trendPeriod: "7d",
    timeframes: ["live"],
  },
  {
    id: "validators",
    label: "Active validators",
    description: "Nodes securing the network",
    explainer:
      "Validators are computers that verify transactions and keep the network secure. " +
      "More validators means the network is more decentralised and harder to attack.",
    format: (v: number) => new Intl.NumberFormat("en-US").format(Math.round(v)),
    trendPeriod: "7d",
    timeframes: ["live"],
  },
  {
    id: "tvl",
    label: "Total value locked",
    description: "Assets deposited in Gnosis Chain protocols",
    explainer:
      "This measures how much money people have deposited into apps on Gnosis Chain. " +
      "Higher TVL generally signals more confidence in the ecosystem.",
    format: (v: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(v),
    trendPeriod: "30d",
    timeframes: ["live", "7d", "1mo", "1yr", "all"],
  },
  {
    id: "gnoPrice",
    label: "GNO price",
    description: "Current price of GNO token",
    explainer:
      "GNO is the native governance token of Gnosis Chain. " +
      "Validators stake GNO to secure the network, and it's used for governance decisions.",
    format: (v: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(v),
    trendPeriod: "7d",
    timeframes: ["live", "1h", "24h", "7d", "1mo", "1yr", "all"],
  },
];
