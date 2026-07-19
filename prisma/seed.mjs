// Seeds the first admin user from env vars (idempotent).
// Run automatically on container start; safe to run repeatedly.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@sidra.local";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.user.findFirst({ where: { role: "admin" } });
  if (existing) {
    // Keep the admin password in sync with ADMIN_PASSWORD so changing it in
    // the compose file works on redeploy (there is no in-app password UI).
    const matches = await bcrypt.compare(password, existing.passwordHash);
    if (!matches) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash },
      });
      console.log(`[seed] admin "${existing.username}" password updated from ADMIN_PASSWORD`);
    } else {
      console.log(`[seed] admin already exists (${existing.username}) — up to date`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, role: "admin" },
  });
  console.log(`[seed] created admin user "${user.username}" (password from ADMIN_PASSWORD)`);
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
