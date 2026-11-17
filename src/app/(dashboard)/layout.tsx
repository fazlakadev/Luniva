import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin-login");
  return (
    <ToastProvider>
      <AppShell name={session.name}>{children}</AppShell>
    </ToastProvider>
  );
}
