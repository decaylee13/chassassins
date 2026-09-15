import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { players, type Player, type Team } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isAdminNetId } from "@/data/roster";

/**
 * Data Access Layer. Every server component / action / route handler that
 * needs "the logged-in player" or "is this the admin" goes through here.
 *
 * `cache()` memoizes each result for the duration of one request.
 */

export const getSessionNetId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  return session?.netId ?? null;
});

export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const netId = await getSessionNetId();
  return netId !== null && isAdminNetId(netId);
});

export const getCurrentPlayer = cache(
  async (): Promise<(Player & { team: Team }) | null> => {
    const netId = await getSessionNetId();
    if (!netId) return null;

    const player = await db.query.players.findFirst({
      where: eq(players.netId, netId),
      with: { team: true },
    });

    return player ?? null;
  },
);

/** Use in admin-only pages/actions. Redirects to /login if the session isn't the admin. */
export async function requireAdmin(): Promise<string> {
  const netId = await getSessionNetId();
  if (!netId || !isAdminNetId(netId)) redirect("/login");
  return netId;
}

/** Use in team-only pages/actions. Redirects to /join if signed in but teamless, /login otherwise. */
export async function requirePlayer(): Promise<Player & { team: Team }> {
  const netId = await getSessionNetId();
  if (!netId) redirect("/login");
  const player = await getCurrentPlayer();
  if (!player) redirect("/join");
  return player;
}

export function displayName(p: Pick<Player, "firstName" | "lastName">): string {
  return `${p.firstName} ${p.lastName}`;
}
