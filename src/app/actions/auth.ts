"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { players, teams, adminCredentials } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { findRosterMember, isAdminNetId, normalizeNetId } from "@/data/roster";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

export type LoginState =
  | { error: string }
  | { step: "create-password"; netId: string; error?: string }
  | { step: "enter-password"; netId: string; error?: string }
  | undefined;

/**
 * Two-step login, net ID first:
 *  1. Net ID only (stage="netid"). Unknown / not-yet-a-team -> error.
 *     Known but no password set yet -> step "create-password" (first login
 *     since this feature shipped, or a partner slot from /join that never
 *     set one). Known with a password -> step "enter-password".
 *  2. Net ID (hidden, stage="password") + password (+ confirmPassword for
 *     create) -> verify or set the password, then sign in.
 *
 * Admins (data/roster.ts ADMIN_NET_IDS) follow the identical two cases but
 * against `adminCredentials` instead of `players`, since they're not rows
 * in `players` (they're not on a team).
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const netId = normalizeNetId(String(formData.get("netId") ?? ""));
  const stage = String(formData.get("stage") ?? "netid");
  const password = String(formData.get("password") ?? "");

  if (isAdminNetId(netId)) {
    const cred = await db.query.adminCredentials.findFirst({
      where: eq(adminCredentials.netId, netId),
    });

    if (stage === "netid") {
      return cred ? { step: "enter-password", netId } : { step: "create-password", netId };
    }

    if (!cred) {
      const confirmPassword = String(formData.get("confirmPassword") ?? "");
      const validationError = validateNewPassword(password, confirmPassword);
      if (validationError) return { step: "create-password", netId, error: validationError };

      await db.insert(adminCredentials).values({ netId, passwordHash: hashPassword(password) });
      await createSession(netId);
      redirect("/admin");
    }

    if (!verifyPassword(password, cred.passwordHash)) {
      return { step: "enter-password", netId, error: "Incorrect password." };
    }
    await createSession(netId);
    redirect("/admin");
  }

  if (!findRosterMember(netId)) {
    return { error: "That net ID isn't on the club roster." };
  }

  const player = await db.query.players.findFirst({ where: eq(players.netId, netId) });
  if (!player) {
    return { error: "No team found for that net ID yet — create a team first." };
  }

  if (stage === "netid") {
    return player.passwordHash
      ? { step: "enter-password", netId }
      : { step: "create-password", netId };
  }

  if (!player.passwordHash) {
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) return { step: "create-password", netId, error: validationError };

    await db.update(players).set({ passwordHash: hashPassword(password) }).where(eq(players.netId, netId));
    await createSession(netId);
    redirect("/dashboard");
  }

  if (!verifyPassword(password, player.passwordHash)) {
    return { step: "enter-password", netId, error: "Incorrect password." };
  }
  await createSession(netId);
  redirect("/dashboard");
}

function validateNewPassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords don't match.";
  }
  return null;
}

export type JoinState = { error: string } | undefined;

const TEAM_NAME_MAX = 40;

export async function join(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const yourNetId = normalizeNetId(String(formData.get("yourNetId") ?? ""));
  const partnerNetId = normalizeNetId(String(formData.get("partnerNetId") ?? ""));
  const teamName = String(formData.get("teamName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const you = findRosterMember(yourNetId);
  const partner = findRosterMember(partnerNetId);

  if (!you || !partner) {
    return { error: "Both net IDs must be on the club roster." };
  }
  if (yourNetId === partnerNetId) {
    return { error: "You need two different net IDs — yours and your partner's." };
  }
  if (!teamName) {
    return { error: "Pick a team name." };
  }
  if (teamName.length > TEAM_NAME_MAX) {
    return { error: `Team name must be ${TEAM_NAME_MAX} characters or fewer.` };
  }
  const passwordError = validateNewPassword(password, confirmPassword);
  if (passwordError) {
    return { error: passwordError };
  }

  const existingPlayers = await db.query.players.findMany({
    where: inArray(players.netId, [yourNetId, partnerNetId]),
  });
  if (existingPlayers.length > 0) {
    // One (or both) of these net IDs already has a team — sign in instead.
    redirect("/login");
  }

  const existingTeamName = await db.query.teams.findFirst({
    where: eq(teams.name, teamName),
  });
  if (existingTeamName) {
    return { error: "That team name is already taken." };
  }

  const [team] = await db.insert(teams).values({ name: teamName }).returning();
  await db.insert(players).values([
    {
      netId: yourNetId,
      firstName: you.firstName,
      lastName: you.lastName,
      teamId: team.teamId,
      passwordHash: hashPassword(password),
    },
    // Your partner isn't present to set their own password right now — they
    // set it the first time they log in (see `login`'s create-password step).
    { netId: partnerNetId, firstName: partner.firstName, lastName: partner.lastName, teamId: team.teamId },
  ]);

  await createSession(yourNetId);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
