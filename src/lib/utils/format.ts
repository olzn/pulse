const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

/**
 * Calculate fiat cost of a transaction given gas price in gwei,
 * gas limit, and the coin price in USD.
 */
export function formatFiatCost(
  gasPriceGwei: number,
  gasLimit: number,
  coinPriceUsd: number,
): number {
  return gasPriceGwei * gasLimit * 1e-9 * coinPriceUsd;
}

/**
 * Returns a human-readable relative time string like "2 minutes ago".
 */
export function timeAgo(isoString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000,
  );

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
