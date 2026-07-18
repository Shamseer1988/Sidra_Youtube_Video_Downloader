import { ok, fail, withAuth, withAdmin } from "@/lib/api";
import { listFolders, addFolder } from "@/lib/folders";

// List registered media folders (any signed-in user can view).
export const GET = withAuth(async () => {
  return ok(await listFolders());
});

// Register a new media folder (admin only).
export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => ({}));
  const p = String(body.path || "").trim();
  const kind = body.kind === "audio" ? "audio" : "video";
  const role = body.role === "download" ? "download" : "library";
  if (!p) return fail("Folder path is required.");
  try {
    const folder = await addFolder(p, kind, role);
    return ok(folder, { status: 201 });
  } catch (e: any) {
    return fail(e?.message || "Could not add folder.");
  }
});
