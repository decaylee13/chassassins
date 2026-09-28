"use client";

import { useActionState, useState, useTransition } from "react";
import { saveDraftSafety, applyDraftSafety, discardDraftSafety, type AdminState } from "@/app/actions/admin";
import type { Day } from "@/db/schema";
import { toEasternInputValue, formatWindow } from "@/lib/time";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

/**
 * Lets the admin write tomorrow's safety notice in advance while this day
 * is still live — saved as a draft, invisible to everyone until "Apply
 * now" is clicked. No new day, no targets involved.
 */
export function DraftSafetySection({ day }: { day: Day }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const saveThisDraft = saveDraftSafety.bind(null, day.dayId);
  const [state, formAction, formPending] = useActionState<AdminState, FormData>(
    saveThisDraft,
    undefined,
  );
  const error = state && "error" in state ? state.error : null;
  const ok = state && "ok" in state ? state.ok : null;

  const hasDraft = !!day.draftSafetyText;

  if (!hasDraft && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="self-start rounded border border-tint px-2 py-1 text-xs text-ink/60 hover:border-amber hover:text-maroon"
      >
        Draft next safety
      </button>
    );
  }

  if (hasDraft && !editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber bg-gold/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-oxblood">
          Draft safety (not live yet)
        </p>
        <p className="text-sm text-ink/90">{day.draftSafetyText}</p>
        {day.draftSafetyStart && day.draftSafetyEnd ? (
          <p className="text-xs font-medium text-oxblood">
            {formatWindow(day.draftSafetyStart, day.draftSafetyEnd)}
          </p>
        ) : null}
        {day.draftSafetyImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI, not a static/remote asset Next/Image can optimize
          <img src={day.draftSafetyImageUrl} alt="Draft safety" className="h-20 w-20 rounded-lg object-cover" />
        ) : null}
        {actionMessage ? <p className="text-xs text-ink/60">{actionMessage}</p> : null}
        <div className="flex gap-3">
          <button
            onClick={() =>
              startTransition(async () => {
                if (!confirm("Apply this draft? It replaces the live safety notice immediately.")) return;
                const result = await applyDraftSafety(day.dayId);
                setActionMessage(result && "error" in result ? result.error : (result?.ok ?? null));
              })
            }
            disabled={pending}
            className="rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-oxblood hover:bg-amber disabled:opacity-50"
          >
            {pending ? "…" : "Apply now"}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-tint bg-white px-3 py-1.5 text-sm hover:border-amber"
          >
            Edit draft
          </button>
          <button
            onClick={() =>
              startTransition(async () => {
                if (!confirm("Discard this draft?")) return;
                const result = await discardDraftSafety(day.dayId);
                setActionMessage(result && "error" in result ? result.error : (result?.ok ?? null));
              })
            }
            disabled={pending}
            className="rounded-lg border border-tint bg-white px-3 py-1.5 text-sm text-ink/60 hover:border-maroon hover:text-maroon disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-tint bg-cream p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Draft safety notice</span>
        <textarea
          name="draftSafetyText"
          required
          rows={2}
          defaultValue={day.draftSafetyText ?? ""}
          placeholder="e.g. Safety in the dining hall and library, no eliminations indoors."
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Start (ET, optional)</span>
          <input
            type="datetime-local"
            name="draftSafetyStart"
            defaultValue={day.draftSafetyStart ? toEasternInputValue(day.draftSafetyStart) : ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">End (ET, optional)</span>
          <input
            type="datetime-local"
            name="draftSafetyEnd"
            defaultValue={day.draftSafetyEnd ? toEasternInputValue(day.draftSafetyEnd) : ""}
            className={inputClass}
          />
        </label>
      </div>

      {day.draftSafetyImageUrl ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI, not a static/remote asset Next/Image can optimize */}
          <img src={day.draftSafetyImageUrl} alt="Current draft" className="h-20 w-20 rounded-lg object-cover" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeDraftSafetyImage" className="h-4 w-4" />
            Remove this image
          </label>
        </div>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {day.draftSafetyImageUrl ? "Replace draft image" : "Draft image (optional)"}
        </span>
        <input
          type="file"
          name="draftSafetyImage"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={inputClass}
        />
      </label>

      {error ? <p className="text-sm text-maroon">{error}</p> : null}
      {ok ? <p className="text-sm text-amber">{ok}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={formPending}
          className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
        >
          {formPending ? "…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-tint px-3 py-2 text-sm hover:border-amber"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
