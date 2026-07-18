import { prisma } from "@/lib/prisma";
import { ok, fail, withAdmin } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

// Update a user (admin).
export const PATCH = withAdmin(async (req, admin, ctx) => {
  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return fail("User not found.", 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.role === "admin" || body.role === "user") data.role = body.role;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.canDownload === "boolean") data.canDownload = body.canDownload;
  if (typeof body.canDelete === "boolean") data.canDelete = body.canDelete;
  if (body.email) data.email = String(body.email).trim().toLowerCase();
  if (body.password) data.passwordHash = await hashPassword(String(body.password));
  if (body.avatarColor) data.avatarColor = String(body.avatarColor);

  // Don't let an admin lock themselves out.
  if (id === admin.id && (data.role === "user" || data.isActive === false)) {
    return fail("You cannot demote or deactivate your own account.");
  }

  const updated = await prisma.user.update({ where: { id }, data });
  return ok({
    id: updated.id,
    username: updated.username,
    email: updated.email,
    role: updated.role,
    isActive: updated.isActive,
    avatarColor: updated.avatarColor,
  });
});

// Delete a user (admin).
export const DELETE = withAdmin(async (_req, admin, ctx) => {
  const { id } = await ctx.params;
  if (id === admin.id) return fail("You cannot delete your own account.");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return fail("User not found.", 404);
  await prisma.user.delete({ where: { id } });
  return ok(null);
});
