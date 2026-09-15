"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { findRosterMember, isAdminNetId, normalizeNetId } from "@/data/roster";

export type LoginState = { error: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const netId = normalizeNetId(String(formData.get("netId") ?? ""));

  if (isAdminNetId(netId)) {
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

  await createSession(netId);
  redirect("/dashboard");
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
    { netId: yourNetId, firstName: you.firstName, lastName: you.lastName, teamId: team.teamId },
    { netId: partnerNetId, firstName: partner.firstName, lastName: partner.lastName, teamId: team.teamId },
  ]);

  await createSession(yourNetId);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
