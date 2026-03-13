import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Access denied
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          This route is outside your permission scope.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          The dashboard shell is role-aware. Sign in with a role that carries the
          required permission or return to an allowed section.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
            href="/dashboard"
          >
            Go to dashboard
          </Link>
          <Link
            className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white"
            href="/login"
          >
            Sign in again
          </Link>
        </div>
      </div>
    </main>
  );
}
