import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { days } from "@/db/schema";
import { formatWindow } from "@/lib/time";
import { SafetyCountdown } from "@/components/safety-countdown";
import { RoundCountdown } from "@/components/round-countdown";

export default async function HomePage() {
  const [latestDay, allTeams] = await Promise.all([
    // Only the latest *published* day is shown here — a posted-but-unpublished
    // day stays visible to the admin (on /admin) so they can review the
    // challenge/safety text and the generated target ring before it goes live.
    db.query.days.findFirst({ where: eq(days.published, true), orderBy: desc(days.dayId) }),
    db.query.teams.findMany({
      with: { players: true },
      orderBy: (t, { desc: d }) => [d(t.points)],
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-maroon">Chassassins</h1>
        <p className="mt-2 text-sm text-ink/60">
          Charter Club&apos;s assassins challenge. Teams of two, one target at
          a time, tracked here.
        </p>
      </div>

      <RoundCountdown />

      {latestDay ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
          <div className="bg-maroon px-6 py-3 text-cream">
            <h2 className="text-lg font-semibold">
              Today&apos;s challenge: {latestDay.challengeTitle}
            </h2>
          </div>
          <p className="px-6 py-4 text-sm text-ink/80">
            {latestDay.challengeDescription}
          </p>
          <div className="border-t border-amber bg-gold/20 px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-oxblood">
              Safety
            </h3>
            <p className="mt-1 text-sm text-ink/90">{latestDay.safetyText}</p>
            {latestDay.safetyStart && latestDay.safetyEnd ? (
              <p className="mt-1 text-xs font-medium text-oxblood">
                {formatWindow(latestDay.safetyStart, latestDay.safetyEnd)}
              </p>
            ) : null}
            <SafetyCountdown
              start={latestDay.safetyStart?.toISOString() ?? null}
              end={latestDay.safetyEnd?.toISOString() ?? null}
            />
          </div>
        </section>
      ) : null}

      <Link
        href="/rules"
        className="mb-6 flex items-center justify-between overflow-hidden rounded-2xl border border-tint bg-white px-6 py-4 shadow-sm hover:border-amber"
      >
        <div>
          <h2 className="font-medium text-maroon">Rules</h2>
          <p className="text-sm text-ink/60">
            Scoring, team immunity, rounds, and safe zones.
          </p>
        </div>
        <span className="text-maroon">→</span>
      </Link>

      <section className="overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
        </div>
        {allTeams.length === 0 ? (
          <p className="p-6 text-sm text-ink/60">No teams yet.</p>
        ) : (
          <ol className="divide-y divide-tint">
            {allTeams.map((team, i) => (
              <li
                key={team.teamId}
                className="flex items-center justify-between gap-3 px-6 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-sm font-medium text-ink/40">
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={team.eliminated ? "font-medium text-ink/40 line-through" : "font-medium"}>
                        {team.name}
                      </span>
                      {team.eliminated ? (
                        <span className="rounded bg-tint px-1.5 py-0.5 text-xs text-ink/60">
                          eliminated
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink/50">
                      {team.players.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    team.eliminated
                      ? "text-lg font-semibold text-ink/40 line-through"
                      : "text-lg font-semibold text-maroon"
                  }
                >
                  {team.points}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
