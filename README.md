# Gnosis Pulse

A real-time network vitals dashboard for [Gnosis Chain](https://www.gnosis.io/). Gnosis Pulse tracks key health metrics — transaction volume, gas costs, block times, validator count, TVL, and GNO price — and presents them through interactive charts with multi-timeframe support.

## Metrics

| Metric | Description | Data source |
|--------|-------------|-------------|
| Transaction cost | Cost of a standard transfer in USD | Gnosis Beacon + CoinGecko |
| Transactions (24h) | Daily transaction count | Blockscout |
| Block time | Average seconds between blocks | Gnosis Beacon |
| Validators | Active validator count | Gnosis Beacon |
| TVL | Total value locked across Gnosis DeFi | DefiLlama |
| GNO price | Current GNO token price in USD | CoinGecko + CryptoCompare |

Each metric supports the timeframes its data source can provide — from 5-second live polling to full multi-year history.

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **TanStack React Query** for data fetching and SSR hydration
- **Liveline** for animated, interactive canvas charts
- **Framer Motion** for UI transitions
- **Tailwind CSS 4** for styling
- **Biome** for linting and formatting
- **Upstash Redis** for snapshot caching

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=...    # optional, for snapshot caching
UPSTASH_REDIS_REST_TOKEN=...  # optional, for snapshot caching
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm check` | Run Biome lint + format (auto-fix) |
| `pnpm lint` | Lint only |
| `pnpm format` | Format only |

## License

MIT
