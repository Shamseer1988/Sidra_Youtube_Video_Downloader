// Runs once when the Node server boots.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prisma } = await import("./lib/prisma");
    // Downloads that were mid-flight when the server stopped can't resume,
    // so mark them failed instead of leaving them stuck "downloading".
    await prisma.download.updateMany({
      where: { status: { in: ["queued", "downloading"] } },
      data: { status: "failed", error: "Interrupted by server restart" },
    });
  } catch {
    // DB may not be migrated yet on very first boot — ignore.
  }
}
