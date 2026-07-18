import { ok, withAuth } from "@/lib/api";
import { config } from "@/lib/config";

// Expose read-only runtime info (configured media folders, binary paths).
// Folders are configured via environment/Docker volumes, not the UI, so the
// single app stays simple and secure.
export const GET = withAuth(async (_req, user) => {
  return ok({
    role: user.role,
    downloadVideoPath: config.downloadVideoPath,
    downloadAudioPath: config.downloadAudioPath,
    mediaVideoPaths: config.mediaVideoPaths,
    mediaAudioPaths: config.mediaAudioPaths,
  });
});
