import { getCurrentUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  return ok({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarColor: user.avatarColor,
    canDownload: user.role === "admin" || user.canDownload,
    canDelete: user.role === "admin" || user.canDelete,
  });
}
