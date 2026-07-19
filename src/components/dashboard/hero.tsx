"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CloudMoon, DownloadCloud, HardDrive } from "lucide-react";
import { useClock } from "@/hooks/use-clock";
import { useStorageInfo } from "@/hooks/use-system";
import { formatBytes } from "@/lib/utils";
import { demoWeather, downloadsPerDay } from "@/lib/mock-data";

const PARTICLES = [
  { left: "8%", top: "22%", size: 3, delay: 0 },
  { left: "18%", top: "68%", size: 2, delay: 1.2 },
  { left: "34%", top: "18%", size: 2, delay: 2.1 },
  { left: "52%", top: "74%", size: 3, delay: 0.6 },
  { left: "64%", top: "26%", size: 2, delay: 1.8 },
  { left: "78%", top: "62%", size: 3, delay: 0.3 },
  { left: "88%", top: "30%", size: 2, delay: 2.4 },
  { left: "44%", top: "44%", size: 2, delay: 3.0 },
];

function HeroChip({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xl">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/85">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold leading-tight text-white">{primary}</p>
        <p className="text-xs leading-tight text-white/60">{secondary}</p>
      </div>
    </div>
  );
}

/** Large hero card — animated aurora gradient, floating particles, live clock. */
export const Hero = memo(function Hero({ username }: { username: string }) {
  const clock = useClock();
  const { data: storage } = useStorageInfo();
  const todayDownloads = downloadsPerDay[downloadsPerDay.length - 1].downloads;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      aria-label="Welcome"
      className="relative overflow-hidden rounded-3xl border border-stroke bg-[#0a0716]"
    >
      {/* Animated aurora layers */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="animate-aurora absolute -left-1/4 -top-1/2 h-[140%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.45),transparent)] blur-3xl" />
        <div
          className="animate-aurora absolute -right-1/4 -bottom-1/2 h-[150%] w-[85%] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.35),transparent)] blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="animate-aurora absolute left-1/3 top-0 h-[100%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgba(79,70,229,0.3),transparent)] blur-3xl"
          style={{ animationDelay: "-3.5s" }}
        />
        <div className="bg-grid-pattern absolute inset-0 opacity-60" />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="animate-float absolute rounded-full bg-white/50 shadow-[0_0_8px_rgba(167,139,250,0.9)]"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
        >
          {clock?.greeting ?? "Welcome back"}, <span className="capitalize">{username}</span>!{" "}
          <motion.span
            className="inline-block origin-[70%_70%]"
            animate={{ rotate: [0, 18, -8, 14, 0] }}
            transition={{ delay: 1, duration: 1.4, ease: "easeInOut" }}
          >
            👋
          </motion.span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-2 max-w-xl text-sm text-white/65 sm:text-base"
        >
          Manage your media library with AI-powered organization.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-6 flex flex-wrap gap-3 sm:mt-8"
        >
          <HeroChip
            icon={<CalendarClock className="h-4 w-4" />}
            primary={clock?.time ?? "—:—"}
            secondary={clock?.date ?? "Loading…"}
          />
          <HeroChip
            icon={<CloudMoon className="h-4 w-4" />}
            primary={`${demoWeather.tempC}°C`}
            secondary={`${demoWeather.condition}, ${demoWeather.city}`}
          />
          <HeroChip
            icon={<HardDrive className="h-4 w-4" />}
            primary={storage ? `${formatBytes(storage.freeBytes, 1)} free` : "— free"}
            secondary={
              storage
                ? `of ${formatBytes(storage.totalBytes, 1)} on ${storage.nasName}`
                : "checking storage…"
            }
          />
          <HeroChip
            icon={<DownloadCloud className="h-4 w-4" />}
            primary={`${todayDownloads} downloads`}
            secondary="completed today"
          />
        </motion.div>
      </div>
    </motion.section>
  );
});
