// Node-only boot tasks (imported by instrumentation.ts in the nodejs runtime).
import { prisma } from "./lib/prisma";
import { ensureDefaultFolders } from "./lib/folders";

async function boot() {
  try {
    // Downloads that were mid-flight when the server stopped can't resume,
    // so mark them failed instead of leaving them stuck "downloading".
    await prisma.download.updateMany({
      where: { status: { in: ["queued", "downloading"] } },
      data: { status: "failed", error: "Interrupted by server restart" },
    });
    // Register env-configured media folders on first boot.
    await ensureDefaultFolders();
  } catch {
    // DB may not be migrated yet on very first boot — ignore.
  }
}

void boot();
