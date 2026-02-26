# Pulse

**A Gnosis Chain vitals dashboard for humans**

| | |
|---|---|
| **Author** | Oscar |
| **Version** | 0.1 (Draft) |
| **Date** | February 2026 |
| **Status** | Discovery |

---

## 1. Overview

Pulse is a lightweight, beautifully designed dashboard that surfaces the vital signs of Gnosis Chain in language and visuals that non-technical users can understand. It reframes blockchain metrics (gas prices, validator counts, bridge flows, transaction volumes) as a calm, glanceable health check rather than a dense data terminal.

Think of it as a weather app for a blockchain: the information is technically complex under the hood, but the interface makes it feel simple and trustworthy.

---

## 2. Problem

Gnosis Chain is a mature, low-cost L1 with growing adoption through products like the Gnosis Card and Safe wallets. But most of the data about the chain's health and activity lives in tools built for power users: block explorers, DeFi dashboards, and Dune analytics queries. These are powerful but inaccessible to the growing audience of mainstream users who interact with Gnosis Chain without ever thinking about blockchain infrastructure.

There is no single place where a curious user, a journalist, a potential partner, or a new developer can go to quickly understand how Gnosis Chain is doing right now. The result is a narrative gap: the chain's strengths (low cost, stability, growing usage) are invisible to the people who would benefit most from knowing about them.

---

## 3. Audience

### 3.1 Primary audiences

- **Gnosis ecosystem newcomers:** People who have just started using the Gnosis Card, a Safe wallet, or a dApp on Gnosis Chain and want to understand the infrastructure underneath.
- **Gnosis team and BD:** Internal stakeholders who need a shareable, well-designed snapshot of chain health for partner conversations, investor updates, and press.
- **Developers evaluating Gnosis Chain:** Builders deciding whether to deploy on Gnosis Chain who want a quick read on activity, costs, and network stability.

### 3.2 Secondary audiences

- **Crypto journalists and researchers:** People writing about L1 ecosystems who need quick, citable data.
- **Validators and node operators:** Existing network participants who want a cleaner view of network health alongside their existing tooling.

---

## 4. Goals and non-goals

### 4.1 Goals

1. Make Gnosis Chain's health and activity legible to non-technical users within 10 seconds of landing on the page.
2. Provide a shareable, linkable URL that the Gnosis team can use in external communications.
3. Present cost data (gas, transaction fees) in fiat terms with plain-language context.
4. Establish a distinctive visual identity that feels calm, modern, and trustworthy rather than defaulting to standard crypto dashboard aesthetics.
5. Load fast. Target sub-2-second first contentful paint with no heavy client-side frameworks.

### 4.2 Non-goals

- Replacing block explorers (Gnosisscan, Blockscout) for transaction-level detail.
- Providing trading signals or price predictions.
- Supporting multiple chains. Pulse is Gnosis Chain only. Cross-chain comparisons may appear as contextual data points but the product is not a multi-chain dashboard.
- Requiring a wallet connection or authentication of any kind.
- Real-time streaming updates. Near-real-time polling (every 15 to 60 seconds) is sufficient.

---

## 5. Core metrics

The editorial choice of which metrics to show is one of the most important design decisions. Pulse should show no more than six to eight top-level metrics, each with a human-readable label, a current value, a trend indicator (compared to 7 days ago), and a one-line explainer.

| Metric | Source | Display format | Why it matters |
|---|---|---|---|
| Transaction cost | Blockscout stats + CoinGecko fiat rate | < $0.01 per transfer (with trend arrow) | The single most compelling data point for mainstream users |
| Transactions (24h) | Blockscout stats | 142,381 transactions today, up 8% vs last week | Proxy for network activity and adoption |
| Active validators | Beacon chain API (aggregate endpoints) | Validator count with a stability indicator | Signals network security and decentralisation |
| Bridge volume | Dune API (Phase 2) | Net flow in/out over 7 days, displayed in fiat | Shows capital movement and confidence |
| TVL | DefiLlama API | Total value locked with 30-day trend | High-level measure of ecosystem health |
| Block time | Blockscout stats | Average block time (target: 5s) with deviation indicator | Signals chain stability and performance |

Each metric should have an expandable "What does this mean?" explainer that avoids jargon. For example, block time should not say "average block propagation interval" but rather "How quickly the network processes new batches of transactions. Gnosis Chain targets one batch every 5 seconds."

