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

/**
 * Edits an existing day's challenge/safety text in place — works whether
 * it's still a draft or already published (live). Doesn't touch `published`
 * or the target ring at all, so this never un-publishes or reshuffles
 * anything; it's purely a correction to the posted text.
 */
export async function updateDay(
  dayId: number,
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

  const day = await db.query.days.findFirst({ where: eq(days.dayId, dayId) });
  if (!day) return { error: "That day doesn't exist." };

  await db
    .update(days)
    .set({ challengeTitle, challengeDescription, safetyText, safetyStart, safetyEnd })
    .where(eq(days.dayId, dayId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: "Day updated." };
}

/**
 * Stages a safety update on this day without touching the live safety text
 * shown on the home page — completely invisible until applyDraftSafety is
 * called. Lets the admin write tomorrow's safety notice in advance while
 * today's is still live, without creating a new day or touching targets.
 */
export async function saveDraftSafety(
  dayId: number,
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const draftSafetyText = String(formData.get("draftSafetyText") ?? "").trim();
  const draftSafetyStart = easternInputValueToDate(String(formData.get("draftSafetyStart") ?? ""));
  const draftSafetyEnd = easternInputValueToDate(String(formData.get("draftSafetyEnd") ?? ""));

  if (!draftSafetyText) {
    return { error: "Draft safety text is required." };
  }
  if (draftSafetyStart && draftSafetyEnd && draftSafetyEnd.getTime() <= draftSafetyStart.getTime()) {
    return { error: "Draft safety end time must be after the start time." };
  }

  const day = await db.query.days.findFirst({ where: eq(days.dayId, dayId) });
  if (!day) return { error: "That day doesn't exist." };

  await db
    .update(days)
    .set({ draftSafetyText, draftSafetyStart, draftSafetyEnd })
    .where(eq(days.dayId, dayId));

  revalidatePath("/admin");
  return { ok: "Draft safety saved — not visible to anyone until you apply it." };
}

/** Copies the staged draft safety fields over the live ones and clears the draft. Instant, no targets touched. */
export async function applyDraftSafety(dayId: number): Promise<AdminState> {
  await requireAdmin();

  const day = await db.query.days.findFirst({ where: eq(days.dayId, dayId) });
  if (!day) return { error: "That day doesn't exist." };
  if (!day.draftSafetyText) return { error: "No draft safety to apply." };

  await db
    .update(days)
    .set({
      safetyText: day.draftSafetyText,
      safetyStart: day.draftSafetyStart,
      safetyEnd: day.draftSafetyEnd,
      draftSafetyText: null,
      draftSafetyStart: null,
      draftSafetyEnd: null,
    })
    .where(eq(days.dayId, dayId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: "Draft safety applied — now live." };
}

/** Discards a staged draft safety without applying it. */
export async function discardDraftSafety(dayId: number): Promise<AdminState> {
  await requireAdmin();

  await db
    .update(days)
    .set({ draftSafetyText: null, draftSafetyStart: null, draftSafetyEnd: null })
    .where(eq(days.dayId, dayId));

  revalidatePath("/admin");
  return { ok: "Draft discarded." };
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

  let chainNote = "";

  await db.transaction(async (tx) => {
    // Snapshot of any chain reassignment this elimination triggers, so
    // undoElimination can reverse it exactly. Stays all-null if this
    // elimination doesn't complete a wipe.
    let wipedTeamId: number | null = null;
    let hunterTeamId: number | null = null;
    let wipedTeamOldTargetTeamId: number | null = null;
    let hunterRowDeleted = false;

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
      wipedTeamId = player.teamId;
      await tx.update(teams).set({ eliminated: true }).where(eq(teams.teamId, wipedTeamId));

      // Classic Assassins chain rule: whoever was *actually* hunting the
      // now-wiped team (per the ring, not necessarily whoever got
      // elimination credit above) immediately inherits that team's own
      // target, skipping the wiped team. buildTargetRing guarantees no
      // team ever targets itself, so hunterTarget.teamId !== wipedTeamId.
      const [hunterTarget, wipedTeamTarget] = await Promise.all([
        tx.query.targets.findFirst({
          where: and(eq(targets.dayId, currentDay.dayId), eq(targets.targetTeamId, wipedTeamId)),
          with: { team: true },
        }),
        tx.query.targets.findFirst({
          where: and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, wipedTeamId)),
          with: { targetTeam: true },
        }),
      ]);

      if (hunterTarget && wipedTeamTarget) {
        hunterTeamId = hunterTarget.teamId;
        wipedTeamOldTargetTeamId = wipedTeamTarget.targetTeamId;

        if (wipedTeamTarget.targetTeamId === hunterTarget.teamId) {
          // The wiped team's target was the hunter itself — nobody left to
          // hunt. Last team standing; clear their target rather than have
          // them point at themselves.
          await tx
            .delete(targets)
            .where(and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, hunterTarget.teamId)));
          hunterRowDeleted = true;
          chainNote = ` ${hunterTarget.team.name} has eliminated their target chain — no target remains (last team standing).`;
        } else {
          await tx
            .update(targets)
            .set({ targetTeamId: wipedTeamTarget.targetTeamId })
            .where(and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, hunterTarget.teamId)));
          chainNote = ` ${hunterTarget.team.name} inherits ${wipedTeamTarget.targetTeam.name} as their new target.`;
        }
      }

      // The wiped team is out of the game — drop their own target row too.
      await tx
        .delete(targets)
        .where(and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, wipedTeamId)));
    }

    await tx.insert(eliminations).values({
      playerNetId,
      creditedTeamId,
      dayId: currentDay.dayId,
      pointsAwarded,
      wipedTeamId,
      hunterTeamId,
      wipedTeamOldTargetTeamId,
      hunterRowDeleted,
    });
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return onTarget
    ? { ok: `${player.firstName} ${player.lastName} eliminated — ${creditedTeam.name} credited +${pointsAwarded}.${chainNote}` }
    : { ok: `${player.firstName} ${player.lastName} eliminated. ${creditedTeam.name} wasn't targeting that team, so no points were awarded.${chainNote}` };
}

