"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Trash2, Shield, Loader2, Power, DownloadCloud, Eraser,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { useUser } from "@/components/providers/user-provider";
import { cn } from "@/lib/utils";

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  avatarColor: string;
  canDownload: boolean;
  canDelete: boolean;
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

  const inputCls =
    "h-11 px-3.5 rounded-xl bg-navy-900/70 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/15";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100">User Management</h1>

      {/* Add user */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-accent-blue" />
          <h2 className="text-base font-semibold text-slate-100">Add User</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input placeholder="Username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputCls} />
          <input placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          <input placeholder="Password" type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={inputCls}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="mt-4 flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create user
        </button>
      </div>

      {/* User list */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
          </div>
        ) : (
          <div className="divide-y divide-slate-700/20">
            {users.map((u) => {
              const isSelf = u.id === me.id;
              const isAdmin = u.role === "admin";
              return (
                <div key={u.id} className="px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: u.avatarColor }}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-100 truncate">{u.username}</p>
                        <Badge variant={isAdmin ? "purple" : "default"} size="sm">
                          {isAdmin ? "Admin" : "User"}
                        </Badge>
                        {!u.isActive && <Badge variant="red" size="sm">Disabled</Badge>}
                        {isSelf && <Badge variant="blue" size="sm">You</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => remove(u.id)}
                        title="Delete user"
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Privileges */}
                  {!isSelf && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pl-0 sm:pl-14">
                      <PrivToggle
                        active={isAdmin}
                        icon={Shield}
                        label="Admin"
                        onClick={() => update(u.id, { role: isAdmin ? "user" : "admin" })}
                      />
                      <PrivToggle
                        active={isAdmin || u.canDownload}
                        disabled={isAdmin}
                        icon={DownloadCloud}
                        label="Can download"
                        onClick={() => update(u.id, { canDownload: !u.canDownload })}
                      />
                      <PrivToggle
                        active={isAdmin || u.canDelete}
                        disabled={isAdmin}
                        icon={Eraser}
                        label="Can delete media"
                        onClick={() => update(u.id, { canDelete: !u.canDelete })}
                      />
                      <PrivToggle
                        active={u.isActive}
                        icon={Power}
                        label={u.isActive ? "Active" : "Disabled"}
                        onClick={() => update(u.id, { isActive: !u.isActive })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PrivToggle({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
        active
          ? "bg-accent-blue/15 border-accent-blue/40 text-accent-blue"
          : "bg-navy-900/50 border-slate-700/40 text-slate-500 hover:text-slate-300",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
