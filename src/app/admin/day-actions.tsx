"use client";

import { useState, useTransition } from "react";
import { generateTargets, publishDay } from "@/app/actions/admin";

export function GenerateButton({ dayId, label }: { dayId: number; label: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await generateTargets(dayId);
            setMessage(result && "error" in result ? result.error : (result?.ok ?? null));
          })
        }
        disabled={pending}
        className="rounded-lg border border-tint bg-white px-3 py-1.5 text-sm hover:border-amber disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {message ? <p className="text-xs text-ink/60">{message}</p> : null}
    </div>
  );
}

export function PublishButton({ dayId }: { dayId: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            if (!confirm("Publish these targets? Teams will be able to see them immediately.")) return;
            const result = await publishDay(dayId);
            setMessage(result && "error" in result ? result.error : (result?.ok ?? null));
          })
        }
        disabled={pending}
        className="rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-oxblood hover:bg-amber disabled:opacity-50"
      >
        {pending ? "…" : "Publish"}
      </button>
      {message ? <p className="text-xs text-ink/60">{message}</p> : null}
    </div>
  );
}
