# Pulse — Technical Specification

**A Gnosis Chain vitals dashboard for humans**

| | |
|---|---|
| **Author** | Oscar |
| **Version** | 0.1 |
| **Date** | February 2026 |
| **Status** | Draft |
| **PRD** | pulse-prd.md |

---

## 1. Summary

This document describes the technical architecture, stack choices, data pipeline, component design, and deployment strategy for Pulse. The goal is a single-page React application that loads fast, animates smoothly, polls live blockchain data, and looks exceptional on every screen size.

---

## 2. Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Static generation for the shell, server components for data fetching, edge runtime for the API layer. Keeps everything in one repo. |
| Language | **TypeScript** | Non-negotiable for a data-heavy app with multiple API contracts. |
| Styling | **Tailwind CSS 4** | Utility-first, zero-runtime, excellent dark mode support via `class` strategy. |
| Animation | **Motion** (formerly Framer Motion) | Declarative, layout-aware animations with spring physics. Used for metric card transitions, number counters, chart reveals, and micro-interactions. |
| Charts | **Liveline** | Lightweight React component for real-time animated line charts. Canvas-based, zero dependencies beyond React 18, 60fps interpolation between data points. Purpose-built for live data feeds — no manual React wrapper needed, smooth transitions are built in. See https://benji.org/liveline. |
| Data fetching | **TanStack Query v5** | Handles polling intervals, stale-while-revalidate, background refetching, and error/retry logic out of the box. |
| OG image | **@vercel/og** (Satori) | Edge-rendered Open Graph images using JSX templates. Updates dynamically with current chain status. |
| Linting | **Biome** | Single tool for formatting and linting. Faster than ESLint + Prettier. |
| Package manager | **pnpm** | Fast, strict, disk-efficient. |
| Hosting | **Vercel** | Zero-config Next.js deployment, edge functions, analytics, speed insights. |

---

## 3. Project structure

```
pulse/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, fonts, metadata
│   │   ├── page.tsx                # Home page (server component)
│   │   ├── api/
│   │   │   ├── metrics/route.ts    # Aggregated metrics endpoint
│   │   │   ├── history/route.ts    # Historical data endpoint
│   │   │   └── og/route.tsx        # Dynamic OG image generation
│   │   └── globals.css             # Tailwind base + custom properties
│   │
│   ├── components/
│   │   ├── hero/
│   │   │   ├── hero.tsx            # Status summary with health indicator
│   │   │   └── status-dot.tsx      # Animated green/amber/red dot
│   │   ├── metrics/
│   │   │   ├── metric-card.tsx     # Individual metric card
│   │   │   ├── metric-grid.tsx     # Responsive grid layout
│   │   │   ├── animated-number.tsx # Spring-animated number counter
│   │   │   ├── trend-badge.tsx     # Up/down percentage badge
│   │   │   └── explainer.tsx       # Expandable "What does this mean?"
│   │   ├── chart/
│   │   │   ├── history-chart.tsx   # 30-day line chart
│   │   │   └── chart-toggle.tsx    # Metric selector for chart
│   │   ├── calculator/
│   │   │   ├── cost-calculator.tsx # Transaction cost estimator
│   │   │   └── chain-comparison.tsx# Side-by-side Gnosis vs Ethereum
│   │   ├── layout/
│   │   │   ├── header.tsx          # Minimal top bar
│   │   │   ├── footer.tsx          # Data sources, last updated
│   │   │   └── stale-banner.tsx    # Shown when data is >5min old
│   │   └── ui/
│   │       ├── skeleton.tsx        # Loading skeleton components
│   │       ├── tooltip.tsx         # Lightweight tooltip
│   │       └── toggle.tsx          # Fiat/crypto toggle
│   │
│   ├── lib/
│   │   ├── data/
│   │   │   ├── sources.ts          # API client for each data source
│   │   │   ├── aggregator.ts       # Combines + normalises all sources
│   │   │   ├── cache.ts            # In-memory fallback cache + KV snapshot helpers
│   │   │   └── types.ts            # Shared data types
│   │   ├── hooks/
│   │   │   ├── use-metrics.ts      # TanStack Query hook for metrics
│   │   │   ├── use-history.ts      # TanStack Query hook for history
│   │   │   └── use-currency.ts     # Fiat currency detection + toggle
│   │   ├── utils/
│   │   │   ├── format.ts           # Number, currency, date formatters
│   │   │   ├── health.ts           # Health status calculation logic
│   │   │   └── constants.ts        # Gas limits, chain config, etc.
│   │   └── motion/
│   │       └── variants.ts         # Shared Motion animation variants
│   │
│   └── config/
│       ├── metrics.ts              # Metric definitions and metadata
│       └── site.ts                 # Site metadata, OG defaults
│
├── public/
│   └── fonts/                      # Self-hosted variable fonts
│
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── biome.json
└── package.json
```

