"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const inputClass =
  "rounded-lg border border-tint bg-cream px-3 py-2 text-base outline-none focus:border-amber focus:ring-2 focus:ring-gold/40";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );
  // "back to net id" is the only client-driven override; the server
  // response otherwise decides which step we're on.
  const [wentBack, setWentBack] = useState(false);

  const stepFromServer = state && "step" in state ? state : null;
  const step = !wentBack && stepFromServer ? stepFromServer.step : "netid";
  const netId = stepFromServer?.netId ?? "";

  const topLevelError = state && "error" in state ? state.error : null;
  const stepError = stepFromServer?.error ?? null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {step === "netid" ? (
        <>
          <input type="hidden" name="stage" value="netid" />
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
              onChange={() => wentBack && setWentBack(false)}
              className={inputClass}
            />
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name="stage" value="password" />
          <input type="hidden" name="netId" value={netId} />
          <p className="text-sm text-ink/70">
            <strong>{netId}</strong>
            {step === "create-password"
              ? " — no password on file yet. Set one now."
              : " — enter your password."}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              name="password"
              autoComplete={step === "create-password" ? "new-password" : "current-password"}
              required
              minLength={step === "create-password" ? 8 : undefined}
              autoFocus
              className={inputClass}
            />
          </label>
          {step === "create-password" ? (
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
          ) : null}
        </>
      )}

      {topLevelError ? <p className="text-sm text-maroon">{topLevelError}</p> : null}
      {stepError ? <p className="text-sm text-maroon">{stepError}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-maroon px-3 py-2 text-sm font-medium text-cream hover:bg-oxblood disabled:opacity-50"
      >
        {pending
          ? "…"
          : step === "create-password"
            ? "Set password & sign in"
            : step === "enter-password"
              ? "Sign in"
              : "Continue"}
      </button>

      {step !== "netid" ? (
        <button
          type="button"
          onClick={() => setWentBack(true)}
          className="text-xs text-ink/50 underline"
        >
          ← use a different net ID
        </button>
      ) : (
        <p className="text-center text-xs text-ink/50">
          No team yet?{" "}
          <a href="/join" className="text-maroon underline">
            Create one
          </a>
        </p>
      )}
    </form>
  );
}
