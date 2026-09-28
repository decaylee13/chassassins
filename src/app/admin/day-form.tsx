"use client";

import { useActionState, useRef, useEffect } from "react";
import { createDay, type AdminState } from "@/app/actions/admin";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

export function DayForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createDay,
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
        <span className="font-medium">Challenge title</span>
        <input name="challengeTitle" required maxLength={80} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Challenge description</span>
        <textarea name="challengeDescription" required rows={3} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Safety notice</span>
        <textarea
          name="safetyText"
          required
          rows={2}
          placeholder="e.g. Safety in the dining hall and library, no eliminations indoors."
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Safety start (ET, optional)</span>
          <input type="datetime-local" name="safetyStart" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Safety end (ET, optional)</span>
          <input type="datetime-local" name="safetyEnd" className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Safety image (optional)</span>
        <input
          type="file"
          name="safetyImage"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={inputClass}
        />
      </label>

      {error ? <p className="text-sm text-maroon">{error}</p> : null}
      {ok ? <p className="text-sm text-amber">{ok}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
      >
        {pending ? "…" : "Post new day"}
      </button>
    </form>
  );
}
