import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { Dashboard } from "@/components/dashboard";
import { Hero } from "@/components/hero/hero";
import { CurrencyToggle } from "@/components/layout/currency-toggle";
import { Footer } from "@/components/layout/footer";
import { StaleBanner } from "@/components/layout/stale-banner";
import { aggregateMetrics } from "@/lib/data/aggregator";

async function fetchHistory() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/history?metric=transactions24h&timeframe=7d`);
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["metrics"],
      queryFn: aggregateMetrics,
    }),
    queryClient.prefetchQuery({
      queryKey: ["history", "transactions24h", "7d"],
      queryFn: fetchHistory,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StaleBanner />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Hero />
          <CurrencyToggle />
        </div>
        <Dashboard />
      </main>
      <Footer />
    </HydrationBoundary>
  );
}
