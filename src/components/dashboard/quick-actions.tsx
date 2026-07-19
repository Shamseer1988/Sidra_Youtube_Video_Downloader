"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  FolderSearch,
  FolderTree,
  ImagePlus,
  Link2,
  ListMusic,
  Sparkles,
  Upload,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Download-from-URL dialog (react-hook-form + zod)                   */
/* ------------------------------------------------------------------ */

const downloadSchema = z.object({
  url: z
    .string()
    .min(1, "Paste a link to download")
    .url("That doesn't look like a valid URL"),
});

type DownloadForm = z.infer<typeof downloadSchema>;

function DownloadUrlDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DownloadForm>({ resolver: zodResolver(downloadSchema) });

  function onSubmit(values: DownloadForm) {
    onOpenChange(false);
    router.push(`/downloads?url=${encodeURIComponent(values.url)}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download from URL</DialogTitle>
          <DialogDescription>
            Paste a YouTube, Vimeo or direct link — SidraMedia will fetch the best quality
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="download-url" className="sr-only">
              Media URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
              <input
                id="download-url"
                placeholder="https://youtube.com/watch?v=…"
                autoFocus
                {...register("url")}
                className="h-11 w-full rounded-xl border border-stroke bg-surface-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50"
                aria-invalid={!!errors.url}
              />
            </div>
            {errors.url && (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {errors.url.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg">
            Start Download <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Actions grid                                                       */
/* ------------------------------------------------------------------ */

interface QuickAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  featured?: boolean;
  dialog?: boolean;
}

const actions: QuickAction[] = [
  { label: "Download from URL", description: "Paste YouTube, Vimeo or any link", icon: Link2, featured: true, dialog: true },
  { label: "Bulk Download", description: "Add multiple links", icon: ListMusic, href: "/downloads" },
  { label: "Import Playlist", description: "From YouTube or other sources", icon: ListMusic, href: "/playlists" },
  { label: "Import Channel", description: "YouTube channel", icon: Youtube, href: "/downloads" },
  { label: "Upload Media", description: "From your device", icon: Upload, href: "/movies" },
  { label: "Scan NAS", description: "Index new files on SIDRA-NAS", icon: FolderSearch, href: "/nas" },
  { label: "Scan Folder", description: "Watch a specific directory", icon: FolderTree, href: "/nas" },
  { label: "Generate Thumbnails", description: "Rebuild preview images", icon: ImagePlus, href: "/nas" },
  { label: "AI Organize Library", description: "Auto-tag, rename & sort media", icon: Sparkles, href: "/analytics" },
];

/** Quick action launcher panel. */
export const QuickActions = memo(function QuickActions() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [featured, ...rest] = actions;

  return (
    <section aria-label="Quick actions" className="glass-card flex h-full flex-col p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">Quick Actions</h2>

      {/* Featured action */}
      <motion.button
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => setDialogOpen(true)}
        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-4 text-left shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/40"
      >
        <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,255,255,0.18),transparent_50%)]" />
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
          <featured.icon className="h-5 w-5" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{featured.label}</span>
          <span className="block truncate text-xs text-white/70">{featured.description}</span>
        </span>
        <ArrowRight className="relative h-4 w-4 shrink-0 text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
      </motion.button>

      {/* Secondary actions */}
      <div className="mt-3 grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
        {rest.map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => (action.href ? router.push(action.href) : setDialogOpen(true))}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-stroke bg-surface-2/60 p-3 text-left transition-colors",
              "hover:border-primary/30 hover:bg-surface-2"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stroke bg-surface-3 text-muted transition-colors group-hover:border-primary/30 group-hover:text-primary">
              <action.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {action.label}
              </span>
              <span className="block truncate text-[11px] text-muted-2">
                {action.description}
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      <DownloadUrlDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
});
