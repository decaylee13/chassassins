import type { Metadata } from "next";
import { desc, eq, and } from "drizzle-orm";

import { db } from "@/db";
import { days, teams, players, targets } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { formatDateTime, formatWindow } from "@/lib/time";
import { DayForm } from "./day-form";
import { GenerateButton, PublishButton, DeleteDayButton } from "./day-actions";
import { EliminateForm } from "./eliminate-form";
import { DeleteTeamButton } from "./team-actions";
import { EditDaySection } from "./edit-day-form";
import { UndoEliminationButton } from "./undo-elimination-button";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const adminNetId = await requireAdmin();

  const [allDays, activeTeams, remainingPlayers, allTeams, adminPlayer, recentEliminations] = await Promise.all([
    db.query.days.findMany({
      orderBy: desc(days.dayId),
      with: { targets: { with: { team: true, targetTeam: true } } },
    }),
    db.query.teams.findMany({
      where: eq(teams.eliminated, false),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    db.query.players.findMany({
      where: eq(players.eliminated, false),
      with: { team: true },
      orderBy: (p, { asc }) => [asc(p.lastName)],
    }),
    db.query.teams.findMany({
      with: { players: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    // An admin can also be a player on a team (e.g. dl2635) — if so, show
    // their own target below, same as a regular player sees on /dashboard.
    db.query.players.findFirst({ where: eq(players.netId, adminNetId), with: { team: true } }),
    db.query.eliminations.findMany({
      orderBy: (e, { desc: d }) => [d(e.createdAt)],
      limit: 30,
      with: { player: true, creditedTeam: true },
    }),
  ]);

  const currentDay = allDays.find((d) => d.published);
  const myTarget =
    adminPlayer && currentDay
      ? await db.query.targets.findFirst({
          where: and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, adminPlayer.teamId)),
          with: { targetTeam: { with: { players: true } } },
        })
      : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-maroon">Admin</h1>

      {adminPlayer ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
          <div className="bg-maroon px-6 py-3 text-cream">
            <h2 className="text-lg font-semibold">
              Your target — playing as {adminPlayer.team.name}
            </h2>
          </div>
          <div className="p-6">
            {!currentDay ? (
              <p className="text-sm text-ink/60">No targets have been published yet.</p>
            ) : !myTarget ? (
              <p className="text-sm text-ink/60">
                You don&apos;t have a target for the current round.
              </p>
            ) : (
              <div>
                <p className="text-xl font-semibold text-maroon">{myTarget.targetTeam.name}</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {myTarget.targetTeam.players.map((t) => (
                    <li key={t.netId} className={t.eliminated ? "text-ink/40 line-through" : ""}>
                      {t.firstName} {t.lastName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Post a new day</h2>
        </div>
        <div className="p-6">
          <DayForm />
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Record an elimination</h2>
        </div>
        <div className="p-6">
          {remainingPlayers.length === 0 || activeTeams.length === 0 ? (
            <p className="text-sm text-ink/60">No active players/teams yet.</p>
          ) : (
            <EliminateForm players={remainingPlayers} teams={activeTeams} />
          )}
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Eliminations</h2>
        </div>
        {recentEliminations.length === 0 ? (
          <p className="p-6 text-sm text-ink/60">No eliminations recorded yet.</p>
        ) : (
          <ul className="divide-y divide-tint">
            {recentEliminations.map((e) => (
              <li key={e.eliminationId} className="flex items-center justify-between gap-3 px-6 py-3">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">
                      {e.player.firstName} {e.player.lastName}
                    </span>{" "}
                    — credited to {e.creditedTeam.name}
                    {e.pointsAwarded > 0 ? (
                      <span className="ml-1 text-maroon">+{e.pointsAwarded}</span>
                    ) : (
                      <span className="ml-1 text-ink/40">+0</span>
                    )}
                  </p>
                  <p className="text-xs text-ink/40">{formatDateTime(e.createdAt)}</p>
                </div>
                <UndoEliminationButton
                  eliminationId={e.eliminationId}
                  label={`${e.player.firstName} ${e.player.lastName}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Teams</h2>
        </div>
        {allTeams.length === 0 ? (
          <p className="p-6 text-sm text-ink/60">No teams yet.</p>
        ) : (
          <ul className="divide-y divide-tint">
            {allTeams.map((team) => (
              <li key={team.teamId} className="flex items-center justify-between gap-3 px-6 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{team.name}</span>
                    {team.eliminated ? (
                      <span className="rounded bg-tint px-1.5 py-0.5 text-xs text-ink/60">
                        eliminated
                      </span>
                    ) : null}
                    <span className="text-sm text-maroon">{team.points} pts</span>
                  </div>
                  <p className="text-xs text-ink/50">
                    {team.players.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}
                  </p>
                </div>
                <DeleteTeamButton teamId={team.teamId} teamName={team.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-maroon">Days</h2>
        {allDays.length === 0 ? (
          <p className="text-sm text-ink/60">No days posted yet.</p>
        ) : (
          allDays.map((day) => (
            <div
              key={day.dayId}
              className="overflow-hidden rounded-2xl border border-tint bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-maroon px-6 py-3 text-cream">
                <h3 className="font-semibold">{day.challengeTitle}</h3>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      day.published ? "bg-gold text-oxblood" : "bg-cream/20 text-cream"
                    }`}
                  >
                    {day.published ? "Published" : "Draft"}
                  </span>
                  <DeleteDayButton dayId={day.dayId} title={day.challengeTitle} />
                </div>
              </div>
              <div className="flex flex-col gap-3 p-6">
                <p className="text-sm text-ink/80">{day.challengeDescription}</p>
                <div className="rounded-lg bg-gold/20 px-4 py-2 text-sm">
                  <span className="font-medium text-oxblood">Safety: </span>
                  {day.safetyText}
                  {day.safetyStart && day.safetyEnd ? (
                    <span className="ml-1 text-xs text-oxblood/80">
                      ({formatWindow(day.safetyStart, day.safetyEnd)})
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-ink/40">Posted {formatDateTime(day.createdAt)}</p>

                <EditDaySection day={day} />

                {day.targets.length === 0 ? (
                  <GenerateButton dayId={day.dayId} label="Generate targets" />
                ) : (
                  <>
                    <table className="w-full overflow-hidden rounded-lg border border-tint text-sm">
                      <thead>
                        <tr className="bg-cream text-left text-xs uppercase tracking-wide text-ink/50">
                          <th className="px-3 py-2">Team</th>
                          <th className="px-3 py-2">Targets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tint">
                        {day.targets.map((t) => (
                          <tr key={t.teamId}>
                            <td className="px-3 py-2">{t.team.name}</td>
                            <td className="px-3 py-2 font-medium text-maroon">
                              {t.targetTeam.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!day.published ? (
                      <div className="flex gap-3">
                        <GenerateButton dayId={day.dayId} label="Regenerate" />
                        <PublishButton dayId={day.dayId} />
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
