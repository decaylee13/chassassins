import type { Metadata } from "next";
import { desc, eq, and } from "drizzle-orm";

import { db } from "@/db";
import { days, targets, players } from "@/db/schema";
import { requirePlayer } from "@/lib/dal";

export const metadata: Metadata = { title: "My team" };

export default async function DashboardPage() {
  const player = await requirePlayer();

  const teammates = await db.query.players.findMany({
    where: eq(players.teamId, player.teamId),
  });

  const currentDay = await db.query.days.findFirst({
    where: eq(days.published, true),
    orderBy: desc(days.dayId),
  });

  const myTarget = currentDay
    ? await db.query.targets.findFirst({
        where: and(eq(targets.dayId, currentDay.dayId), eq(targets.teamId, player.teamId)),
        with: { targetTeam: { with: { players: true } } },
      })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <section className="overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-5 text-cream">
          <p className="text-xs uppercase tracking-widest text-gold">Your team</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {player.team.name}
            {player.team.eliminated ? (
              <span className="ml-2 rounded bg-cream/20 px-1.5 py-0.5 align-middle text-xs font-medium">
                eliminated
              </span>
            ) : null}
          </h1>
        </div>

        <div className="grid grid-cols-2 divide-x divide-tint text-center">
          <div className="px-4 py-5">
            <div className="text-3xl font-semibold text-maroon">{player.team.points}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">Points</div>
          </div>
          <div className="px-4 py-5">
            <ul className="flex flex-col gap-1 text-sm">
              {teammates.map((t) => (
                <li key={t.netId} className={t.eliminated ? "text-ink/40 line-through" : ""}>
                  {t.firstName} {t.lastName}
                </li>
              ))}
            </ul>
            <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">Members</div>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Your target</h2>
        </div>
        <div className="p-6">
          {!currentDay ? (
            <p className="text-sm text-ink/60">No targets have been published yet.</p>
          ) : !myTarget ? (
            <p className="text-sm text-ink/60">
              You don&apos;t have a target for the current round — check back
              once the admin publishes the next one.
            </p>
          ) : (
            <div>
              <p className="text-xl font-semibold text-maroon">
                {myTarget.targetTeam.name}
              </p>
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
    </main>
  );
}
