"use client";

import { motion } from "framer-motion";
import { Eye, Plus, Radio, Timer } from "lucide-react";
import { liveStreams } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LiveStreamsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Live Streams"
        subtitle="Pinned live channels you can watch or record"
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Stream
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveStreams.map((stream, i) => (
          <motion.article
            key={stream.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="glass-card card-interactive group overflow-hidden"
          >
            <div
              className="relative aspect-video"
              style={{
                background: `radial-gradient(120% 100% at 20% 0%, ${stream.art[0]} 0%, transparent 65%), linear-gradient(150deg, ${stream.art[0]}, ${stream.art[1]})`,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_30%,transparent_40%,rgba(0,0,0,0.5)_100%)]" />
              <Badge
                size="sm"
                className="absolute left-3 top-3 gap-1.5 border-danger/40 bg-danger/20 text-[10px] font-bold uppercase tracking-wider text-danger backdrop-blur"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-danger opacity-70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-danger" />
                </span>
                Live
              </Badge>
              <Radio className="absolute bottom-3 right-3 h-5 w-5 text-white/40 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="p-4">
              <p className="truncate text-sm font-semibold text-foreground">{stream.name}</p>
              <p className="mt-0.5 text-xs text-muted-2">{stream.platform}</p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> {stream.viewers}
                </span>
                <span className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> {stream.uptime} uptime
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
