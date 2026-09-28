"use client";

import { useActionState, useState } from "react";
import { updateDay, type AdminState } from "@/app/actions/admin";
import type { Day } from "@/db/schema";
import { toEasternInputValue } from "@/lib/time";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

/**
 * "Edit" button that reveals a prefilled form for this day's text, in
 * place — works whether the day is still a draft or already published
 * (live). Only touches the challenge/safety text, never `published` or
 * the target ring.
 */
export function EditDaySection({ day }: { day: Day }) {
  const [editing, setEditing] = useState(false);
  const updateThisDay = updateDay.bind(null, day.dayId);
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    updateThisDay,
    undefined,
  );
  const error = state && "error" in state ? state.error : null;
  const ok = state && "ok" in state ? state.ok : null;

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="self-start rounded border border-tint px-2 py-1 text-xs text-ink/60 hover:border-amber hover:text-maroon"
      >
        Edit challenge / safety text
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-tint bg-cream p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Challenge title</span>
        <input
          name="challengeTitle"
          required
          maxLength={80}
          defaultValue={day.challengeTitle}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Challenge description</span>
        <textarea
          name="challengeDescription"
          required
          rows={3}
          defaultValue={day.challengeDescription}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Safety notice</span>
        <textarea
          name="safetyText"
          required
          rows={2}
          defaultValue={day.safetyText}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Safety start (ET, optional)</span>
          <input
            type="datetime-local"
            name="safetyStart"
            defaultValue={day.safetyStart ? toEasternInputValue(day.safetyStart) : ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Safety end (ET, optional)</span>
          <input
            type="datetime-local"
            name="safetyEnd"
            defaultValue={day.safetyEnd ? toEasternInputValue(day.safetyEnd) : ""}
            className={inputClass}
          />
        </label>
      </div>

      {day.safetyImageUrl ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI, not a static/remote asset Next/Image can optimize */}
          <img src={day.safetyImageUrl} alt="Current safety" className="h-20 w-20 rounded-lg object-cover" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeSafetyImage" className="h-4 w-4" />
            Remove this image
          </label>
        </div>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {day.safetyImageUrl ? "Replace safety image" : "Safety image (optional)"}
        </span>
        <input
          type="file"
          name="safetyImage"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={inputClass}
        />
      </label>

      {error ? <p className="text-sm text-maroon">{error}</p> : null}
      {ok ? <p className="text-sm text-amber">{ok}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
        >
          {pending ? "…" : "Save changes"}
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