---

## 4. Data architecture

### 4.1 Data flow

The architecture uses CDN-first on-demand revalidation rather than server-side polling. There is no separate aggregator process or cron job — the `/api/metrics` route handler fetches upstream data on each CDN miss, and the CDN caches the response for 30 seconds.

```
┌─────────────────────────────────────────────────┐
│                  Data Sources                    │
│  Blockscout │  DefiLlama  │  CoinGecko │ Beacon │
│  /api/v2    │  API        │  API       │ API    │
└───┬─────────┴──────┬──────┴─────┬──────┴───┬────┘
    │                │            │           │
    ▼                ▼            ▼           ▼
┌─────────────────────────────────────────────────┐
│         /api/metrics route handler               │
│  Fetches all sources on-demand (3-5 HTTP calls)  │
│  Normalises → returns JSON                       │
│  Cache-Control: s-maxage=30, stale-while-rev=10  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Vercel CDN Edge Cache                │
│  Caches response for 30s per edge location       │
│  Serves stale for 10s while revalidating         │
│  Strips s-maxage before sending to browser       │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│            React Client                          │
│  TanStack Query polls /api/metrics every 30s     │
│  staleTime: 30s  │  gcTime: 5min                 │
│  HydrationBoundary for SSR prefetch              │
└─────────────────────────────────────────────────┘
```

This means upstream APIs are hit at most once per ~30 seconds per CDN edge location, regardless of how many users are polling. No Vercel KV is needed in the hot path.

### 4.2 Metrics API response shape

```typescript
interface MetricsResponse {
  timestamp: string;                // ISO 8601
  status: "healthy" | "degraded" | "down";
  metrics: {
    gasPrice: {
      current: number;             // in gwei
      fiat: number;                // cost of a standard transfer in user's fiat
      fiatCurrency: string;        // "GBP", "USD", etc.
      trend7d: number;             // percentage change vs 7 days ago
    };
    transactions24h: {
      count: number;
      trend7d: number;
      contextLabel: string;        // "Roughly the same as a small city's daily card transactions"
    };
    validators: {
      active: number;
      total: number;
      trend7d: number;
    };
    bridgeVolume7d: {
      netFlowFiat: number;
      direction: "inflow" | "outflow";
      fiatCurrency: string;
    };
    tvl: {
      totalFiat: number;
      fiatCurrency: string;
      trend30d: number;
    };
    blockTime: {
      averageSeconds: number;
      target: number;              // 5
      deviationPercent: number;
    };
  };
  meta: {
    lastUpdated: string;           // ISO 8601
    sources: string[];             // ["gnosis-rpc", "defillama", ...]
    stale: boolean;                // true if data is >5min old
  };
}
```

### 4.3 History API response shape

```typescript
interface HistoryResponse {
  metric: string;                  // "transactions24h" | "tvl" | "gasPrice" | ...
  granularity: "hourly" | "daily";
  points: Array<{
    timestamp: string;
    value: number;
  }>;
}
```

### 4.4 Data source details

**Blockscout API (primary data source)**

Blockscout provides pre-aggregated chain statistics, eliminating the need for raw RPC block-level calculations. Two endpoints cover most metrics:

```typescript
// Current chain stats — gas prices, tx count, block time, TVL, coin price
const stats = await fetch("https://gnosis.blockscout.com/api/v2/stats");
// Response includes:
// - gas_prices: { slow, average, fast } (in gwei)
// - transactions_today: number
// - average_block_time: number (milliseconds)
// - coin_price: string (xDAI price in USD)
// - total_blocks, total_addresses, network_utilization_percentage

// 31-day transaction history (daily granularity)
const txChart = await fetch(
  "https://gnosis.blockscout.com/api/v2/stats/charts/transactions"
);
// Response: { chart_data: [{ date: "2026-02-25", transactions_count: 144689 }, ...] }
```

This replaces the block-sampling approach (which would require ~1,728 RPC calls and exceed serverless timeouts) with a single HTTP call.

**Gnosis Chain RPC (fallback)**

Used only when Blockscout is unavailable, or for data Blockscout doesn't provide:

```typescript
// Gas price (fallback only)
const gasPrice = await provider.send("eth_gasPrice", []);
```

