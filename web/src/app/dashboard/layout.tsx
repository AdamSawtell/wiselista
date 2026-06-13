import { getCurrentUser } from "@/lib/auth";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AppFooter } from "@/components/AppFooter";

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardHeader userEmail={user?.email} />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}