---

## 6. Information architecture

Pulse is a single-page application with a simple vertical layout. There are no tabs, navigation menus, or secondary pages in v1.

### 6.1 Page structure (top to bottom)

1. **Hero: Chain status summary.** A single sentence like "Gnosis Chain is running smoothly. Transactions cost less than a penny." with a subtle colour-coded status indicator (green/amber/red).
2. **Metric cards:** A responsive grid of six to eight cards, each showing one core metric with its current value, trend, and expandable explainer.
3. **Cost calculator:** An interactive element where a user can select a transaction type (send xDAI, swap tokens, deploy a contract) and see the estimated cost in fiat. Optionally compares this to the same transaction on Ethereum mainnet.
4. **Historical context:** A single, clean chart showing transaction volume over the past 30 days. Clicking a metric card could swap this chart to show that metric's history instead.
5. **Footer:** Data sources, last updated timestamp, link to Gnosisscan, Gnosis branding.

---

## 7. Design principles

### 7.1 Calm over busy

The default state should feel like a clear sky. No flashing numbers, no dense tables, no chart overload. If the chain is healthy (which it usually is), the page should communicate that health through whitespace and restraint as much as through data.

### 7.2 Fiat first

Every cost should be displayed in the user's local fiat currency by default, with the crypto denomination available on hover or toggle. Most users do not think in gwei or even xDAI.

### 7.3 Context over numbers

A number without context is meaningless. "142,381 transactions" means nothing to a new user. "142,381 transactions today, up 8% from last week" starts to tell a story. "That is roughly the same as a mid-sized city's daily card transactions" makes it land.

### 7.4 Light by default

Most crypto dashboards default to dark mode. Pulse should default to a light, airy colour scheme that feels more like a consumer product than a trading terminal. A dark mode can exist as an option but should not be the default.

### 7.5 No login required

The entire experience is public and anonymous. No wallet connection, no cookies, no tracking. This is a public good.

---

## 8. Technical approach

### 8.1 Frontend

A Next.js 15 application using the App Router with server components for the initial render and minimal client-side JavaScript. The page should feel instant (target: sub-2-second first contentful paint). Charts use Liveline (lightweight, canvas-based React component with built-in 60fps interpolation for real-time animated line charts). Tailwind CSS 4 for styling. Motion (formerly Framer Motion) for purposeful, fast animations.

Key consideration: the site should work well when shared on social media. Open Graph meta tags with a dynamically generated preview image showing the current chain status would significantly increase shareability.

### 8.2 Data layer

A Next.js API route handler fetches data from upstream APIs on demand. Vercel's CDN caches the response for 30 seconds (`s-maxage=30, stale-while-revalidate=10`), so upstream APIs are hit at most once per ~30 seconds per CDN edge location rather than per user request. The frontend polls this cached endpoint every 30 seconds via TanStack Query. This provides reliability (CDN serves stale data if upstream APIs are flaky), performance (no waterfall of client-side requests), and rate limit safety (upstream calls are bounded by CDN TTL, not user count).

### 8.3 Data sources

- **Blockscout API (primary):** Pre-aggregated chain stats including gas prices, daily transaction count, average block time, TVL, and coin price — all in a single endpoint (`/api/v2/stats`). Also provides 31-day historical transaction charts. This is the primary data source for most metrics, replacing raw RPC calls.
- **Gnosis Chain RPC (fallback):** `rpc.gnosischain.com` for gas price and block data if Blockscout is unavailable. Note: the underlying RPC infrastructure is transitioning from Gateway.fm to Tenderly; the URL remains unchanged.
- **Beacon chain API:** Validator count via aggregate endpoints on `rpc-gbc.gnosischain.com`. The full validator set (300K+ validators) is too large to fetch directly; use pre-aggregated counts from beacon.gnosisscan.io or lightweight beacon endpoints instead.
- **DefiLlama API:** TVL data for Gnosis Chain, including full historical TVL series. Free, no auth required, reliable.
- **CoinGecko API:** xDAI to fiat price conversion (xDAI is pegged at ~$1, so this is primarily for GBP/EUR exchange rates). A free Demo API key is recommended for stable rate limits (30 calls/min vs unreliable 5-15 calls/min on the public tier).
- **Bridge contracts:** Event logs from the xDAI bridge and OmniBridge for bridge volume. Deferred to Phase 2.