/**
 * Reverses a recorded elimination: un-eliminates the player, subtracts any
 * points it awarded, and un-eliminates their team (recomputed live — if
 * this player is no longer eliminated, their team can't be "fully wiped"
 * anymore, regardless of what's stored). If this elimination completed a
 * chain-inheritance reassignment (see recordElimination), reverses that
 * too using the snapshot stored on the elimination row — restores the
 * wiped team's own target row and the hunter's target back to the wiped
 * team (or re-deletes-and-restores it, if it had been cleared for the
 * last-team-standing case).
 *
 * Rows recorded before this snapshot existed have no chain data to
 * reverse — player/points/team-eliminated still get fixed correctly, but
 * the target ring itself isn't touched for those, and the message says so.
 */
export async function undoElimination(eliminationId: number): Promise<AdminState> {
  await requireAdmin();

  const elimination = await db.query.eliminations.findFirst({
    where: eq(eliminations.eliminationId, eliminationId),
  });
  if (!elimination) return { error: "That elimination doesn't exist." };

  const player = await db.query.players.findFirst({ where: eq(players.netId, elimination.playerNetId) });
  if (!player) return { error: "That player no longer exists." };

  let ringWarning = "";

  await db.transaction(async (tx) => {
    await tx
      .update(players)
      .set({ eliminated: false, eliminatedAt: null })
      .where(eq(players.netId, elimination.playerNetId));

    // Reviving this player means their team can't be fully wiped anymore —
    // true regardless of whether we have chain-snapshot data for it.
    await tx.update(teams).set({ eliminated: false }).where(eq(teams.teamId, player.teamId));

    if (elimination.pointsAwarded > 0) {
      await tx
        .update(teams)
        .set({ points: sql`${teams.points} - ${elimination.pointsAwarded}` })
        .where(eq(teams.teamId, elimination.creditedTeamId));
    }

    if (elimination.wipedTeamId !== null) {
      const wipedTeamId = elimination.wipedTeamId;

      if (elimination.wipedTeamOldTargetTeamId !== null) {
        const existing = await tx.query.targets.findFirst({
          where: and(eq(targets.dayId, elimination.dayId), eq(targets.teamId, wipedTeamId)),
        });
        if (!existing) {
          await tx.insert(targets).values({
            dayId: elimination.dayId,
            teamId: wipedTeamId,
            targetTeamId: elimination.wipedTeamOldTargetTeamId,
          });
        } else {
          ringWarning = " Target ring has since changed further — restore it by hand if needed.";
        }
      }

      if (elimination.hunterTeamId !== null) {
        const hunterTeamId = elimination.hunterTeamId;
        if (elimination.hunterRowDeleted) {
          const existing = await tx.query.targets.findFirst({
            where: and(eq(targets.dayId, elimination.dayId), eq(targets.teamId, hunterTeamId)),
          });
          if (!existing) {
            await tx.insert(targets).values({
              dayId: elimination.dayId,
              teamId: hunterTeamId,
              targetTeamId: wipedTeamId,
            });
          } else {
            ringWarning = " Target ring has since changed further — restore it by hand if needed.";
          }
        } else {
          await tx
            .update(targets)
            .set({ targetTeamId: wipedTeamId })
            .where(and(eq(targets.dayId, elimination.dayId), eq(targets.teamId, hunterTeamId)));
        }
      }
    }
    // else: no snapshot (this elimination didn't complete a wipe, or it's
    // a legacy row from before this column existed) — nothing to reverse
    // on the target ring either way.

    await tx.delete(eliminations).where(eq(eliminations.eliminationId, eliminationId));
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: `Undid elimination of ${player.firstName} ${player.lastName}.${ringWarning}` };
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
