import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { buttonClassName } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { sanitizeRedirect } from "@/lib/utils/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeRedirect(params.next);
  const session = await getSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <StorefrontShell>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_440px]">
        <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Customer sign in
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Continue to your account, cart, and order history
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted">
            Sign in to access wishlist items, your saved checkout details, and past orders.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-text">Saved cart</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Keep current cart items synced to your account.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-text">Order tracking</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Review order, payment, and shipment updates from one place.
              </p>
            </div>
          </div>

          <Link className={`mt-6 ${buttonClassName({ variant: "secondary" })}`} href="/register">
            Create a new account
          </Link>
        </div>

        <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)] sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Use your existing customer account to continue.
            </p>
          </div>
          <LoginForm nextPath={nextPath} />
        </section>
      </section>
    </StorefrontShell>
  );
}
