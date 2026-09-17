import { easternInputValueToDate } from "./time";

/**
 * The game is divided into fixed, calendar-driven rounds — independent of
 * the admin-posted "days" (challenge/safety/targets, see src/db/schema.ts
 * `days`). A round is purely a 3-day window computed from a fixed season
 * start; nothing about it depends on admin action.
 */
export const ROUND_LENGTH_DAYS = 3;
export const ROUND_LENGTH_MS = ROUND_LENGTH_DAYS * 24 * 60 * 60 * 1000;

// Round 1 starts Sep 18, 2026, 12:00 AM Eastern Time. Known-valid literal,
// so the conversion can't return null.
const SEASON_START_ET = "2026-09-18T00:00";
export const SEASON_START: Date = easternInputValueToDate(SEASON_START_ET) as Date;

export const TOTAL_ROUNDS = 5;

/** Start/end instants for a given 1-indexed round number, independent of "now". */
export function getRoundDates(roundNumber: number): { start: Date; end: Date } {
  const startMs = SEASON_START.getTime() + (roundNumber - 1) * ROUND_LENGTH_MS;
  return { start: new Date(startMs), end: new Date(startMs + ROUND_LENGTH_MS) };
}

export function getAllRounds(): Array<{ roundNumber: number; start: Date; end: Date }> {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
    roundNumber: i + 1,
    ...getRoundDates(i + 1),
  }));
}

export interface RoundState {
  status: "not-started" | "in-progress";
  /** 1-indexed. While not-started, this describes the upcoming Round 1. */
  roundNumber: number;
  roundStart: Date;
  roundEnd: Date;
}

export function getRoundState(now: Date): RoundState {
  const nowMs = now.getTime();
  const startMs = SEASON_START.getTime();

  if (nowMs < startMs) {
    return {
      status: "not-started",
      roundNumber: 1,
      roundStart: SEASON_START,
      roundEnd: new Date(startMs + ROUND_LENGTH_MS),
    };
  }

  const roundIndex = Math.floor((nowMs - startMs) / ROUND_LENGTH_MS);
  const roundStartMs = startMs + roundIndex * ROUND_LENGTH_MS;
  return {
    status: "in-progress",
    roundNumber: roundIndex + 1,
    roundStart: new Date(roundStartMs),
    roundEnd: new Date(roundStartMs + ROUND_LENGTH_MS),
  };
}
