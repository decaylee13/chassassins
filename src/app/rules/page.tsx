import type { Metadata } from "next";
import Link from "next/link";

import { getAllRounds } from "@/lib/rounds";
import { formatWindow } from "@/lib/time";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
  const rounds = getAllRounds();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-maroon">Rules</h1>
        <p className="mt-2 text-sm text-ink/60">
          Scoring, rounds, and where you&apos;re safe.
        </p>
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Scoring</h2>
        </div>
        <ul className="flex flex-col gap-2 px-6 py-4 text-sm">
          <li>
            <span className="rounded bg-gold px-1.5 py-0.5 font-medium text-oxblood">
              50 pts
            </span>{" "}
            for eliminating a single player on your target team.
          </li>
          <li>
            <span className="rounded bg-gold px-1.5 py-0.5 font-medium text-oxblood">
              100 pts
            </span>{" "}
            for eliminating both players on your target team.
          </li>
          <li className="text-ink/60">
            Only eliminations of players on your <em>current</em> target team
            count — check your dashboard after logging in to see who
            you&apos;re hunting.
          </li>
          <li className="text-ink/60">
            <strong className="text-ink/80">Proof required:</strong> a kill
            doesn&apos;t count until you record video of it and post it in
            the GroupMe.
          </li>
        </ul>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Team immunity</h2>
        </div>
        <ul className="flex flex-col gap-2 px-6 py-4 text-sm text-ink/80">
          <li>
            Eliminate{" "}
            <span className="rounded bg-gold px-1.5 py-0.5 font-medium text-oxblood">
              6 players
            </span>{" "}
            collectively as a team, within a single round, to earn immunity.
          </li>
          <li>
            Immunity applies to <strong>the following round</strong> — you
            can&apos;t be eliminated while it&apos;s in effect.
          </li>
        </ul>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Rounds</h2>
        </div>
        <ul className="flex flex-col gap-2 px-6 py-4 text-sm text-ink/80">
          <li>
            The game runs in fixed <strong>4-day rounds</strong>.
          </li>
          <li>
            Round 1 starts <strong>Sep 18, 12:00 AM ET</strong>.
          </li>
          <li>
            See the live countdown on the{" "}
            <Link href="/" className="text-maroon underline">
              home page
            </Link>{" "}
            for exactly how much time is left in the current round, or until
            the next one begins.
          </li>
          <li>
            <strong className="text-maroon">
              Your team must eliminate your target before the next round
              starts
            </strong>{" "}
            — if you haven&apos;t, your team is eliminated.
          </li>
        </ul>
        <table className="w-full border-t border-tint text-sm">
          <tbody className="divide-y divide-tint">
            {rounds.map((r) => (
              <tr key={r.roundNumber}>
                <td className="px-6 py-2 font-medium text-maroon">
                  Round {r.roundNumber}
                </td>
                <td className="px-6 py-2 text-ink/70">{formatWindow(r.start, r.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Safe zones</h2>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4 text-sm">
          <div className="rounded-lg bg-gold/20 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-oxblood">
              Safe
            </h3>
            <ul className="mt-1 flex flex-col gap-1 text-ink/90">
              <li>The Princeton Charter Club building — anywhere inside it.</li>
              <li>The backyard.</li>
              <li>Your own bedroom.</li>
              <li>
                Classrooms and labs — <strong>only during class time</strong>.
                The moment class ends, you&apos;re fair game again (hallways,
                etc.).
              </li>
              <li>
                Any scheduled competition, intramural game, or concert —{" "}
                <strong>only while it&apos;s happening</strong>. The moment
                it ends, you&apos;re fair game again.
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-tint bg-cream px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink/60">
              Not safe
            </h3>
            <ul className="mt-1 flex flex-col gap-1 text-ink/80">
              <li>The gray sidewalk — including right outside Charter.</li>
              <li>Hallways, and classrooms/labs outside of class time.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
