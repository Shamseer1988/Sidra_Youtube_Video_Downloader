import fsp from "node:fs/promises";
import os from "node:os";
import { ok, withAuth } from "@/lib/api";

/**
 * Host system health, read from /proc and /sys. Inside a Docker container
 * on Synology these expose the NAS's kernel counters (CPU, memory, network,
 * thermal), so the dashboard reflects the NAS itself — no DSM API needed.
 * Every field is null when unavailable; the UI degrades gracefully.
 */

interface CpuSample {
  idle: number;
  total: number;
}

interface NetSample {
  rx: number;
  tx: number;
  at: number;
}

// Rate metrics need two samples; keep the previous one between requests.
let lastCpu: CpuSample | null = null;
let lastNet: NetSample | null = null;

async function readCpuSample(): Promise<CpuSample | null> {
  try {
    const stat = await fsp.readFile("/proc/stat", "utf8");
    const line = stat.split("\n").find((l) => l.startsWith("cpu "));
    if (!line) return null;
    const nums = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = nums[3] + (nums[4] || 0); // idle + iowait
    const total = nums.reduce((a, b) => a + b, 0);
    return { idle, total };
  } catch {
    return null;
  }
}

async function readMemory(): Promise<{ totalBytes: number; usedBytes: number; usedPercent: number } | null> {
  try {
    const info = await fsp.readFile("/proc/meminfo", "utf8");
    const get = (key: string) => {
      const m = info.match(new RegExp(`^${key}:\\s+(\\d+) kB`, "m"));
      return m ? parseInt(m[1], 10) * 1024 : null;
    };
    const total = get("MemTotal");
    const available = get("MemAvailable");
    if (!total || available === null) return null;
    const used = total - available;
    return { totalBytes: total, usedBytes: used, usedPercent: Math.round((used / total) * 100) };
  } catch {
    return null;
  }
}

async function readNetSample(): Promise<NetSample | null> {
  try {
    const dev = await fsp.readFile("/proc/net/dev", "utf8");
    let rx = 0;
    let tx = 0;
    for (const line of dev.split("\n").slice(2)) {
      const [name, rest] = line.split(":");
      if (!rest || name.trim() === "lo") continue;
      const cols = rest.trim().split(/\s+/).map(Number);
      rx += cols[0] || 0;
      tx += cols[8] || 0;
    }
    return { rx, tx, at: Date.now() };
  } catch {
    return null;
  }
}

/** Highest plausible temperature across thermal zones / hwmon sensors. */
async function readTemperature(): Promise<number | null> {
  const sources: string[] = [];
  for (const base of ["/sys/class/thermal", "/sys/class/hwmon"]) {
    try {
      const entries = await fsp.readdir(base);
      for (const e of entries) {
        if (base.endsWith("thermal") && e.startsWith("thermal_zone")) {
          sources.push(`${base}/${e}/temp`);
        } else if (base.endsWith("hwmon")) {
          try {
            const files = await fsp.readdir(`${base}/${e}`);
            for (const f of files) if (/^temp\d+_input$/.test(f)) sources.push(`${base}/${e}/${f}`);
          } catch { /* skip sensor */ }
        }
      }
    } catch { /* sysfs not exposed */ }
  }

  let max: number | null = null;
  for (const file of sources) {
    try {
      const raw = parseInt((await fsp.readFile(file, "utf8")).trim(), 10);
      const c = raw > 1000 ? raw / 1000 : raw;
      if (Number.isFinite(c) && c > 5 && c < 120) max = Math.max(max ?? 0, c);
    } catch { /* unreadable sensor */ }
  }
  return max;
}

async function readUptime(): Promise<number | null> {
  try {
    const raw = await fsp.readFile("/proc/uptime", "utf8");
    return Math.floor(parseFloat(raw.split(" ")[0]));
  } catch {
    return null;
  }
}

export const GET = withAuth(async () => {
  const [cpuSample, memory, netSample, temperature, uptime] = await Promise.all([
    readCpuSample(),
    readMemory(),
    readNetSample(),
    readTemperature(),
    readUptime(),
  ]);

  // CPU % from the delta since the previous request.
  let cpuPercent: number | null = null;
  if (cpuSample && lastCpu && cpuSample.total > lastCpu.total) {
    const dTotal = cpuSample.total - lastCpu.total;
    const dIdle = cpuSample.idle - lastCpu.idle;
    cpuPercent = Math.max(0, Math.min(100, Math.round(((dTotal - dIdle) / dTotal) * 100)));
  }
  if (cpuSample) lastCpu = cpuSample;

  // Network throughput (bytes/sec) from the delta since the previous request.
  let rxPerSec: number | null = null;
  let txPerSec: number | null = null;
  if (netSample && lastNet && netSample.at > lastNet.at) {
    const dt = (netSample.at - lastNet.at) / 1000;
    rxPerSec = Math.max(0, (netSample.rx - lastNet.rx) / dt);
    txPerSec = Math.max(0, (netSample.tx - lastNet.tx) / dt);
  }
  if (netSample) lastNet = netSample;

  const load = os.loadavg();

  return ok({
    cpu: {
      percent: cpuPercent,
      cores: os.cpus().length,
      load1: Math.round(load[0] * 100) / 100,
    },
    memory,
    network: { rxPerSec, txPerSec },
    temperatureC: temperature,
    uptimeSec: uptime,
    hostname: os.hostname(),
  });
});
