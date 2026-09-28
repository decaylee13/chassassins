"use client";

import { useEffect, useState } from "react";
import { getRoundState } from "@/lib/rounds";
import { formatDuration } from "@/lib/duration";
import { formatDateTime, formatWindow } from "@/lib/time";

/**
 * Live countdown card for the current round: "Starts in Xd Yh" before Round
 * 1 begins or during a between-rounds gap, "Ends in Xd Yh" while a round is
 * running, or a wrap-up message once the last round has ended. Ticks every
 * second on the client — everything it needs (the fixed round schedule) is
 * a constant, so it needs no server data at all.
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

  if (state.status === "complete") {
    return (
      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Season complete</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-ink/70">
            Round {state.roundNumber} has ended — that was the last one.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
      <div className="bg-maroon px-6 py-3 text-cream">
        <h2 className="text-lg font-semibold">Round {state.roundNumber}</h2>
      </div>
      <div className="px-6 py-4">
        {state.status === "in-progress" ? (
          <>
            <p className="text-2xl font-semibold text-maroon">
              Ends in {formatDuration(state.roundEnd.getTime() - now)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {formatWindow(state.roundStart, state.roundEnd)}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-maroon">
              Starts in {formatDuration(state.roundStart.getTime() - now)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              Begins {formatDateTime(state.roundStart)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
