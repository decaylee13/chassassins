"use client";

import { useState, useTransition } from "react";
import { deleteTeam } from "@/app/actions/admin";

export function DeleteTeamButton({ teamId, teamName }: { teamId: number; teamName: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            if (
              !confirm(
                `Delete "${teamName}"? This removes its players and its whole elimination history. This can't be undone.`,
              )
            ) {
              return;
            }
            const result = await deleteTeam(teamId);
            setMessage(result && "error" in result ? result.error : (result?.ok ?? null));
          })
        }
        disabled={pending}
        className="rounded border border-maroon/30 px-2 py-1 text-xs text-maroon hover:bg-maroon hover:text-cream disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
      {message ? <p className="text-xs text-ink/60">{message}</p> : null}
    </div>
  );
}
