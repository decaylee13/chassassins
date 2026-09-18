"use client";

import { useState, useTransition } from "react";
import { undoElimination } from "@/app/actions/admin";

export function UndoEliminationButton({
  eliminationId,
  label,
}: {
  eliminationId: number;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            if (!confirm(`Undo elimination of ${label}? This reverses the points, the player's status, and any target-chain reassignment it caused.`)) {
              return;
            }
            const result = await undoElimination(eliminationId);
            setMessage(result && "error" in result ? result.error : (result?.ok ?? null));
          })
        }
        disabled={pending}
        className="rounded border border-tint px-2 py-1 text-xs text-ink/60 hover:border-maroon hover:text-maroon disabled:opacity-50"
      >
        {pending ? "…" : "Undo"}
      </button>
      {message ? <p className="max-w-xs text-right text-xs text-ink/60">{message}</p> : null}
    </div>
  );
}
