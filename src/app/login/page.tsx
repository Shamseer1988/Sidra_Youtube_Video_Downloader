"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Play, User, Lock, Eye, EyeOff, Clapperboard, Music, DownloadCloud } from "lucide-react";
import { apiSend } from "@/lib/client-api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Cinematic backdrop */}
      <div className="login-backdrop" />
      <div className="login-grid" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[400px]"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
            className="relative flex items-center justify-center w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-accent-blue via-accent-purple to-accent-red shadow-2xl shadow-accent-blue/30 mb-4"
          >
            <Play className="h-8 w-8 text-white fill-white ml-1" />
            <div className="absolute -inset-1 rounded-[26px] bg-gradient-to-br from-accent-blue/40 to-accent-purple/40 blur-xl -z-10" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Sidra<span className="gradient-text">Media</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">Your personal streaming universe</p>
        </div>

        {/* Card */}
        <div className="glass-card p-7 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-semibold text-slate-100 mb-5">Sign in</h2>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or email"
                autoComplete="username"
                autoCapitalize="none"
                required
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-navy-900/80 border border-slate-600/30 text-[15px] text-slate-100 placeholder-slate-500 transition-all focus:border-accent-blue/60 focus:ring-2 focus:ring-accent-blue/20"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full h-12 pl-11 pr-12 rounded-xl bg-navy-900/80 border border-slate-600/30 text-[15px] text-slate-100 placeholder-slate-500 transition-all focus:border-accent-blue/60 focus:ring-2 focus:ring-accent-blue/20"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[15px] font-semibold shadow-lg shadow-accent-blue/25 transition-all hover:opacity-95 hover:shadow-accent-blue/40 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        {/* Feature strip */}
        <div className="flex items-center justify-center gap-6 mt-7 text-slate-500">
          <span className="flex items-center gap-1.5 text-xs">
            <Clapperboard className="h-3.5 w-3.5" /> Stream
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1.5 text-xs">
            <DownloadCloud className="h-3.5 w-3.5" /> Download
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1.5 text-xs">
            <Music className="h-3.5 w-3.5" /> Listen
          </span>
        </div>
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
