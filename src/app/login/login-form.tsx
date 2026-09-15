"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );
  const error = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Net ID</span>
        <input
          name="netId"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ab1234"
          required
          autoFocus
          className={inputClass}
        />
      </label>

      {error ? <p className="text-sm text-maroon">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
      >
        {pending ? "…" : "Continue"}
      </button>

      <p className="text-center text-xs text-ink/50">
        No team yet?{" "}
        <a href="/join" className="text-maroon underline">
          Create one
        </a>
      </p>
    </form>
  );
}
