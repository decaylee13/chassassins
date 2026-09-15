import type { Metadata } from "next";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Create a team" };

export default function JoinPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-3xl ring-2 ring-gold/70">
          🗡️
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-maroon">Create a team</h1>
          <p className="mt-1 text-sm text-ink/60">
            Both net IDs must be on the club roster. If either one already
            has a team, you&apos;ll be sent to log in instead.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-tint bg-white p-6 shadow-sm">
        <JoinForm />
      </div>
    </main>
  );
}
