import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/components/providers/user-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
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
          <div className="flex min-h-screen bg-navy-900">
            <Sidebar isAdmin={currentUser.role === "admin"} />
            <div className="flex-1 flex flex-col min-w-0">
              <Header user={currentUser} />
              <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </UserProvider>
    </QueryProvider>
  );
}
