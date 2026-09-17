"use client";

import { useActionState } from "react";
import { join, type JoinState } from "@/app/actions/auth";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

export function JoinForm() {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    join,
    undefined,
  );
  const error = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Your net ID</span>
        <input
          name="yourNetId"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ab1234"
          required
          autoFocus
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Partner&apos;s net ID</span>
        <input
          name="partnerNetId"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="cd5678"
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Team name</span>
        <input
          name="teamName"
          required
          maxLength={40}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Confirm password</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </label>

      <p className="text-xs text-ink/50">
        This sets <strong>your</strong> password. Your partner sets theirs
        the first time they log in.
      </p>

      {error ? <p className="text-sm text-maroon">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
      >
        {pending ? "…" : "Create team"}
      </button>

      <p className="text-center text-xs text-ink/50">
        Already on a team?{" "}
        <a href="/login" className="text-maroon underline">
          Log in
        </a>
      </p>
    </form>
  );
}
