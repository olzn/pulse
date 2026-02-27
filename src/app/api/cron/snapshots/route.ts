import { NextResponse } from "next/server";
import { saveSnapshot } from "@/lib/data/cache";
import { fetchBlockscoutStats, fetchValidatorCount } from "@/lib/data/sources";

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  try {
    const stats = await fetchBlockscoutStats();
    await saveSnapshot("gas", stats.gas_prices.average);
    results.gas = "saved";
  } catch (e) {
    results.gas = `failed: ${e instanceof Error ? e.message : "unknown"}`;
  }

  try {
    const count = await fetchValidatorCount();
    await saveSnapshot("validators", count);
    results.validators = "saved";
  } catch (e) {
    results.validators = `failed: ${e instanceof Error ? e.message : "unknown"}`;
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
