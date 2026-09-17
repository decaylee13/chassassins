import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
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
        </ul>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Team immunity</h2>
        </div>
        <p className="px-6 py-4 text-sm text-ink/80">
          If your team eliminates{" "}
          <span className="rounded bg-gold px-1.5 py-0.5 font-medium text-oxblood">
            5 players
          </span>{" "}
          collectively within a single round, you gain{" "}
          <strong>immunity for the following round</strong> — you can&apos;t
          be eliminated while it&apos;s in effect.
        </p>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-tint bg-white shadow-sm">
        <div className="bg-maroon px-6 py-3 text-cream">
          <h2 className="text-lg font-semibold">Rounds</h2>
        </div>
        <div className="px-6 py-4 text-sm text-ink/80">
          <p>
            The game runs in fixed{" "}
            <strong>3-day rounds</strong>. Round 1 starts{" "}
            <strong>Sep 18, 12:00 AM ET</strong> — see the live countdown on
            the{" "}
            <Link href="/" className="text-maroon underline">
              home page
            </Link>{" "}
            for exactly how much time is left in the current round, or until
            the next one begins.
          </p>
        </div>
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
              <li>Sidewalks — including right outside Charter.</li>
              <li>Classrooms — fair game everywhere, no exceptions.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
