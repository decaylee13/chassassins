"use client";

import { useActionState, useRef, useEffect } from "react";
import { recordElimination, type AdminState } from "@/app/actions/admin";
import type { Player, Team } from "@/db/schema";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

export function EliminateForm({
  players,
  teams,
}: {
  players: (Player & { team: Team })[];
  teams: Team[];
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    recordElimination,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const error = state && "error" in state ? state.error : null;
  const ok = state && "ok" in state ? state.ok : null;

  useEffect(() => {
    if (ok) formRef.current?.reset();
  }, [ok]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Player eliminated</span>
        <select name="playerNetId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose a player
          </option>
          {players.map((p) => (
            <option key={p.netId} value={p.netId}>
              {p.firstName} {p.lastName} ({p.team.name})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Credit to team</span>
        <select name="creditedTeamId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose a team
          </option>
          {teams.map((t) => (
            <option key={t.teamId} value={t.teamId}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-maroon">{error}</p> : null}
      {ok ? <p className="text-sm text-amber">{ok}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
      >
        {pending ? "…" : "Record elimination"}
      </button>
    </form>
  );
}
