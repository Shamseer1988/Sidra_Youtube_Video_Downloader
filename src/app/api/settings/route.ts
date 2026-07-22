import { z } from "zod";
import { ok, fail, withAuth, withAdmin } from "@/lib/api";
import { config } from "@/lib/config";
import { CATEGORIES, browseRoots } from "@/lib/libraries";
import { getAppSettings, setAppSettings, type HwAccel } from "@/lib/app-settings";
import { getMetadataSettings, setMetadataSettings } from "@/lib/metadata";

// Mask an API key so the settings page can show "configured" without
// re-exposing the full secret on every load.
function maskKey(key: string): string {
  if (!key) return "";
  return key.length <= 4 ? "••••" : `${"•".repeat(Math.max(4, key.length - 4))}${key.slice(-4)}`;
}

// Runtime info: download paths, browse roots, categories, playback settings.
export const GET = withAuth(async (_req, user) => {
  const settings = await getAppSettings();
  const meta = user.role === "admin" ? await getMetadataSettings() : { tmdbKey: "", omdbKey: "" };
  return ok({
    role: user.role,
    nasName: config.nasName,
    downloadVideoPath: config.downloadVideoPath,
    downloadAudioPath: config.downloadAudioPath,
    browseRoots: browseRoots(),
    categories: CATEGORIES,
    playback: settings,
    metadata: {
      tmdbConfigured: !!meta.tmdbKey,
      omdbConfigured: !!meta.omdbKey,
      tmdbKeyMasked: maskKey(meta.tmdbKey),
      omdbKeyMasked: maskKey(meta.omdbKey),
    },
  });
});

const patchSchema = z.object({
  hwAccel: z.enum(["off", "auto", "nvenc", "vaapi", "qsv"]).optional(),
  // A TMDB v4 "Read Access Token" is a ~220-char JWT, so allow long keys.
  tmdbKey: z.string().max(2000).optional(),
  omdbKey: z.string().max(2000).optional(),
});

// Admin: update playback settings (hardware acceleration) and metadata keys.
export const POST = withAdmin(async (req) => {
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request");

  const { hwAccel, tmdbKey, omdbKey } = body.data;
  const next = hwAccel !== undefined ? await setAppSettings({ hwAccel: hwAccel as HwAccel }) : await getAppSettings();
  if (tmdbKey !== undefined || omdbKey !== undefined) {
    await setMetadataSettings({
      ...(tmdbKey !== undefined ? { tmdbKey } : {}),
      ...(omdbKey !== undefined ? { omdbKey } : {}),
    });
  }
  return ok({ playback: next });
});
