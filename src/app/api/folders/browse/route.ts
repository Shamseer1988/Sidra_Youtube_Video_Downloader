import fsp from "node:fs/promises";
import path from "node:path";
import { ok, fail, withAdmin } from "@/lib/api";

// Browse server directories so admins can pick media folders from the UI.
// Directories only — files are never listed. Admin-gated because it can
// see the whole container filesystem (mount your NAS shares as volumes).
export const GET = withAdmin(async (req) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("path") || "/";
  const target = path.resolve(raw);

  let entries;
  try {
    entries = await fsp.readdir(target, { withFileTypes: true });
  } catch {
    return fail("Cannot read this directory.", 400);
  }

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ name: e.name, path: path.join(target, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return ok({
    current: target,
    parent: target === path.parse(target).root ? null : path.dirname(target),
    dirs,
  });
});
