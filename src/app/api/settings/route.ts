import { ok, withAuth } from "@/lib/api";
import { listFolders } from "@/lib/folders";

// Runtime info for the Settings page: registered media folders and the
// caller's role. Folders are managed via /api/folders (admin).
export const GET = withAuth(async (_req, user) => {
  return ok({
    role: user.role,
    folders: await listFolders(),
  });
});
