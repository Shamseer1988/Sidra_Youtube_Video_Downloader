import "server-only";
import { prisma } from "./prisma";

/** Global key/value app settings (admin managed) with sensible defaults. */

export type HwAccel = "off" | "auto" | "nvenc" | "vaapi" | "qsv";

export interface AppSettings {
  /** Hardware acceleration used for on-the-fly transcoding. */
  hwAccel: HwAccel;
}

const DEFAULTS: AppSettings = {
  hwAccel: (process.env.FFMPEG_HWACCEL as HwAccel) || "off",
};

const KEY = "playback";

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    if (!row) return DEFAULTS;
    const parsed = JSON.parse(row.value) as Partial<AppSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export async function setAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = { ...current, ...patch };
  await prisma.setting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(next) },
    create: { key: KEY, value: JSON.stringify(next) },
  });
  return next;
}
