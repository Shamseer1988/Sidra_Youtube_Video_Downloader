import "server-only";
import { config } from "./config";
import type { HwAccel } from "./app-settings";

/**
 * Build ffmpeg arguments for on-the-fly transcoding to a browser-friendly
 * fragmented MP4 (H.264 + AAC), optionally using GPU acceleration.
 */
export function buildTranscodeArgs(opts: {
  input: string;
  height: number;
  startSec: number;
  hwAccel: HwAccel;
}): string[] {
  const { input, height, startSec, hwAccel } = opts;
  const args: string[] = ["-hide_banner", "-loglevel", "error"];

  // Fast input seek (before -i) for near-instant quality/seek switches.
  if (startSec > 0) args.push("-ss", String(startSec));

  // Decode acceleration (best-effort; ffmpeg falls back to software).
  if (hwAccel === "nvenc") args.push("-hwaccel", "cuda");
  else if (hwAccel === "qsv") args.push("-hwaccel", "qsv");
  else if (hwAccel === "vaapi") args.push("-hwaccel", "vaapi", "-vaapi_device", "/dev/dri/renderD128");

  args.push("-i", input);

  // Scale + encode.
  const evenHeight = `-2:${height}`;
  if (hwAccel === "vaapi") {
    args.push(
      "-vf",
      `format=nv12,hwupload,scale_vaapi=${evenHeight}`,
      "-c:v",
      "h264_vaapi",
      "-b:v",
      bitrateFor(height)
    );
  } else if (hwAccel === "nvenc") {
    args.push("-vf", `scale=${evenHeight}`, "-c:v", "h264_nvenc", "-preset", "p4", "-b:v", bitrateFor(height));
  } else if (hwAccel === "qsv") {
    args.push("-vf", `scale=${evenHeight}`, "-c:v", "h264_qsv", "-b:v", bitrateFor(height));
  } else {
    // Software (off / auto) — most compatible.
    args.push("-vf", `scale=${evenHeight}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23");
  }

  args.push(
    "-c:a", "aac",
    "-b:a", "160k",
    "-ac", "2",
    // Streamable fragmented MP4 (playable while still being produced).
    "-movflags", "+frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1"
  );

  return args;
}

function bitrateFor(height: number): string {
  if (height >= 1080) return "6000k";
  if (height >= 720) return "3000k";
  if (height >= 480) return "1500k";
  return "800k";
}

export function ffmpegBin(): string {
  return config.ffmpegPath;
}
