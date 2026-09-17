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
    dayId: integer("day_id").notNull().references(() => days.dayId),
    pointsAwarded: integer("points_awarded").notNull().default(0),
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
export type TeamWithPlayers = Team & { players: Player[] };
