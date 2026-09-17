"use client";

import { useEffect, useState } from "react";
import { getRoundState } from "@/lib/rounds";
import { formatDuration } from "@/lib/duration";
import { formatDateTime, formatWindow } from "@/lib/time";

/**
 * Live countdown card for the current round: "Starts in Xd Yh" before Round
 * 1 begins, or "Ends in Xd Yh" for whichever round is currently running.
 * Ticks every second on the client — everything it needs (the fixed season
 * start) is a constant, so it needs no server data at all.
 */
export function RoundCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // See safety-countdown.tsx for why this is deferred rather than a
    // synchronous setState call in the effect body.
    const kick = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
    };
  }, []);

  if (now === null) return null;

  const state = getRoundState(new Date(now));

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
      <div className="bg-maroon px-6 py-3 text-cream">
        <h2 className="text-lg font-semibold">Round {state.roundNumber}</h2>
      </div>
      <div className="px-6 py-4">
        {state.status === "not-started" ? (
          <>
            <p className="text-2xl font-semibold text-maroon">
              Starts in {formatDuration(state.roundStart.getTime() - now)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              Begins {formatDateTime(state.roundStart)}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-maroon">
              Ends in {formatDuration(state.roundEnd.getTime() - now)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {formatWindow(state.roundStart, state.roundEnd)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
