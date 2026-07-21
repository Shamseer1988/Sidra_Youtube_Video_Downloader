// Node-runtime startup tasks. Imported from instrumentation.ts inside a
// `NEXT_RUNTIME === "nodejs"` block so the edge build never bundles this
// file (it touches node:fs via runtime-settings).

export async function onStartup() {
  try {
    const { prisma } = await import("./lib/prisma");
    // Downloads that were mid-flight when the server stopped can't resume,
    // so mark them failed instead of leaving them stuck "downloading".
    await prisma.download.updateMany({
      where: { status: { in: ["queued", "downloading"] } },
      data: { status: "failed", error: "Interrupted by server restart" },
    });
    // Warm the registered-library path cache used by path-safety checks.
    const { loadLibraries } = await import("./lib/libraries");
    await loadLibraries();
  } catch {
    // DB may not be migrated yet on very first boot — ignore.
  }
}
