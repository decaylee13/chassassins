"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { days, targets, teams, players, eliminations } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { buildTargetRing } from "@/lib/ring";
import { easternInputValueToDate } from "@/lib/time";

export type AdminState = { error: string } | { ok: string } | undefined;

const POINTS_PER_KILL = 50;

export async function createDay(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const challengeTitle = String(formData.get("challengeTitle") ?? "").trim();
  const challengeDescription = String(formData.get("challengeDescription") ?? "").trim();
  const safetyText = String(formData.get("safetyText") ?? "").trim();
  const safetyStart = easternInputValueToDate(String(formData.get("safetyStart") ?? ""));
  const safetyEnd = easternInputValueToDate(String(formData.get("safetyEnd") ?? ""));

  if (!challengeTitle || !challengeDescription) {
    return { error: "Challenge title and description are both required." };
  }
  if (!safetyText) {
    return { error: "Safety notice text is required." };
  }
  if (safetyStart && safetyEnd && safetyEnd.getTime() <= safetyStart.getTime()) {
    return { error: "Safety end time must be after the start time." };
  }

  await db.insert(days).values({
    challengeTitle,
    challengeDescription,
    safetyText,
    safetyStart,
    safetyEnd,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: "Day posted." };
}

/** Shuffle active teams into a fresh target ring for this day (overwrites any existing, unpublished ring). */
export async function generateTargets(dayId: number): Promise<AdminState> {
  await requireAdmin();

  const day = await db.query.days.findFirst({ where: eq(days.dayId, dayId) });
  if (!day) return { error: "That day doesn't exist." };
  if (day.published) return { error: "Targets are already published for this day — can't regenerate." };

  const activeTeams = await db.query.teams.findMany({ where: eq(teams.eliminated, false) });
  if (activeTeams.length < 2) {
    return { error: "Need at least 2 active teams to generate a target ring." };
  }

  const ring = buildTargetRing(activeTeams);

  await db.delete(targets).where(eq(targets.dayId, dayId));
  await db.insert(targets).values(
    ring.map(({ team, target }) => ({
      dayId,
      teamId: team.teamId,
      targetTeamId: target.teamId,
    })),
  );

  revalidatePath("/admin");
  return { ok: `Generated targets for ${ring.length} teams.` };
}

export async function publishDay(dayId: number): Promise<AdminState> {
  await requireAdmin();

  const day = await db.query.days.findFirst({
    where: eq(days.dayId, dayId),
    with: { targets: true },
  });
  if (!day) return { error: "That day doesn't exist." };
  if (day.targets.length === 0) return { error: "Generate targets before publishing." };

  await db.update(days).set({ published: true }).where(eq(days.dayId, dayId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: "Targets published — teams can now see them." };
}

export async function recordElimination(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const playerNetId = String(formData.get("playerNetId") ?? "").trim().toLowerCase();
  const creditedTeamId = Number(formData.get("creditedTeamId"));

  const player = await db.query.players.findFirst({ where: eq(players.netId, playerNetId) });
  if (!player) return { error: "Unknown player net ID." };
  if (player.eliminated) return { error: `${player.firstName} ${player.lastName} is already eliminated.` };
  if (!creditedTeamId) return { error: "Pick which team gets credit." };

  const creditedTeam = await db.query.teams.findFirst({ where: eq(teams.teamId, creditedTeamId) });
  if (!creditedTeam) return { error: "Unknown credited team." };

  const currentDay = await db.query.days.findFirst({
    where: eq(days.published, true),
    orderBy: desc(days.dayId),
  });
  if (!currentDay) return { error: "No published day to record eliminations against." };

  const target = await db.query.targets.findFirst({
    where: and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, creditedTeamId)),
  });
  const onTarget = target !== undefined && target.targetTeamId === player.teamId;
  const pointsAwarded = onTarget ? POINTS_PER_KILL : 0;

  await db.transaction(async (tx) => {
    await tx.insert(eliminations).values({
      playerNetId,
      creditedTeamId,
      dayId: currentDay.dayId,
      pointsAwarded,
    });

    await tx
      .update(players)
      .set({ eliminated: true, eliminatedAt: new Date() })
      .where(eq(players.netId, playerNetId));

    if (pointsAwarded > 0) {
      await tx
        .update(teams)
        .set({ points: sql`${teams.points} + ${pointsAwarded}` })
        .where(eq(teams.teamId, creditedTeamId));
    }

    // If both members of the eliminated player's team are now out, the team is out.
    const remaining = await tx.query.players.findMany({
      where: and(eq(players.teamId, player.teamId), eq(players.eliminated, false)),
    });
    if (remaining.length === 0) {
      await tx.update(teams).set({ eliminated: true }).where(eq(teams.teamId, player.teamId));
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return onTarget
    ? { ok: `${player.firstName} ${player.lastName} eliminated — ${creditedTeam.name} credited +${pointsAwarded}.` }
    : { ok: `${player.firstName} ${player.lastName} eliminated. ${creditedTeam.name} wasn't targeting that team, so no points were awarded.` };
}

/**
 * Deletes a team outright — its players, any target-ring rows involving it,
 * and any eliminations tied to it (as victim's team or as the credited
 * team) all cascade via the FK constraints (see schema.ts). Meant for
 * cleaning up mistaken/duplicate teams; there's no undo.
 */
export async function deleteTeam(teamId: number): Promise<AdminState> {
  await requireAdmin();

  const team = await db.query.teams.findFirst({ where: eq(teams.teamId, teamId) });
  if (!team) return { error: "That team doesn't exist." };

  await db.delete(teams).where(eq(teams.teamId, teamId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: `Deleted team "${team.name}".` };
}

/**
 * Deletes a day outright — its target ring and any eliminations logged
 * against it cascade via the FK constraints (see schema.ts). Points already
 * awarded to teams from those eliminations are NOT reversed (team.points is
 * a running tally updated at record time, not recomputed from the log), so
 * deleting a day removes the *record*, not points already banked from it.
 * Meant for cleaning up a mistaken day post; there's no undo.
 */
export async function deleteDay(dayId: number): Promise<AdminState> {
  await requireAdmin();

  const day = await db.query.days.findFirst({ where: eq(days.dayId, dayId) });
  if (!day) return { error: "That day doesn't exist." };

  await db.delete(days).where(eq(days.dayId, dayId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: `Deleted "${day.challengeTitle}".` };
}
