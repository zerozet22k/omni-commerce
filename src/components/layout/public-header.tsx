import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { authService } from "@/modules/users/auth.service";

export async function PublicHeader() {
  const session = await getSession();
  const user = session ? await authService.getSessionUser(session.id) : null;

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <Link
        className="flex items-center gap-3 text-sm font-semibold tracking-[0.25em] text-slate-950 uppercase"
        href="/"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs text-white">
          OC
        </span>
        Omni Commerce
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 sm:inline-flex"
          href="/shop"
        >
          Shop
        </Link>
        {user ? (
          <Link
            className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 sm:inline-flex"
            href="/cart"
          >
            Cart
          </Link>
        ) : null}
        {user ? (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-950">
                {user.fullName}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {user.role}
              </p>
            </div>
            <Link
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              href="/register"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
