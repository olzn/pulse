# Pulse — Build Progress

> Last updated: 2026-02-26

## Status: Phase 2 complete. Phase 3 not started.

`pnpm build` passes cleanly. All 5 metrics return live data. Chart renders for 2/5 metrics.

---

## What's been built

### Phase 1 (complete)
Core dashboard with 3 metrics from Blockscout.

### Phase 2 (complete)
Expanded to 5 metrics, 4 data sources, Liveline chart, currency toggle, explainers, stale banner.

**5 metrics:**
| Metric | Source | Live data | Chart history | Trend |
|---|---|---|---|---|
| Transaction cost | Blockscout + CoinGecko | Yes | No (needs KV) | No (needs KV) |
| Transactions (24h) | Blockscout | Yes | Yes (30d) | Yes (7d) |
| Block time | Blockscout | Yes | No | N/A |
| Active validators | Beacon chain | Yes | No (needs KV) | No (needs KV) |
| Total value locked | DefiLlama | Yes | Yes (30d) | Yes (30d) |

**4 data sources:**
- Blockscout (`/api/v2/stats`, `/api/v2/stats/charts/transactions`)
- Beacon chain (`/eth/v1/beacon/states/head/committees` — counts unique validator indices, ~5MB, 5-min cache)
- DefiLlama (`/v2/chains`, `/v2/historicalChainTvl/Gnosis`)
- CoinGecko (`/simple/price?ids=xdai&vs_currencies=usd,gbp,eur` — 120s cache, hardcoded fallback rates)

**UI features:**
- Liveline real-time animated chart (transactions24h + tvl)
- Currency toggle (USD/GBP/EUR) — auto-detects from browser locale
- Info icon tooltips on each metric card (click to open, click outside to dismiss)
- Stale data amber banner (shown when `meta.stale === true`)
- Animated numbers (spring physics), trend badges, status dot
- Responsive grid (`auto-fill, minmax(280px, 1fr)`), equal-height cards
- SSR hydration with TanStack Query (`dehydrate`/`HydrationBoundary`)

---

## File structure

```
src/
  app/
    api/
      metrics/route.ts       — GET /api/metrics (5 metrics + fiatRates + meta)
      history/route.ts        — GET /api/history?metric=X (chart data)
      cron/snapshots/route.ts — Daily cron, saves gas+validator snapshots to KV
    globals.css               — Tailwind v4, @theme inline, CSS custom props
    layout.tsx                — Root layout, font preload, Providers wrapper
    page.tsx                  — Server component, SSR prefetch, page assembly
  components/
    chart/
      chart-toggle.tsx        — Pill buttons to select chart metric
      history-chart.tsx       — Liveline wrapper, handles data formatting
    dashboard.tsx             — Client component, owns shared selectedMetric state
    hero/
      hero.tsx                — Status sentence + currency-aware subtitle
      status-dot.tsx          — Pulsing green/amber/red dot
    layout/
      currency-toggle.tsx     — USD/GBP/EUR segmented control
      footer.tsx              — Last updated, data source links
      stale-banner.tsx        — Amber banner for delayed data
    metrics/
      animated-number.tsx     — Spring-animated value display
      explainer.tsx           — Info icon with click tooltip
      metric-card.tsx         — Card with trend, description, explainer
      metric-grid.tsx         — Grid of 5 cards, currency-aware formatting
      trend-badge.tsx         — Up/down percentage pill
    providers.tsx             — QueryClient + LazyMotion + CurrencyProvider
    ui/skeleton.tsx           — Pulsing placeholder
  config/
    metrics.ts                — MetricId type, 5 MetricConfig entries
    site.ts                   — Site metadata
  lib/
    data/
      aggregator.ts           — Fetches all sources, normalises into MetricsResponse
      cache.ts                — In-memory cache + Upstash Redis helpers
      sources.ts              — fetchWithRetry + 6 source fetchers
      types.ts                — All TypeScript interfaces
    hooks/
      use-currency.tsx        — CurrencyProvider + useCurrency hook
      use-history.ts          — TanStack Query hook for /api/history
      use-metrics.ts          — TanStack Query hook for /api/metrics
    motion/variants.ts        — staggerContainer + fadeUp animation variants
    utils/
      cn.ts                   — clsx wrapper
      format.ts               — formatNumber, formatFiatCost, timeAgo
      health.ts               — deriveStatus (blockTime, gas, validators checks)
vercel.json                   — Cron config (daily at midnight UTC)
biome.json                    — Linter/formatter config
```

---

## Environment variables

```env
# Working — no credentials needed
BLOCKSCOUT_API_URL=https://gnosis.blockscout.com/api/v2
GNOSIS_RPC_URL=https://rpc.gnosischain.com
GNOSIS_BEACON_URL=https://rpc-gbc.gnosischain.com
COINGECKO_API_URL=https://api.coingecko.com/api/v3
DEFILLAMA_API_URL=https://api.llama.fi

# Not yet provisioned — needed for KV features
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
```

---

## Known limitations / TODO for next session

### KV-dependent features (blocked on Upstash provisioning)
- **Transaction cost chart** — `hasHistory: false` in `src/config/metrics.ts:37`. Flip to `true` once KV has 2+ weeks of snapshots.
- **Active validators chart** — `hasHistory: false` in `src/config/metrics.ts:72`. Same.
- **Gas price 7d trend** — Returns `null` because `getTrend7d("gas", ...)` in aggregator needs KV data.
- **Validator 7d trend** — Same, returns `null`.
- To provision: add Upstash Redis via Vercel Marketplace, copy URL+token to env vars, set a `CRON_SECRET`.

### Phase 3 (not started — from PRD/tech spec)
- Bridge volume metric (deferred from Phase 2)
- Additional data sources for bridge activity
- Whatever else is outlined in `pulse-prd.md` and `pulse-tech-spec.md`

### Polish / UX (optional)
- Layout refinements (user noted "layout and UX could be improved")
- Dark mode support (Liveline supports `theme="dark"`, CSS vars are ready)
- Mobile responsive testing
- Error boundary for chart component
- Loading states could be more polished

---

## Liveline gotchas (for future reference)

These caused blank chart issues during development:

1. **Time in seconds, not milliseconds.** Liveline uses `Date.now() / 1e3` internally. Pass `time` values as Unix seconds.
2. **`window` prop is mandatory for historical data.** Defaults to 30 seconds (designed for real-time streams). For 30-day history, compute: `Math.ceil((newest - oldest) * 1.1)`.
3. **`color` must be hex or `rgb()`.** CSS variables like `var(--accent)` silently fall back to gray. Use `#3d8b7a` directly.
4. **Fragment rendering.** Liveline renders a `<Fragment>`, not a wrapper div. Its canvas container uses `height: 100%`, so the parent must have explicit height. Pass `style={{ height: 192 }}` to both the wrapper and Liveline.
5. **`LivelineTransition`** is for cross-fading between multiple chart *types* (line vs candle), not for switching data. Use React `key` prop to re-mount on data change.

---

## Commands

```bash
pnpm dev          # Dev server with Turbopack
pnpm build        # Production build (verifies types)
pnpm start        # Serve production build
pnpm check        # Biome lint + format check
curl localhost:3000/api/metrics                      # All 5 metrics
curl localhost:3000/api/history?metric=transactions24h  # 30d tx chart data
curl localhost:3000/api/history?metric=tvl               # 30d TVL chart data
```
