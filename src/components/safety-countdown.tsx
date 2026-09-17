"use client";

import { useEffect, useState } from "react";

/**
 * Live "starts in Xh Ym" / "ends in Xh Ym" readout for a safety window.
 * Ticks every second on the client — the server only ever sends the raw
 * start/end instants, so this never needs its own data fetch.
 */
export function SafetyCountdown({
  start,
  end,
}: {
  start: string | null; // ISO string
  end: string | null; // ISO string
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Defer the first tick instead of calling setState synchronously here —
    // rendering `null` until this fires (below) is what keeps the server and
    // client's first paint identical, avoiding a hydration mismatch.
    const kick = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
    };
  }, []);

  if (!start && !end) return null;
  // Avoid a server/client mismatch on first paint — render nothing until
  // the client clock kicks in, then show the live countdown.
  if (now === null) return null;

  const startMs = start ? new Date(start).getTime() : null;
  const endMs = end ? new Date(end).getTime() : null;

  let label: string;
  if (startMs !== null && now < startMs) {
    label = `Starts in ${formatDuration(startMs - now)}`;
  } else if (endMs !== null && now < endMs) {
    label = `In effect — ends in ${formatDuration(endMs - now)}`;
  } else if (endMs !== null) {
    label = "Safety window has ended";
  } else {
    label = "In effect now";
  }

  return <p className="mt-1 text-xs font-semibold text-oxblood">{label}</p>;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
