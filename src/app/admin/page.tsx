import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { days, teams, players } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { formatDateTime, formatWindow } from "@/lib/time";
import { DayForm } from "./day-form";
import { GenerateButton, PublishButton } from "./day-actions";
import { EliminateForm } from "./eliminate-form";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();

  const [allDays, activeTeams, remainingPlayers] = await Promise.all([
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
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-maroon">Admin</h1>

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
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    day.published ? "bg-gold text-oxblood" : "bg-cream/20 text-cream"
                  }`}
                >
                  {day.published ? "Published" : "Draft"}
                </span>
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
