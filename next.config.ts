import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prisma + child-process tooling (yt-dlp/ffmpeg) must stay external so
  // Next's bundler/tracing doesn't try to bundle native binaries.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
