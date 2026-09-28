import {
    pgTable, text, integer, boolean, timestamp, serial, primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const teams = pgTable("teams", {
    teamId: serial("team_id").primaryKey(),
    name: text("name").notNull().unique(),
    points: integer("points").notNull().default(0),
    eliminated: boolean("eliminated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A player row is only ever created when a team forms (see actions/auth.ts
// `join`) — so "does a players row exist for this net ID" doubles as "is
// this person already on a team", with no separate flag needed.
export const players = pgTable("players", {
    netId: text("net_id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    teamId: integer("team_id").notNull().references(() => teams.teamId, { onDelete: "cascade" }),
    eliminated: boolean("eliminated").notNull().default(false),
    eliminatedAt: timestamp("eliminated_at", { withTimezone: true }),
    // Nullable: accounts created before password auth existed (or the
    // partner slot filled in at /join, which only sets a password for the
    // person submitting the form) have no password yet. Login prompts
    // whoever hits a null passwordHash to set one on the spot, rather than
    // locking anyone out — see actions/auth.ts `login`.
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Hardcoded admins (see data/roster.ts ADMIN_NET_IDS) aren't rows in
// `players` — they're not on a team — so their password lives here instead,
// same nullable-until-first-login-sets-it pattern.
export const adminCredentials = pgTable("admin_credentials", {
    netId: text("net_id").primaryKey(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per day of the challenge: the admin posts a challenge + safety
// notice immediately, then separately generates and publishes that day's
// target ring once ready.
export const days = pgTable("days", {
    dayId: serial("day_id").primaryKey(),
    challengeTitle: text("challenge_title").notNull(),
    challengeDescription: text("challenge_description").notNull(),
    safetyText: text("safety_text").notNull(),
    safetyStart: timestamp("safety_start", { withTimezone: true }),
    safetyEnd: timestamp("safety_end", { withTimezone: true }),
    // Optional image attached to the safety notice — stored as a data URI
    // (see lib/image-upload.ts) rather than external blob storage, so no
    // new infrastructure/credentials are needed. Fine at this scale; would
    // need revisiting if images got large/frequent enough to matter.
    safetyImageUrl: text("safety_image_url"),
    // A staged safety update — written in advance, completely invisible to
    // everyone (only the fields above are ever shown publicly) until the
    // admin clicks "Apply now", which copies these over the live fields and
    // clears the draft. Lets the admin prep tomorrow's safety notice while
    // today's is still live, without creating a new day or touching targets.
    draftSafetyText: text("draft_safety_text"),
    draftSafetyStart: timestamp("draft_safety_start", { withTimezone: true }),
    draftSafetyEnd: timestamp("draft_safety_end", { withTimezone: true }),
    draftSafetyImageUrl: text("draft_safety_image_url"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The target ring for one day: teamId hunts targetTeamId. Generated as a
// single random cycle over that day's still-active teams.
export const targets = pgTable("targets", {
    dayId: integer("day_id").notNull().references(() => days.dayId, { onDelete: "cascade" }),
    teamId: integer("team_id").notNull().references(() => teams.teamId, { onDelete: "cascade" }),
    targetTeamId: integer("target_team_id").notNull().references(() => teams.teamId, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.dayId, t.teamId] })]);

// Admin-recorded eliminations. pointsAwarded is computed at record time by
// checking whether the eliminated player's team was creditedTeam's target
// on that day (50 per matching kill; two kills on the same target team is
// just 50+50=100, per the rules).
export const eliminations = pgTable("eliminations", {
    eliminationId: serial("elimination_id").primaryKey(),
    // cascade on both: deleting a team removes its players (players.teamId
    // cascade, below) and any elimination this team was credited for, so
    // deleting a team can't be blocked by its own game history.
    playerNetId: text("player_net_id").notNull().references(() => players.netId, { onDelete: "cascade" }),
    creditedTeamId: integer("credited_team_id").notNull().references(() => teams.teamId, { onDelete: "cascade" }),
    // Nullable + set-null (not cascade): deleting a day must not destroy
    // the points/kill-credit history of eliminations recorded against it.
    // A day can still be deleted freely; its eliminations just detach
    // (dayId -> null) instead of disappearing. (Previously this cascaded,
    // which silently wiped kill-tally history for every team eliminated
    // under a day that later got deleted — the actual cause of a real
    // data-loss incident.)
    dayId: integer("day_id").references(() => days.dayId, { onDelete: "set null" }),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    // Populated only when this elimination completed a full team wipe (see
    // recordElimination) — the "before" state of any chain-inheritance
    // reassignment, so undoElimination can reverse it exactly. Null on
    // eliminations that didn't complete a wipe, and on rows recorded before
    // this column existed (undo still reverts points/player/team-eliminated
    // for those — recomputed live, not from this snapshot — it just can't
    // restore the target ring for them).
    wipedTeamId: integer("wiped_team_id"),
    hunterTeamId: integer("hunter_team_id"),
    wipedTeamOldTargetTeamId: integer("wiped_team_old_target_team_id"),
    hunterRowDeleted: boolean("hunter_row_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
    players: many(players),
}));

export const playersRelations = relations(players, ({ one }) => ({
    team: one(teams, { fields: [players.teamId], references: [teams.teamId] }),
}));

export const daysRelations = relations(days, ({ many }) => ({
    targets: many(targets),
}));

export const targetsRelations = relations(targets, ({ one }) => ({
    team: one(teams, { fields: [targets.teamId], references: [teams.teamId] }),
    targetTeam: one(teams, { fields: [targets.targetTeamId], references: [teams.teamId] }),
    day: one(days, { fields: [targets.dayId], references: [days.dayId] }),
}));

export const eliminationsRelations = relations(eliminations, ({ one }) => ({
    player: one(players, { fields: [eliminations.playerNetId], references: [players.netId] }),
    creditedTeam: one(teams, { fields: [eliminations.creditedTeamId], references: [teams.teamId] }),
    day: one(days, { fields: [eliminations.dayId], references: [days.dayId] }),
}));

export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Day = typeof days.$inferSelect;
export type Target = typeof targets.$inferSelect;
export type Elimination = typeof eliminations.$inferSelect;
export type AdminCredential = typeof adminCredentials.$inferSelect;
export type TeamWithPlayers = Team & { players: Player[] };
