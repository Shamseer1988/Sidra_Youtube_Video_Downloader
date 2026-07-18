import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/components/providers/user-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { CurrentUser } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const currentUser: CurrentUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as "admin" | "user",
    avatarColor: user.avatarColor,
    canDownload: isAdmin || user.canDownload,
    canDelete: isAdmin || user.canDelete,
  };

  return (
    <QueryProvider>
      <UserProvider user={currentUser}>
        <ToastProvider>
          <div className="flex min-h-screen bg-navy-900">
            <Sidebar isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col min-w-0">
              <Header user={currentUser} />
              {/* pb-24 leaves room for the mobile bottom nav */}
              <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-auto pb-24 md:pb-6">
                {children}
              </main>
            </div>
            <BottomNav isAdmin={isAdmin} />
          </div>
        </ToastProvider>
      </UserProvider>
    </QueryProvider>
  );
}
