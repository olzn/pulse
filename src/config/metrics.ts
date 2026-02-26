export type MetricId =
  | "gasPrice"
  | "transactions24h"
  | "blockTime"
  | "validators"
  | "tvl";

export interface MetricConfig {
  id: MetricId;
  label: string;
  description: string;
  explainer: string;
  format: (value: number) => string;
  invertSentiment?: boolean;
  trendPeriod: "7d" | "30d";
  hasHistory: boolean;
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
    hasHistory: false, // Requires KV snapshots — enabled once cron accumulates data
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
    hasHistory: true,
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
    hasHistory: false,
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
    hasHistory: false, // Requires KV snapshots — enabled once cron accumulates data
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
    hasHistory: true,
  },
];
