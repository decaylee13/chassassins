import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { eliminations } from "@/db/schema";

/**
 * "Kills" here means teams fully eliminated, not individual players — a
 * team's tally is the count of eliminations credited to them where
 * wipedTeamId is set (i.e. that specific elimination completed a full
 * wipe of the target team). This replaces raw points as the display/sort
 * metric; the underlying points/pointsAwarded machinery is untouched
 * (undoElimination still depends on it for exact reversal).
 */
export async function getKillCounts(): Promise<Map<number, number>> {
  const rows = await db
    .select({ creditedTeamId: eliminations.creditedTeamId, count: sql<number>`count(*)::int` })
    .from(eliminations)
    .where(isNotNull(eliminations.wipedTeamId))
    .groupBy(eliminations.creditedTeamId);

  return new Map(rows.map((r) => [r.creditedTeamId, r.count]));
}

export async function getKillCountForTeam(teamId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eliminations)
    .where(and(eq(eliminations.creditedTeamId, teamId), isNotNull(eliminations.wipedTeamId)));

  return row?.count ?? 0;
}
