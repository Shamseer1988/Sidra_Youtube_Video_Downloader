"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { useUser } from "@/components/providers/user-provider";

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  avatarColor: string;
  createdAt: string;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useUser();
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<ManagedUser[]>("/api/users"),
  });

  async function create() {
    if (!form.username || !form.email || !form.password) {
      toast("All fields are required", "error");
      return;
    }
    setCreating(true);
    try {
      await apiSend("POST", "/api/users", form);
      toast("User created", "success");
      setForm({ username: "", email: "", password: "", role: "user" });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      toast(e.message || "Could not create user", "error");
    } finally {
      setCreating(false);
    }
  }

  async function update(id: string, data: Record<string, unknown>) {
    try {
      await apiSend("PATCH", `/api/users/${id}`, data);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      toast(e.message || "Update failed", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this user? Their downloads and playlists will be removed.")) return;
    try {
      await apiSend("DELETE", `/api/users/${id}`);
      toast("User deleted", "success");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e: any) {
      toast(e.message || "Delete failed", "error");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-100">User Management</h1>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-accent-blue" />
          <h2 className="text-base font-semibold text-slate-100">Add User</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-300 focus:outline-none"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="mt-3">
          <Button onClick={create} isLoading={creating}>
            <UserPlus className="h-4 w-4" /> Create user
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
          </div>
        ) : (
          <div className="divide-y divide-slate-700/20">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: u.avatarColor }}
                >
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{u.username}</p>
                    <Badge variant={u.role === "admin" ? "purple" : "default"} size="sm">
                      {u.role === "admin" ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {u.role}
                    </Badge>
                    {!u.isActive && <Badge variant="red" size="sm">Disabled</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>

                {u.id !== me.id ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => update(u.id, { role: u.role === "admin" ? "user" : "admin" })}
                      title="Toggle admin"
                      className="p-2 rounded-lg text-slate-400 hover:text-accent-purple hover:bg-navy-700/50"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => update(u.id, { isActive: !u.isActive })}
                      title={u.isActive ? "Deactivate" : "Activate"}
                      className="p-2 rounded-lg text-slate-400 hover:text-accent-amber hover:bg-navy-700/50"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(u.id)}
                      title="Delete"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-navy-700/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Badge variant="blue" size="sm">You</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