RPC endpoint options (in priority order): `rpc.gnosischain.com` (official, transitioning from Gateway.fm to Tenderly), Ankr public RPC, dRPC. Use a fallback chain: if the primary fails, try the next. The `rpc.gnosischain.com` URL is provider-agnostic and remains unchanged during the infrastructure transition.

**Beacon chain API (validators)**

```
GET https://rpc-gbc.gnosischain.com/eth/v1/beacon/states/head/committees?epoch=current
```

Important: do NOT fetch the full validator set. Gnosis Chain has 300,000+ active validators, which would produce a 150-210 MB JSON response — impractical for serverless functions. Instead, use one of these approaches:

1. **Beacon explorer API** — `beacon.gnosisscan.io` provides pre-aggregated validator statistics (recommended).
2. **Lightweight beacon endpoints** — Use `/eth/v1/beacon/states/head/finality_checkpoints` for chain health, or count unique validators from `/eth/v1/beacon/states/head/committees` which returns committee assignments (much smaller payload than full validator records).
3. **Blockscout stats** — May include validator-related data in aggregate stats.

Cache validator counts aggressively (5-10 minute TTL). The count changes slowly.

**DefiLlama API (TVL)**

```
GET https://api.llama.fi/v2/chains
```

Filter for "Gnosis" in the response (`name: "Gnosis"`, `chainId: 100`). Returns current TVL. Free, no auth required, reliable. The canonical base URL is `pro-api.llama.fi` though `api.llama.fi` still works.

For historical TVL data (used by the 30-day chart):

```
GET https://api.llama.fi/v2/historicalChainTvl/Gnosis
```

Returns the full historical TVL series as `[{ date: unixTimestamp, tvl: number }, ...]`. Daily granularity, years of history.

**CoinGecko API (fiat conversion)**

```
GET https://api.coingecko.com/api/v3/simple/price?ids=xdai&vs_currencies=gbp,usd,eur
```

xDAI is a stablecoin pegged at ~$1 USD. The CoinGecko call is primarily useful for GBP and EUR exchange rates, not xDAI price discovery. Register a free Demo API key for stable 30 calls/min rate limits (the public tier is unreliable at 5-15 calls/min). Cache for 120 seconds minimum.

**Bridge volume**

This is the most complex data source. Two approaches:

1. **Dune API** — Query pre-built analytics for xDAI bridge and OmniBridge volume. Requires a free Dune API key. Queries can be slow (10-30s) so must be cached aggressively (refresh every 15 minutes, not every 30 seconds).
2. **Direct event log parsing** — Filter for `Transfer` events on the bridge contracts. More reliable but requires indexing historical data. Better suited for Phase 2.

Recommendation: Skip bridge volume entirely in Phase 1. Investigate Dune in Phase 2.

### 4.5 Caching strategy

The caching architecture has two tiers. The CDN is the primary cache; Vercel KV is used only for daily trend snapshots.

**Tier 1: Vercel CDN (primary — hot path)**

The `/api/metrics` route handler returns responses with:

```
Cache-Control: public, s-maxage=30, stale-while-revalidate=10
```

This means:
- The CDN caches the response for 30 seconds per edge location.
- For 10 seconds after expiry, the CDN serves the stale response while revalidating in the background.
- Vercel strips `s-maxage` before sending to the browser, so the browser never locally caches the response.
- Upstream APIs are hit at most once per ~30 seconds per edge location, regardless of user count.

Important: ensure the TanStack Query `queryFn` uses a plain `fetch()` without `cache: 'no-store'` or `pragma: no-cache` headers, or the CDN will be bypassed.

**Tier 2: Vercel KV (optional — daily snapshots only)**

