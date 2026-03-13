import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getDashboardNavigation } from "@/lib/auth/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();
  const navigation = getDashboardNavigation(user.role);
  const workspace = await dashboardService.getShellData(user);

  return (
    <DashboardShell
      navigation={navigation}
      user={{
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      workspace={workspace}
    >
      {children}
    </DashboardShell>
  );
}
