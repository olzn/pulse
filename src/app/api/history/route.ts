import { type NextRequest, NextResponse } from "next/server";
import { getSnapshot } from "@/lib/data/cache";
import {
  fetchBlockscoutTxChart,
  fetchGnoPriceDaily,
  fetchGnoPriceHourly,
  fetchGnoPriceMinute,
  fetchHistoricalTVL,
  normalizeCryptoCompare,
} from "@/lib/data/sources";
import type { HistoryResponse } from "@/lib/data/types";

export async function GET(request: NextRequest) {
  const metric = request.nextUrl.searchParams.get("metric");
  const timeframe = request.nextUrl.searchParams.get("timeframe") || "7d";

  if (!metric) {
    return NextResponse.json({ error: "metric param required" }, { status: 400 });
  }

  try {
    let response: HistoryResponse;

    switch (metric) {
      case "gnoPrice": {
        let points: HistoryResponse["points"];
        let granularity: HistoryResponse["granularity"];

        switch (timeframe) {
          case "1h":
            points = normalizeCryptoCompare(await fetchGnoPriceMinute(60));
            granularity = "minute";
            break;
          case "24h":
            points = normalizeCryptoCompare(await fetchGnoPriceMinute(1440));
            granularity = "minute";
            break;
          case "7d":
            points = normalizeCryptoCompare(await fetchGnoPriceHourly(168));
            granularity = "hourly";
            break;
          case "1mo":
            points = normalizeCryptoCompare(await fetchGnoPriceDaily(30));
            granularity = "daily";
            break;
          case "1yr":
            points = normalizeCryptoCompare(await fetchGnoPriceDaily(365));
            granularity = "daily";
            break;
          case "all":
            points = normalizeCryptoCompare(await fetchGnoPriceDaily(0, true));
            granularity = "daily";
            break;
          default:
            return NextResponse.json(
              { error: `unsupported timeframe: ${timeframe}` },
              { status: 400 },
            );
        }

        response = { metric, timeframe, granularity, points };
        break;
      }

      case "tvl": {
        const history = await fetchHistoricalTVL();
        let sliced: typeof history;

        switch (timeframe) {
          case "7d":
            sliced = history.slice(-7);
            break;
          case "1mo":
            sliced = history.slice(-30);
            break;
          case "1yr":
            sliced = history.slice(-365);
            break;
          case "all":
            sliced = history;
            break;
          default:
            return NextResponse.json(
              { error: `unsupported timeframe: ${timeframe}` },
              { status: 400 },
            );
        }

        response = {
          metric,
          timeframe,
          granularity: "daily",
          points: sliced.map((d) => ({
            timestamp: new Date(d.date * 1000).toISOString(),
            value: d.tvl,
          })),
        };
        break;
      }

      case "transactions24h": {
        const chart = await fetchBlockscoutTxChart();
        const sorted = chart.chart_data
          .map((d) => ({
            timestamp: new Date(d.date).toISOString(),
            value: d.transactions_count,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let points: HistoryResponse["points"];

        switch (timeframe) {
          case "7d":
            points = sorted.slice(-7);
            break;
          case "1mo":
            points = sorted;
            break;
          default:
            return NextResponse.json(
              { error: `unsupported timeframe: ${timeframe}` },
              { status: 400 },
            );
        }

        response = { metric, timeframe, granularity: "daily", points };
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

        response = { metric, timeframe, granularity: "daily", points };
        break;
      }

      default:
        return NextResponse.json({ error: "unknown metric" }, { status: 400 });
    }

    // Shorter CDN cache for minute-level data
    const cacheSecs = response.granularity === "minute" ? 15 : 30;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `public, s-maxage=${cacheSecs}, stale-while-revalidate=10`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