Used only for 7-day trend calculations on metrics without upstream historical data (gas price, validator count). A single Vercel Cron Job (1/day, within the free tier's 2-job limit) writes daily snapshots:

```typescript
// Keys: snapshot:{metric}:{date}  TTL: 14 days
await kv.set("snapshot:gas:2026-02-26", currentGasPrice, { ex: 86400 * 14 });
await kv.set("snapshot:validators:2026-02-26", activeValidators, { ex: 86400 * 14 });
```

This uses ~60 KV operations/month (2 writes/day × 30 days), well within the free tier's 30,000/month limit.

**Per-metric cache behaviour:**

| Data | CDN TTL | Upstream source | Notes |
|---|---|---|---|
| Gas price | 30s | Blockscout `/api/v2/stats` | Bundled with all stats in one call |
| Transaction count | 30s | Blockscout `/api/v2/stats` | Same call |
| Block time | 30s | Blockscout `/api/v2/stats` | Same call |
| Validators | 30s (from CDN), 5min upstream cache | Beacon explorer / beacon API | Cached longer at the aggregator level due to slow changes |
| TVL | 30s (from CDN), 5min upstream cache | DefiLlama `/v2/chains` | DefiLlama updates periodically |
| Bridge volume | 15min | Dune API (Phase 2) | Aggregated, slow-moving |
| Fiat prices | 30s (from CDN), 120s upstream cache | CoinGecko | Respect CoinGecko rate limits |

Every response includes a `meta.lastUpdated` timestamp so the frontend can determine staleness independently.

### 4.6 Error handling and resilience

Each data source is fetched independently with its own try/catch. If a source fails, the aggregator returns the last cached value for that metric and sets a `stale: true` flag on the affected metric. The frontend displays the metric normally but with a subtle indicator that the data may be outdated.

If all sources fail, the API returns the full cached response with `meta.stale: true`. The frontend shows a banner: "Data may be delayed. Last updated X minutes ago."

Retry logic: 2 retries with exponential backoff (1s, 3s) per source, per request. No retries on 4xx responses.

With CDN caching, the staleness window is bounded: the CDN serves stale data for up to 10 seconds (the `stale-while-revalidate` window) while triggering a background revalidation. If the revalidation also fails, the next direct request will attempt a fresh fetch.

### 4.7 Historical data strategy

The 30-day chart and 7-day trend calculations require historical data. Rather than building a persistent time-series store, use upstream APIs that already provide historical data where available, and lightweight daily snapshots for the rest.

| Metric | Historical source | Granularity | Range |
|---|---|---|---|
| Transactions | Blockscout `/api/v2/stats/charts/transactions` | Daily | 31 days |
| TVL | DefiLlama `/v2/historicalChainTvl/Gnosis` | Daily | Full history (years) |
| Gas price | Daily KV snapshot via cron job | Daily | 14 days |
| Validators | Daily KV snapshot via cron job | Daily | 14 days |
| Block time | Not charted (current value only) | N/A | N/A |

**7-day trend calculation:**

For transactions and TVL, compare today's value with the value from 7 days ago in the upstream historical data (available directly from the API response).

For gas price and validators, read the KV snapshot from 7 days ago:

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000)
  .toISOString().split("T")[0];
const previousGas = await kv.get(`snapshot:gas:${sevenDaysAgo}`);
const trend7d = previousGas
  ? ((currentGas - previousGas) / previousGas) * 100
  : null; // null = not enough history yet
```

If a 7-day snapshot is not yet available (e.g., during the first week after launch), the trend badge is hidden rather than showing incorrect data.

---

## 5. Component specification

### 5.1 SSR data hydration

The page uses TanStack Query's hydration pattern so that client components receive server-fetched data instantly without a loading flash:

```tsx
// app/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { fetchMetrics } from "@/lib/data/sources";

export default async function DashboardPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Hero />
      <MetricGrid />
      <HistoryChart />
    </HydrationBoundary>
  );
}
```

With this pattern, the `useMetrics()` hook in client components has data immediately on hydration. The `staleTime` must be set to at least 30 seconds to prevent an immediate refetch of the server-prefetched data.

### 5.2 Hero

The hero is a server component that receives the initial metrics data and renders a plain-language status summary.

```tsx
// Health status logic (lib/utils/health.ts)
function deriveStatus(metrics: Metrics): HealthStatus {
  const checks = [
    metrics.blockTime.deviationPercent < 20,  // block time within 20% of target
    metrics.validators.active > 100,           // minimum validator threshold
    metrics.gasPrice.current < 100,            // gas not spiking
  ];

  const passing = checks.filter(Boolean).length;
  if (passing === checks.length) return "healthy";
  if (passing >= checks.length - 1) return "degraded";
  return "down";
}
```

The status dot uses Motion's `animate` prop with a subtle pulse animation for the healthy state:

```tsx
<motion.div
  className="h-3 w-3 rounded-full bg-emerald-400"
  animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
/>
```

The hero sentence is composed dynamically: "Gnosis Chain is running smoothly. Transactions cost less than {fiatCost}." When status is degraded or down, the sentence and colour update accordingly.

### 5.3 Metric card

Each card is a self-contained client component that receives its data via props from the parent grid (which uses the `useMetrics` hook).

**Layout:**

```
┌─────────────────────────────┐
│  Transaction cost       ⓘ  │
│                             │
│  £0.002                     │
│  ▲ 3% vs last week         │
│                             │
│  ▾ What does this mean?     │
└─────────────────────────────┘
```

**Animated number counter:**

The `AnimatedNumber` component uses Motion's `useSpring` to animate between values when new data arrives. This creates a smooth counting effect rather than a jarring snap.

```tsx
import { useSpring, motion, useTransform } from "motion/react";

