"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { buttonClassName } from "@/components/ui/button";
import { sanitizeRedirect } from "@/lib/utils/navigation";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        if (!response.ok) {
          setErrorMessage(payload?.message ?? "Unable to sign in.");
          return;
        }

        window.location.assign(sanitizeRedirect(nextPath));
      } catch {
        setErrorMessage("Unable to sign in.");
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      {errorMessage ? (
        <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <button
        className={buttonClassName({ block: true, size: "lg", variant: "primary" })}
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm text-text-muted">
        Need an account?{" "}
        <Link
          className="font-semibold text-text"
          href={`/register?next=${encodeURIComponent(nextPath)}`}
        >
          Register
        </Link>
      </p>
    </form>
  );
}
