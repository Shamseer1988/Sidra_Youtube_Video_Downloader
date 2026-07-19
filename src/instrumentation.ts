// Runs once when the server boots.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { onStartup } = await import("./instrumentation-node");
    await onStartup();
  }
}
