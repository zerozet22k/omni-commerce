import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { authService } from "@/modules/users/auth.service";

export async function requireStorefrontCustomer(nextPath: string) {
  const session = await getSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const user = await authService.getSessionUser(session.id);

  if (!user || !user.isActive) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (user.role !== "CUSTOMER") {
    redirect("/dashboard");
  }

  return user;
}