function AnimatedNumber({ value, format }: Props) {
  const spring = useSpring(0, {
    stiffness: 80,
    damping: 20,
    mass: 0.5,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) => format(v));

  return <motion.span>{display}</motion.span>;
}
```

**Card entrance animation:**

Cards stagger in on first load using Motion's `variants` pattern:

```tsx
// lib/motion/variants.ts
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};
```

**Explainer expansion:**

Uses Motion's `AnimatePresence` and `layout` animation for a smooth height transition:

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      <p className="text-sm text-neutral-500 pt-3">
        {explainerText}
      </p>
    </motion.div>
  )}
</AnimatePresence>
```

### 5.4 Trend badge

A small pill showing percentage change with a directional arrow. Colour-coded: green for positive trends in metrics where growth is good (transactions, TVL), red for negative. For gas price, the logic inverts (lower is better).

```tsx
function TrendBadge({ value, invertSentiment = false }: Props) {
  const isPositive = invertSentiment ? value < 0 : value > 0;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      isPositive
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-700"
    )}>
      {isPositive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
```

### 5.5 History chart

A single line chart that defaults to showing 30-day transaction volume. Clicking a metric card swaps the chart to show that metric's history.

The chart should feel minimal: no gridlines, a single line with a gradient fill beneath it, axis labels in neutral grey, and a tooltip on hover showing the exact value and date.

Liveline is already a React component with built-in canvas rendering and smooth 60fps interpolation. No manual wrapper needed. When new data arrives from TanStack Query polling, Liveline automatically lerps between the previous and new values, making even 30-second update intervals feel fluid.

```tsx
function HistoryChart({ points, latestValue, color }: Props) {
  const data = useMemo(
    () => points.map((p) => ({ time: new Date(p.timestamp).getTime(), value: p.value })),
    [points]
  );

  return (
    <Liveline
      data={data}
      value={latestValue}
      color={color ?? "var(--accent)"}
    />
  );
}
```

Liveline handles smooth transitions natively when data changes, so no Motion fade wrapper is needed when switching between metrics. The interpolation between old and new data creates a seamless visual transition.

### 5.6 Cost calculator

An interactive component where the user selects a transaction type from a segmented control and sees the estimated cost in fiat. Optionally shows the same transaction on Ethereum mainnet for comparison.

Transaction types and their approximate gas limits:

| Transaction type | Gas limit (Gnosis) | Gas limit (Ethereum) |
|---|---|---|
| Send xDAI / ETH | 21,000 | 21,000 |
| ERC-20 transfer | 65,000 | 65,000 |
| Token swap (Uniswap-style) | 185,000 | 185,000 |
| Safe transaction (1-of-1) | 250,000 | 250,000 |
| Contract deployment (small) | 500,000 | 500,000 |

The comparison uses Gnosis Chain's current gas price from the metrics cache and Ethereum's gas price from a secondary RPC call (or a cached value from the aggregator).

```tsx
<div className="flex gap-6">
  <CostColumn
    chain="Gnosis Chain"
    cost={gnosisCostFiat}
    accentColor="emerald"
  />
  <CostColumn
    chain="Ethereum"
    cost={ethCostFiat}
    accentColor="neutral"
  />
</div>
```

The cost values animate with the same `AnimatedNumber` spring when the user switches transaction types.

### 5.7 Stale data banner

A non-intrusive banner that appears at the top of the page when `meta.stale` is true:

```tsx
<AnimatePresence>
  {isStale && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-amber-50 text-amber-800 text-sm text-center py-2"
    >
      Data may be delayed. Last updated {timeAgo(lastUpdated)}.
    </motion.div>
  )}
</AnimatePresence>
```

### 5.8 Loading states

On initial load (before any data arrives), show skeleton components that match the exact layout of the real content. Use Motion to fade from skeleton to real content:

```tsx
function MetricCard({ data, isLoading }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }}>
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Real content */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## 6. Visual design direction

### 6.1 Colour system

```css
:root {
  /* Surfaces */
  --bg-primary: #FAFBFC;
  --bg-card: #FFFFFF;
  --bg-elevated: #F5F7F9;

  /* Text */
  --text-primary: #1A1A2E;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;

  /* Accent */
  --accent: #3D8B7A;
  --accent-light: #E8F5F0;

  /* Status */
  --status-healthy: #34D399;
  --status-degraded: #FBBF24;
  --status-down: #F87171;

  /* Borders */
  --border-subtle: #F0F0F0;
  --border-default: #E5E7EB;
}

