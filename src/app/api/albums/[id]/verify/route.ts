import { z } from "zod";
import { ok, fail, withAuth } from "@/lib/api";
import { isUnlocked } from "@/lib/albums";

// Verify a password-protected album's password (soft unlock).
export const POST = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params;
  const parsed = z.object({ password: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const unlocked = await isUnlocked(id, parsed.data.password);
  if (!unlocked) return fail("Incorrect password", 401);
  return ok({ unlocked: true });
});