### 8.4 Hosting

Vercel for the frontend, API route handlers, and CDN caching. The CDN-first architecture means no separate caching infrastructure is needed for v1. Total hosting cost should be near zero on the Hobby plan.

### 8.5 Refresh strategy

The `/api/metrics` endpoint returns responses with `Cache-Control: public, s-maxage=30, stale-while-revalidate=10`. Vercel's CDN caches the response for 30 seconds and serves stale data for up to 10 additional seconds while revalidating in the background. The frontend polls the endpoint every 30 seconds via TanStack Query with a visible "Last updated" timestamp. No WebSocket connections needed. If the data is older than 5 minutes (indicating upstream API failures), display a subtle banner indicating data may be delayed.

---

## 9. Milestones

### Phase 1: Foundation (2 to 3 weekends)

- Set up the project scaffolding (Next.js 15, Tailwind CSS 4, TypeScript, Biome, Vercel deployment).
- Build the data layer: `/api/metrics` route handler fetching from Blockscout, with CDN caching.
- Design and implement the metric card component with current value and trend.
- Ship a live, public URL with three metrics: transaction cost, daily transactions, block time.
- **Deliverable:** A working page at a public URL with real data.

### Phase 2: Full dashboard (2 to 3 weekends)

- Add remaining metrics: validators, bridge volume, TVL.
- Build the hero status summary with plain-language health assessment.
- Add the 30-day historical chart.
- Implement fiat conversion with currency detection or toggle.
- Add expandable "What does this mean?" explainers for each metric.
- **Deliverable:** Feature-complete v1.

### Phase 3: Polish and distribution (1 to 2 weekends)

- Cost calculator with cross-chain comparison.
- Open Graph meta image generation for social sharing.
- Performance audit and optimisation.
- Share internally at Gnosis for feedback. Propose inclusion in docs or ecosystem page.
- **Deliverable:** Production-ready, shareable product.

---

## 10. Success metrics

Since this is a side project, success metrics should be lightweight and honest rather than aspirational.

- **Adoption signal:** Gnosis team links to Pulse from at least one official channel (docs, blog, social).
- **Utility signal:** At least one person outside the Gnosis team shares it unprompted.
- **Quality signal:** You personally check it regularly because it is genuinely the fastest way to get a read on chain health.
- **Craft signal:** It looks good enough to include in your portfolio as a design case study.

---

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Upstream API instability | Dashboard shows stale or missing data, eroding trust. | Cache layer with graceful degradation. Show "last updated" prominently. Fall back to secondary data sources. |
| Low gas variability reduces utility | The gas price metric feels static and uninteresting. | Frame gas as a comparison point (vs Ethereum, vs last month) rather than a live trading signal. |
| Scope creep into multi-chain dashboard | Loses focus, takes 10x longer to build, competes with established tools. | Hard rule: other chains appear only as contextual comparison data points, never as first-class citizens. |
| Gnosis team builds something similar officially | Duplicated effort. | Share early, offer to contribute. Position it as a community tool that could become official if there is appetite. |
| Difficulty sourcing bridge volume data | One key metric is missing or unreliable. | Start without bridge data in Phase 1. Investigate event log parsing and Dune API as alternatives. |

---

## 12. Open questions

1. **Naming:** "Pulse" feels right but needs a conflict check. Alternatives worth considering: Vitals, Beacon, Signal, Heartbeat.
2. **Currency default:** Should fiat currency be auto-detected via browser locale, or should it default to USD with a toggle? GBP might be more natural for you personally but USD is the standard in crypto.
3. **Gnosis branding:** Should Pulse carry Gnosis branding prominently (positioning it as semi-official) or feel independent (positioning it as a community tool)? This affects design direction and distribution strategy.
4. **Data granularity:** For historical charts, what is the right default time range? 7 days, 30 days, or 90 days? Shorter ranges show more responsiveness to change; longer ranges tell a more stable story.
5. **Alerts:** Should v1 include any notification feature (email or push when a metric crosses a threshold), or is that a clear v2 concern?
6. **Mobile:** Is a responsive web layout sufficient, or is there appetite for a dedicated mobile view optimised for quick glancing?
