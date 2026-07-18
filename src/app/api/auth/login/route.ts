import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) return fail("Username and password are required.");

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username.toLowerCase() }] },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("Invalid credentials.", 401);
  }
  if (!user.isActive) return fail("Account is deactivated.", 403);

  await setSession({ userId: user.id, username: user.username, role: user.role });

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
