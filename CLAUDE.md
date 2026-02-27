# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gnosis Pulse is a Gnosis Chain vitals dashboard — a "weather app" for blockchain infrastructure. It displays 5 live network metrics with charts, trends, and animations, targeting non-technical users. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Motion, and Liveline charts.

## Commands

```bash
pnpm dev              # Dev server (Turbopack)
pnpm build            # Production build
pnpm check            # Biome lint + format (auto-fix)
pnpm lint             # Biome lint only
pnpm format           # Biome format only
```

No test framework is configured yet.

## Architecture

### Data flow

```
4 External APIs (Blockscout, Beacon, DefiLlama, CoinGecko)
  → src/lib/data/sources.ts      (fetchers with retry logic)
  → src/lib/data/aggregator.ts   (combines, normalises, computes trends)
  → src/app/api/metrics/route.ts (GET endpoint, CDN-cached 30s)
  → Vercel CDN edge cache
  → TanStack Query (client polls every 30s)
  → UI components (animated cards, charts)
```

Chart history has a separate path: `/api/history?metric=X` → Liveline canvas chart.

### Caching layers

1. **Vercel CDN** (primary): `s-maxage=30, stale-while-revalidate=10` on API routes
2. **In-memory fallback** (`src/lib/data/cache.ts`): module-scoped variable, served with `stale: true` when upstream fails
3. **Upstash Redis** (daily snapshots only): stores gas/validator values for 7-day trend calculation via `/api/cron/snapshots` (daily midnight UTC cron). Not yet provisioned.

### Key patterns

- **`Promise.allSettled` for sources**: Each data source is independent. Failed sources degrade gracefully to cached values; only Blockscout stats is mandatory.
- **SSR hydration**: `page.tsx` prefetches via TanStack Query on the server, passes to client via `HydrationBoundary` + `dehydrate` — no loading flash.
- **Config-driven metrics**: `src/config/metrics.ts` defines all 5 metrics (label, format function, explainer text, trend period, `hasHistory` flag). Add/remove metrics here without touching components.
- **Currency context** (`src/lib/hooks/use-currency.tsx`): Auto-detects browser locale → currency (USD/GBP/EUR). CoinGecko fiat rates applied via `convert()`. Hardcoded fallback rates if API fails.
- **Health derivation** (`src/lib/utils/health.ts`): `deriveStatus()` checks block time deviation, gas price, and validator count → "healthy"/"degraded"/"down".

### Liveline chart gotchas

- Time values must be **Unix seconds** (not milliseconds)
- `window` prop is mandatory for historical data
- Colors must be **hex/rgb strings**, not CSS custom properties
- Parent container must have an **explicit height**
- Use React `key` prop to swap chart data, not LivelineTransition

### Animation approach

- **Motion** (formerly Framer Motion) with `LazyMotion` + `domAnimation` features (~22KB, not domMax)
- Spring-animated number counters via `useSpring` + `useTransform`
- Staggered card entry via `staggerContainer` + `fadeUp` variants (`src/lib/motion/variants.ts`)
- Status dot: infinite pulsing scale/opacity animation

## Project structure (key directories)

- `src/app/api/` — Three route handlers: `metrics`, `history`, `cron/snapshots`
- `src/lib/data/` — Data layer: `sources.ts` (API fetchers), `aggregator.ts` (normalisation), `cache.ts` (fallback + KV), `types.ts` (all interfaces)
- `src/lib/hooks/` — TanStack Query hooks (`use-metrics`, `use-history`) and currency provider
- `src/config/metrics.ts` — Metric definitions (the source of truth for what metrics exist)
- `src/components/` — UI split into `hero/`, `metrics/`, `chart/`, `layout/`, `ui/`

## Environment variables

All APIs are public/free (no auth keys). `.env.local` defines base URLs for Blockscout, Beacon, CoinGecko, DefiLlama. Upstash Redis vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) and `CRON_SECRET` are not yet provisioned — KV-dependent features (gas/validator charts and 7-day trends) return `null` until set up.

## Current status

Phase 2 complete. 5 metrics live, 2 charts working (transactions24h, tvl). Gas and validator charts blocked on Upstash provisioning. Phase 3 (bridge volume metric) not started. See `PROGRESS.md` for details.

## Tooling

- **Biome** replaces ESLint + Prettier. Run `pnpm check` before committing.
- Path alias: `@/*` maps to `./src/*`
- TypeScript strict mode enabled
