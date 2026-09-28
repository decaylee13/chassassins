import { easternInputValueToDate } from "./time";

/**
 * The game is divided into calendar-driven rounds — independent of the
 * admin-posted "days" (challenge/safety/targets, see src/db/schema.ts
 * `days`). Rounds are normally 4 days each, but the schedule isn't a pure
 * arithmetic progression: Round 3 was pushed back 3 days (a scheduled
 * pause between Round 2 ending Sep 26 and Round 3 starting Sep 29), so
 * every round's start/end is listed explicitly rather than derived from a
 * single season-start + fixed length.
 */
export const ROUND_LENGTH_DAYS = 4;

interface RoundDef {
  start: string; // Eastern Time wall-clock, "YYYY-MM-DDTHH:mm"
  end: string;
}

const ROUND_DEFS_ET: RoundDef[] = [
  { start: "2026-09-18T00:00", end: "2026-09-22T00:00" }, // Round 1
  { start: "2026-09-22T00:00", end: "2026-09-26T00:00" }, // Round 2
  { start: "2026-09-29T00:00", end: "2026-10-03T00:00" }, // Round 3 — shifted +3d
  { start: "2026-10-03T00:00", end: "2026-10-07T00:00" }, // Round 4
  { start: "2026-10-07T00:00", end: "2026-10-11T00:00" }, // Round 5
];

export const TOTAL_ROUNDS = ROUND_DEFS_ET.length;

// Known-valid literals, so these conversions can't return null.
const ROUND_DEFS = ROUND_DEFS_ET.map((r) => ({
  start: easternInputValueToDate(r.start) as Date,
  end: easternInputValueToDate(r.end) as Date,
}));

export const SEASON_START: Date = ROUND_DEFS[0].start;

/** Start/end instants for a given 1-indexed round number, independent of "now". */
export function getRoundDates(roundNumber: number): { start: Date; end: Date } {
  const def = ROUND_DEFS[roundNumber - 1];
  if (!def) throw new Error(`No such round: ${roundNumber}`);
  return def;
}

export function getAllRounds(): Array<{ roundNumber: number; start: Date; end: Date }> {
  return ROUND_DEFS.map((def, i) => ({ roundNumber: i + 1, ...def }));
}

export type RoundState =
  | { status: "not-started"; roundNumber: 1; roundStart: Date; roundEnd: Date }
  | { status: "in-progress"; roundNumber: number; roundStart: Date; roundEnd: Date }
  // Between two rounds — the previous one ended but the next hasn't started
  // yet (e.g. the Round 2 -> Round 3 gap). Carries the upcoming round.
  | { status: "waiting"; roundNumber: number; roundStart: Date; roundEnd: Date }
  | { status: "complete"; roundNumber: typeof TOTAL_ROUNDS };

export function getRoundState(now: Date): RoundState {
  const nowMs = now.getTime();

  const first = ROUND_DEFS[0];
  if (nowMs < first.start.getTime()) {
    return { status: "not-started", roundNumber: 1, roundStart: first.start, roundEnd: first.end };
  }

  for (let i = 0; i < ROUND_DEFS.length; i++) {
    const def = ROUND_DEFS[i];
    if (nowMs >= def.start.getTime() && nowMs < def.end.getTime()) {
      return { status: "in-progress", roundNumber: i + 1, roundStart: def.start, roundEnd: def.end };
    }
    const next = ROUND_DEFS[i + 1];
    if (next && nowMs >= def.end.getTime() && nowMs < next.start.getTime()) {
      return { status: "waiting", roundNumber: i + 2, roundStart: next.start, roundEnd: next.end };
    }
  }

  return { status: "complete", roundNumber: TOTAL_ROUNDS };
}
