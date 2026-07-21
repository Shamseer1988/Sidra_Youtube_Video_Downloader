import { z } from "zod";
import { ok, fail, withAuth, withAdmin } from "@/lib/api";
import { config } from "@/lib/config";
import { CATEGORIES, browseRoots } from "@/lib/libraries";
import { getAppSettings, setAppSettings, type HwAccel } from "@/lib/app-settings";

// Runtime info: download paths, browse roots, categories, playback settings.
export const GET = withAuth(async (_req, user) => {
  const settings = await getAppSettings();
  return ok({
    role: user.role,
    nasName: config.nasName,
    downloadVideoPath: config.downloadVideoPath,
    downloadAudioPath: config.downloadAudioPath,
    browseRoots: browseRoots(),
    categories: CATEGORIES,
    playback: settings,
  });
});

const patchSchema = z.object({
  hwAccel: z.enum(["off", "auto", "nvenc", "vaapi", "qsv"]).optional(),
});

// Admin: update playback settings (e.g. hardware acceleration).
export const POST = withAdmin(async (req) => {
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request");
  const next = await setAppSettings(body.data as { hwAccel?: HwAccel });
  return ok({ playback: next });
});
