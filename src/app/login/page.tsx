"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Lock, LogIn, Play, User } from "lucide-react";
import { apiSend } from "@/lib/client-api";
import { posterWall } from "@/lib/mock-data";
import { PosterArt } from "@/components/media/poster-art";

/* ------------------------------------------------------------------ */
/*  Cinematic poster-wall backdrop (Netflix / Prime style)             */
/* ------------------------------------------------------------------ */

const wall = [...posterWall, ...posterWall.slice(0, 4)];

function PosterWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#050508]">
      {/* Tilted oversized poster grid */}
      <div
        className="absolute -inset-[18%] grid grid-cols-4 gap-3 opacity-50 sm:grid-cols-6 lg:grid-cols-8"
        style={{ transform: "rotate(-8deg) scale(1.15)" }}
      >
        {wall.map((item, i) => (
          <motion.div
            key={`${item.id}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.02 * i, duration: 0.8 }}
            className="aspect-[2/3] overflow-hidden rounded-xl"
          >
            <PosterArt title={item.title} colors={item.art} kind={item.kind} />
          </motion.div>
        ))}
      </div>

      {/* Cinematic gradient + vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/75 to-[#050508]/45" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,transparent_30%,rgba(5,5,8,0.9)_100%)]" />
      {/* Brand glow behind the card */}
      <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.22),transparent)] blur-2xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

function Field({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
        {icon}
      </span>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-11 pr-4 text-sm text-white placeholder:text-white/35 transition-colors focus:border-violet-500/60 focus:bg-white/[0.09]"
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiSend("POST", "/api/auth/login", { username, password });
      router.replace(params.get("from") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <PosterWall />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
            className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-600/40"
          >
            <Play className="h-6 w-6 fill-white text-white" />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Sidra<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Media</span>
          </h1>
          <p className="mt-1.5 text-sm text-white/50">Your personal streaming universe</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-black/55 p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <h2 className="text-lg font-semibold text-white">Sign in</h2>
          <p className="mb-6 mt-0.5 text-[13px] text-white/45">
            Welcome back — your library is waiting.
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <Field
              icon={<User className="h-4 w-4" />}
              placeholder="Username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              aria-label="Username or email"
              required
            />
            <Field
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="Password"
              required
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-shadow hover:shadow-xl hover:shadow-violet-600/45 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "Signing in…" : "Sign In"}
            </motion.button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          SidraMedia · self-hosted media server · movies, shows & music in one place
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
