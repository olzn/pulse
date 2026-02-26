import { NextResponse, type NextRequest } from "next/server";
import { fetchBlockscoutTxChart, fetchHistoricalTVL } from "@/lib/data/sources";
import { getSnapshot } from "@/lib/data/cache";
import type { HistoryResponse } from "@/lib/data/types";

export async function GET(request: NextRequest) {
  const metric = request.nextUrl.searchParams.get("metric");

  if (!metric) {
    return NextResponse.json({ error: "metric param required" }, { status: 400 });
  }

  try {
    let response: HistoryResponse;

    switch (metric) {
      case "transactions24h": {
        const chart = await fetchBlockscoutTxChart();
        const points = chart.chart_data
          .map((d) => ({
            timestamp: new Date(d.date).toISOString(),
            value: d.transactions_count,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        response = {
          metric,
          granularity: "daily",
          points,
        };
        break;
      }

      case "tvl": {
        const history = await fetchHistoricalTVL();
        // Slice to last 30 days
        const last30 = history.slice(-30);
        response = {
          metric,
          granularity: "daily",
          points: last30.map((d) => ({
            timestamp: new Date(d.date * 1000).toISOString(),
            value: d.tvl,
          })),
        };
        break;
      }

      case "gasPrice":
      case "validators": {
        // Read from KV snapshots (last 14 days)
        const kvMetric = metric === "gasPrice" ? "gas" : "validators";
        const points: HistoryResponse["points"] = [];

        for (let i = 13; i >= 0; i--) {
          const date = new Date(Date.now() - i * 86400 * 1000);
          const dateStr = date.toISOString().split("T")[0];
          const value = await getSnapshot(kvMetric, dateStr);
          if (value !== null) {
            points.push({
              timestamp: date.toISOString(),
              value,
            });
          }
        }

        response = {
          metric,
          granularity: "daily",
          points,
        };
        break;
      }

      default:
        return NextResponse.json({ error: "unknown metric" }, { status: 400 });
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
