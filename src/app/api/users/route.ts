import { prisma } from "@/lib/prisma";
import { ok, fail, withAdmin } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

function publicUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt,
  };
}

// List all users (admin).
export const GET = withAdmin(async () => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return ok(users.map(publicUser));
});

// Create a user (admin).
export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "user";

  if (!username || !email || !password) return fail("Username, email and password are required.");

  const clash = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (clash) return fail("Username or email already exists.", 409);

  const user = await prisma.user.create({
    data: { username, email, passwordHash: await hashPassword(password), role },
  });
  return ok(publicUser(user), { status: 201 });
});
