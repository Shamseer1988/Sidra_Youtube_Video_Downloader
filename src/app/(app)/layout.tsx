import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/components/providers/user-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandMenu } from "@/components/layout/command-menu";
import type { CurrentUser } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentUser: CurrentUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as "admin" | "user",
    avatarColor: user.avatarColor,
  };

  return (
    <QueryProvider>
      <UserProvider user={currentUser}>
        <ToastProvider>
          <TooltipProvider delayDuration={200}>
            <div className="flex min-h-screen bg-background">
              <Sidebar isAdmin={currentUser.role === "admin"} />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar user={currentUser} />
                <main className="flex-1 overflow-auto p-3 sm:p-5">{children}</main>
              </div>
            </div>
            <CommandMenu />
          </TooltipProvider>
        </ToastProvider>
      </UserProvider>
    </QueryProvider>
  );
}
