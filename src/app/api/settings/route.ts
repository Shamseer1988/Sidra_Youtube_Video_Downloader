import { z } from "zod";
import { ok, fail, withAuth, withAdmin } from "@/lib/api";
import { config } from "@/lib/config";
import {
  addExtraDir,
  removeExtraDir,
  extraDirs,
  loadExtraDirs,
} from "@/lib/runtime-settings";

// Runtime info: env-configured folders (read-only) + UI-managed folders.
export const GET = withAuth(async (_req, user) => {
  await loadExtraDirs();
  return ok({
    role: user.role,
    nasName: config.nasName,
    downloadVideoPath: config.downloadVideoPath,
    downloadAudioPath: config.downloadAudioPath,
    mediaVideoPaths: config.mediaVideoPaths,
    mediaAudioPaths: config.mediaAudioPaths,
    extraVideoDirs: extraDirs("video"),
    extraAudioDirs: extraDirs("audio"),
  });
});

const folderAction = z.object({
  action: z.enum(["add", "remove"]),
  kind: z.enum(["video", "audio"]),
  path: z.string().min(1),
});

// Admin: add or remove a UI-managed media folder.
export const POST = withAdmin(async (req) => {
  const body = folderAction.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request");

  const { action, kind, path: dir } = body.data;
  const result =
    action === "add" ? await addExtraDir(kind, dir) : await removeExtraDir(kind, dir);

  if (!result.ok) return fail(result.message || "Folder change failed");
  return ok({ kind, dirs: result.dirs });
});
