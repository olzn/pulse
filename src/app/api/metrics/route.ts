import { NextResponse } from "next/server";
import { aggregateMetrics } from "@/lib/data/aggregator";
import { getCachedMetrics } from "@/lib/data/cache";

export async function GET() {
  try {
    const data = await aggregateMetrics();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10",
      },
    });
  } catch {
    const cached = getCachedMetrics();
    if (cached) {
      return NextResponse.json(
        { ...cached, meta: { ...cached.meta, stale: true } },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
          },
        },
      );
    }

    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 },
    );
  }
}
