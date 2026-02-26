"use client";

import { useMetrics } from "@/lib/hooks/use-metrics";
import { timeAgo } from "@/lib/utils/format";

export function Footer() {
  const { data } = useMetrics();

  return (
    <footer className="border-t border-border-subtle px-4 py-6 text-center text-xs text-content-tertiary sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-1">
        {data?.meta.lastUpdated && (
          <p>Last updated {timeAgo(data.meta.lastUpdated)}</p>
        )}
        <p>
          Data from{" "}
          <a
            href="https://gnosis.blockscout.com"
            className="underline hover:text-content-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Blockscout
          </a>
          {" \u00B7 "}
          <a
            href="https://defillama.com/chain/Gnosis"
            className="underline hover:text-content-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            DefiLlama
          </a>
          {" \u00B7 "}
          <a
            href="https://gnosisscan.io"
            className="underline hover:text-content-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gnosisscan
          </a>
        </p>
        <p className="text-content-tertiary/60">
          A Gnosis Chain community project
        </p>
      </div>
    </footer>
  );
}