/* Dark mode */
[data-theme="dark"] {
  --bg-primary: #0F1117;
  --bg-card: #1A1D27;
  --bg-elevated: #242833;
  --text-primary: #F0F2F5;
  --text-secondary: #9CA3AF;
  --text-tertiary: #6B7280;
  --accent: #5BB8A5;
  --accent-light: #1A2E28;
  --border-subtle: #2A2D38;
  --border-default: #363A47;
}
```

### 6.2 Typography

Use a single variable font to minimise network requests. **Inter** is the default choice: clean, highly legible at small sizes, excellent numeric figures.

```css
/* Font scale */
--text-hero: 2rem / 1.2;        /* 32px — status sentence */
--text-metric-value: 1.75rem / 1; /* 28px — big numbers */
--text-metric-label: 0.875rem / 1.4; /* 14px — card labels */
--text-body: 0.9375rem / 1.6;   /* 15px — explainers, body */
--text-caption: 0.8125rem / 1.4; /* 13px — timestamps, sources */
```

Use `font-variant-numeric: tabular-nums` on all numeric displays so digits don't shift width during animation.

### 6.3 Spacing and layout

The metric grid uses CSS Grid with `auto-fill` and a minimum card width of 280px:

```css
.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
```

This naturally flows from 3 columns on desktop to 2 on tablet to 1 on mobile with no breakpoint logic.

General spacing: 8px base unit. Cards use 20px internal padding. Section gaps are 48px.

### 6.4 Card design

Cards have a white background, 1px subtle border, and a generous border radius (16px). No drop shadows in the default state. On hover, a very subtle shadow appears (0 1px 3px rgba(0,0,0,0.04)) with a slight translateY(-1px) via Motion.

```tsx
<motion.div
  className="rounded-2xl border border-neutral-100 bg-white p-5 cursor-pointer"
  whileHover={{ y: -1, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
  transition={{ duration: 0.15 }}
>
```

### 6.5 Motion principles

All animations in Pulse follow three rules:

1. **Purposeful, not decorative.** Every animation communicates a state change: data arriving, a value updating, a panel expanding. No gratuitous movement.
2. **Fast.** Most transitions are 150 to 300ms. Nothing exceeds 500ms. Spring physics with moderate damping (15 to 25) and moderate stiffness (80 to 120) feel snappy without being harsh.
3. **Interruptible.** All animations can be interrupted by new data or user interaction without completing the previous animation. Motion handles this natively.

---

## 7. Performance budget

| Metric | Target | Strategy |
|---|---|---|
| First Contentful Paint | < 1.2s | Static shell via SSG, critical CSS inlined, self-hosted fonts |
| Largest Contentful Paint | < 1.8s | Hero text renders server-side, data fetched client-side after hydration |
| Total JS bundle | < 80KB gzipped | Tree-shake Motion (only import used components), code-split chart library |
| Cumulative Layout Shift | < 0.05 | Fixed-height skeletons match real content dimensions |
| Time to Interactive | < 2.0s | Minimal hydration, most components are presentational |

### 7.1 Bundle strategy

```
Route: / (home)
├── layout.js            ~5KB   (shell, fonts, metadata)
├── page.js              ~3KB   (server component, static)
├── _client-bundle.js    ~50KB  (Motion domAnimation ~22KB, TanStack Query ~12KB, components ~16KB)
└── _chart.js            ~10KB  (Liveline, lazy-loaded)
                         ─────
                         ~68KB total gzipped
```

Key bundle decisions:
- **Motion:** Use `LazyMotion` with `domAnimation` features (~22KB) instead of `domMax` (~34KB). This means no layout animations, but saves ~12KB. Card hover effects and number springs work fine with `domAnimation`.
- **Liveline:** Lightweight, zero-dependency canvas chart component. No manual React wrapper needed. Significantly smaller than alternatives like Recharts (~45-55KB) or uPlot (~15KB + wrapper).
- **TanStack Query v5:** ~12KB gzipped for typical usage (`useQuery`, `QueryClient`, `QueryClientProvider`).

The chart component is lazy-loaded with `next/dynamic` and a skeleton fallback. It only loads after the metric cards are visible, keeping the critical path lean. Liveline's built-in loading state (breathing animation) provides a natural fallback.

```tsx
const HistoryChart = dynamic(
  () => import("@/components/chart/history-chart"),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);
```

### 7.2 Font loading

Self-host Inter as a variable font (single `.woff2` file, ~95KB). Use `font-display: swap` and preload:

```html
<link
  rel="preload"
  href="/fonts/inter-variable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

---

## 8. Metric configuration system

Each metric is defined as a configuration object, making it trivial to add, remove, or reorder metrics without touching component code.

```typescript
// config/metrics.ts

export interface MetricConfig {
  id: string;
  label: string;
  description: string;
  explainer: string;
  format: (value: number, currency?: string) => string;
  invertSentiment?: boolean;   // true = lower is better (e.g. gas)
  trendPeriod: "7d" | "30d";
  icon?: string;
  historyGranularity: "hourly" | "daily";
}

export const METRICS: MetricConfig[] = [
  {
    id: "gasPrice",
    label: "Transaction cost",
    description: "Cost of a standard transfer",
    explainer:
      "This is how much it costs to send money on Gnosis Chain. " +
      "For context, a typical Ethereum transfer costs 100 to 500 times more.",
    format: (v, currency = "USD") => {
      // Gnosis Chain gas costs are typically $0.00002 — sub-cent values
      // that display as "$0.0000" with standard formatting. Use a
      // human-friendly format instead.
      if (v < 0.01) {
        const symbol = new Intl.NumberFormat("en", {
          style: "currency", currency, maximumFractionDigits: 0,
        }).format(0).replace("0", "").trim();
        return `< ${symbol}0.01`;
      }
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 3,
      }).format(v);
    },
    invertSentiment: true,
    trendPeriod: "7d",
    historyGranularity: "hourly",
  },
  {
    id: "transactions24h",
    label: "Transactions (24h)",
    description: "Transactions processed in the last 24 hours",
    explainer:
      "The total number of transactions the network processed today. " +
      "More transactions generally means more people and apps are using the chain.",
    format: (v) => new Intl.NumberFormat("en-GB").format(Math.round(v)),
    trendPeriod: "7d",
    historyGranularity: "daily",
  },
  {
    id: "validators",
    label: "Active validators",
    description: "Nodes securing the network",
    explainer:
      "Validators are computers that verify transactions and keep the network secure. " +
      "More validators means the network is more decentralised and harder to attack.",
    format: (v) => new Intl.NumberFormat("en-GB").format(Math.round(v)),
    trendPeriod: "7d",
    historyGranularity: "daily",
  },
  {
    id: "bridgeVolume7d",
    label: "Bridge flow (7d)",
    description: "Net capital flow in or out via bridges",
    explainer:
      "Bridges let people move money between Gnosis Chain and other networks. " +
      "Net inflow means more money is arriving than leaving.",
    format: (v, currency = "GBP") =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(v),
    trendPeriod: "7d",
    historyGranularity: "daily",
  },
  {
    id: "tvl",
    label: "Total value locked",
    description: "Assets deposited in Gnosis Chain protocols",
    explainer:
      "This measures how much money people have deposited into apps on Gnosis Chain. " +
      "Higher TVL generally signals more confidence in the ecosystem.",
    format: (v, currency = "GBP") =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(v),
    trendPeriod: "30d",
    historyGranularity: "daily",
  },
  {
    id: "blockTime",
    label: "Block time",
    description: "Average time between blocks",
    explainer:
      "How quickly the network processes new batches of transactions. " +
      "Gnosis Chain targets one batch every 5 seconds. " +
      "Consistent block times mean the network is running smoothly.",
    format: (v) => `${v.toFixed(1)}s`,
    invertSentiment: true,
    trendPeriod: "7d",
    historyGranularity: "hourly",
  },
];
```

---

## 9. Currency handling

### 9.1 Detection

On first load, detect the user's likely currency from `navigator.language`:

```typescript
function detectCurrency(): string {
  const locale = navigator.language || "en-US";
  const regionCurrencyMap: Record<string, string> = {
    GB: "GBP", US: "USD", DE: "EUR", FR: "EUR",
    JP: "JPY", CN: "CNY", // ...extend as needed
  };

  const region = locale.split("-")[1]?.toUpperCase();
  return regionCurrencyMap[region] || "USD";
}
```

Store the preference in a React state (no localStorage needed for v1). Provide a toggle in the header to switch between detected fiat, USD, and xDAI.

### 9.2 Conversion

The route handler fetches xDAI prices in all supported fiat currencies from CoinGecko in a single call. The frontend selects the appropriate rate based on the user's currency preference. Since xDAI is pegged at ~$1 USD, the CoinGecko call is primarily useful for GBP and EUR exchange rates rather than xDAI price discovery.

---

## 10. Open Graph image generation

Use `@vercel/og` to generate a dynamic preview image at `/api/og`:

```tsx
// app/api/og/route.tsx
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  const metrics = await getCachedMetrics();

  return new ImageResponse(
    (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#FAFBFC",
        padding: "60px",
      }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: "#1A1A2E" }}>
          Pulse
        </div>
        <div style={{ fontSize: 24, color: "#6B7280", marginTop: 12 }}>
          Gnosis Chain is running smoothly
        </div>
        <div style={{
          display: "flex",
          gap: "40px",
          marginTop: 48,
          fontSize: 18,
          color: "#3D8B7A",
        }}>
          <span>{'<'} $0.01 per tx</span>
          <span>{metrics.transactions24h.count.toLocaleString()} txs today</span>
          <span>{metrics.blockTime.averageSeconds.toFixed(1)}s blocks</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

Reference in the root layout:

```tsx
export const metadata: Metadata = {
  openGraph: {
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};
```

---

## 11. Testing strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Unit (formatters, health logic, config) | Vitest | High — these are pure functions with clear inputs/outputs |
| Component | Vitest + Testing Library | Medium — metric card, trend badge, animated number |
| Integration (data pipeline) | Vitest with MSW | Medium — mock API responses, verify aggregator output |
| E2E | Playwright | Low — smoke test: page loads, metrics render, chart appears |
| Visual regression | Playwright screenshots | Optional — capture metric cards in each state (loading, healthy, degraded, stale) |

Priority: get unit tests on the formatters and health logic first. These are the most likely sources of subtle bugs (wrong currency formatting, inverted sentiment, etc.) and the cheapest to test.

---

## 12. Deployment

### 12.1 Environments

| Environment | URL | Branch | Purpose |
|---|---|---|---|
| Production | pulse.gnosis.io (or custom domain) | `main` | Live site |
| Preview | Auto-generated Vercel URL | Any PR | Review and testing |
| Local | localhost:3000 | — | Development |

### 12.2 Environment variables

```env
# Primary data source
BLOCKSCOUT_API_URL=https://gnosis.blockscout.com/api/v2

# RPC (fallback)
GNOSIS_RPC_URL=https://rpc.gnosischain.com
GNOSIS_BEACON_URL=https://rpc-gbc.gnosischain.com

# Ethereum (for cost comparison in calculator)
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# APIs
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=         # Free Demo key (recommended for stable 30 calls/min)
DEFILLAMA_API_URL=https://api.llama.fi

# Cache (optional — only needed for daily trend snapshots)
KV_REST_API_URL=           # Vercel KV
KV_REST_API_TOKEN=

# Optional
DUNE_API_KEY=              # For bridge volume (Phase 2)
```

### 12.3 CI/CD

GitHub Actions workflow on every push to `main` and every PR:

1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Type check (`tsc --noEmit`)
3. Lint (`biome check`)
4. Unit + integration tests (`vitest run`)
5. Build (`next build`)
6. Deploy to Vercel (automatic via Vercel GitHub integration)

---

## 13. Phase mapping

This section maps tech spec components to PRD milestones so it's clear what to build when.

### Phase 1: Foundation

- Project scaffolding: Next.js 15, Tailwind 4, TypeScript, Biome, Vercel deployment
- Data sources: Blockscout `/api/v2/stats` (primary), Gnosis RPC (fallback)
- API: `/api/metrics` endpoint with CDN caching (`s-maxage=30, stale-while-revalidate=10`)
- SSR: TanStack Query `HydrationBoundary` + `dehydrate` pattern for instant data on load
- Components: Hero (static), MetricCard, AnimatedNumber, TrendBadge, Skeleton
- Metrics: Transaction cost, transactions (24h), block time
- Animation: Card stagger entrance, number springs (using `domAnimation` features)
- No chart, no calculator, no dark mode, no KV

### Phase 2: Full dashboard

- Data sources: Add Beacon chain API (aggregate endpoints), DefiLlama, CoinGecko, optionally Dune
- API: Add `/api/history` endpoint. Add Vercel KV for daily trend snapshots (cron job)
- Components: HistoryChart (Liveline, lazy-loaded), ChartToggle, Explainer, StaleBanner, CurrencyToggle
- Metrics: Add validators, TVL, bridge volume (if Dune works)
- Features: Fiat conversion, expandable explainers, 30-day chart (daily granularity from upstream APIs)
- Animation: Chart fade transitions, explainer expand/collapse

### Phase 3: Polish and distribution

- Components: CostCalculator, ChainComparison
- OG image generation
- Dark mode
- Performance audit against budget
- Playwright smoke tests
- Internal sharing, domain setup
