// Runs once when the server boots. The actual work lives in
// instrumentation-node.ts and is imported ONLY in the Node.js runtime —
// this if-block is eliminated from the Edge build, keeping node: imports
// (fs/os/path via prisma/folders) out of it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
