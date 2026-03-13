import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { buttonClassName } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { sanitizeRedirect } from "@/lib/utils/navigation";

type RegisterPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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
            Create account
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Register once and keep shopping details in one account
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted">
            Your customer profile keeps carts, wishlist items, saved addresses, and order history together.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-text">Saved addresses</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Reuse delivery details across future checkouts.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-text">Wishlist and orders</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Keep products and order records available from the same account.
              </p>
            </div>
          </div>

          <Link
            className={`mt-6 ${buttonClassName({ variant: "secondary" })}`}
            href={`/login?next=${encodeURIComponent(nextPath)}`}
          >
            Already have an account?
          </Link>
        </div>

        <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)] sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text">Register</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Create a customer account to save products and complete checkout.
            </p>
          </div>
          <RegisterForm nextPath={nextPath} />
        </section>
      </section>
    </StorefrontShell>
  );
}
