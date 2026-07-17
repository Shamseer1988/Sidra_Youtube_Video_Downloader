"use client";

import React, { useState, useEffect } from "react";
import { Settings, Folder, UserCheck, ShieldAlert, Loader2, Save, UserPlus, Trash2, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { PathPicker } from "@/components/settings/path-picker";
import { Modal } from "@/components/ui/modal";
import type { User } from "@/types";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const { addToast } = useToast();
  const toast = ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    addToast({
      title,
      message: description,
      type: variant === "destructive" ? "error" : "success",
    });
  };

  const [activeTab, setActiveTab] = useState<"general" | "paths" | "users">("general");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Path Picker state
  const [pathPickerOpen, setPathPickerOpen] = useState(false);
  const [activePathKey, setActivePathKey] = useState<string>("");
  const [pickerTitle, setPickerTitle] = useState("");

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [submittingUser, setSubmittingUser] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load users when clicking users tab
  useEffect(() => {
    if (activeTab === "users" && isAdmin) {
      loadUsers();
    }
  }, [activeTab, isAdmin]);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.getSettings();
      // Settings returned from backend is merged dictionary
      if (res.success && res.data) {
        setSettings(res.data as any);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load settings.",
        variant: "destructive",
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load users list.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.updateSettings(settings);
      if (res.success) {
        toast({
          title: "Settings Saved",
          description: "Your configuration changes have been stored successfully.",
          variant: "default",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to save settings",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Path picker handler
  const handleOpenPathPicker = (key: string, label: string) => {
    setActivePathKey(key);
    setPickerTitle(`Select ${label}`);
    setPathPickerOpen(true);
  };

  const handleSelectPath = (selectedPath: string) => {
    handleSettingChange(activePathKey, selectedPath);
  };

  // User Actions
  const handleOpenUserModal = (targetUser: User | null = null) => {
    if (targetUser) {
      setEditingUser(targetUser);
      setUserForm({
        username: targetUser.username,
        email: targetUser.email,
        password: "", // Leave blank unless resetting
        role: targetUser.role,
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: "",
        email: "",
        password: "",
        role: "user",
      });
    }
    setUserModalOpen(true);
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          username: userForm.username,
          email: userForm.email,
          role: userForm.role,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        const res = await api.updateUser(editingUser.id, updateData);
        if (res.success) {
          toast({ title: "User Updated", description: "User details updated successfully." });
          loadUsers();
          setUserModalOpen(false);
        }
      } else {
        // Create user
        if (!userForm.password) {
          toast({ title: "Required Field", description: "Password is required for new users.", variant: "destructive" });
          setSubmittingUser(false);
          return;
        }
        const res = await api.createUser(userForm);
        if (res.success) {
          toast({ title: "User Created", description: "New user account created successfully." });
          loadUsers();
          setUserModalOpen(false);
        }
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err?.message || "Failed to process user operation.",
        variant: "destructive",
      });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleOpenDeleteConfirm = (targetUser: User) => {
    if (targetUser.id === user?.id) {
      toast({
        title: "Action Restricted",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }
    setUserToDelete(targetUser);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await api.deleteUser(userToDelete.id);
      if (res.success) {
        toast({ title: "User Deleted", description: "User account has been deleted." });
        loadUsers();
        setDeleteConfirmOpen(false);
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.message || "Could not delete user account.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-accent-blue" />
          Settings Panel
        </h1>
        <p className="text-slate-400 text-sm">Configure downloads directory, video resolutions, and user management</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "general"
              ? "border-accent-blue text-white bg-accent-blue/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("paths")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "paths"
              ? "border-accent-blue text-white bg-accent-blue/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Folders & Paths
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-accent-blue text-white bg-accent-blue/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            User Accounts
          </button>
        )}
      </div>

      {loadingSettings ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-accent-blue animate-spin" />
          <span className="text-sm text-slate-400">Loading settings configuration...</span>
        </div>
      ) : (
        /* Tab Contents */
        <div className="space-y-6">
          {/* GENERAL SETTINGS */}
          {activeTab === "general" && (
            <Card className="glass border-slate-700/20 p-6">
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Default Video Format
                    </label>
                    <Select
                      value={settings.default_video_format || "best"}
                      onChange={(e) => handleSettingChange("default_video_format", e.target.value)}
                      options={[
                        { value: "best", label: "Best Available (video+audio)" },
                        { value: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]", label: "Best MP4 Compatibility" },
                        { value: "bestvideo[height<=1080]+bestaudio/best[height<=1080]", label: "Max 1080p Quality" },
                        { value: "bestvideo[height<=720]+bestaudio/best[height<=720]", label: "Max 720p Quality" },
                      ]}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Default yt-dlp downloading resolution selector</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Default Audio Format
                    </label>
                    <Select
                      value={settings.default_audio_format || "bestaudio"}
                      onChange={(e) => handleSettingChange("default_audio_format", e.target.value)}
                      options={[
                        { value: "bestaudio", label: "Best Audio Quality" },
                        { value: "mp3", label: "MP3 Format (Automatic Encode)" },
                        { value: "m4a", label: "M4A (AAC Codec)" },
                        { value: "wav", label: "WAV Lossless" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Max Concurrent Downloads
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.max_concurrent_downloads || 3}
                      onChange={(e) => handleSettingChange("max_concurrent_downloads", parseInt(e.target.value))}
                      className="bg-navy-950/40 border-slate-700/30"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Number of parallel downloads active in worker queue</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Language Preference
                    </label>
                    <Select
                      value={settings.language || "en"}
                      onChange={(e) => handleSettingChange("language", e.target.value)}
                      options={[
                        { value: "en", label: "English" },
                        { value: "es", label: "Español" },
                        { value: "fr", label: "Français" },
                      ]}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Download Preferences</h3>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-navy-950/20 border border-slate-800/40">
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">Auto Generate Thumbnails</h4>
                      <p className="text-xs text-slate-500">Automatically generate video seek previews using ffmpeg</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.auto_generate_thumbnail}
                      onChange={(e) => handleSettingChange("auto_generate_thumbnail", e.target.checked)}
                      className="rounded border-slate-700 bg-navy-950/60 text-accent-blue focus:ring-accent-blue"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-navy-950/20 border border-slate-800/40">
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">Embed Subtitles</h4>
                      <p className="text-xs text-slate-500">Attempt to download and embed platform subtitles inside file</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.download_subtitles}
                      onChange={(e) => handleSettingChange("download_subtitles", e.target.checked)}
                      className="rounded border-slate-700 bg-navy-950/60 text-accent-blue focus:ring-accent-blue"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-navy-950/20 border border-slate-800/40">
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">Embed Metadata & Artwork</h4>
                      <p className="text-xs text-slate-500">Write uploader name, views, and thumbnail images to metadata headers</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.embed_metadata}
                      onChange={(e) => handleSettingChange("embed_metadata", e.target.checked)}
                      className="rounded border-slate-700 bg-navy-950/60 text-accent-blue focus:ring-accent-blue"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <Button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-gradient-to-r from-accent-blue to-accent-purple text-white gap-2"
                  >
                    {savingSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save General Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* FOLDERS & PATHS */}
          {activeTab === "paths" && (
            <Card className="glass border-slate-700/20 p-6">
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Video Download Directory
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={settings.download_video_path || ""}
                        onChange={(e) => handleSettingChange("download_video_path", e.target.value)}
                        placeholder="e.g. D:/Downloads/Videos"
                        className="font-mono bg-navy-950/40 border-slate-700/30 flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleOpenPathPicker("download_video_path", "Video Download Path")}
                        className="gap-1 bg-navy-800 text-slate-200 hover:bg-navy-700"
                      >
                        <Folder className="h-4 w-4" /> Browse
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Folder where video downloads will be saved on server</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Audio Download Directory
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={settings.download_audio_path || ""}
                        onChange={(e) => handleSettingChange("download_audio_path", e.target.value)}
                        placeholder="e.g. D:/Downloads/Audios"
                        className="font-mono bg-navy-950/40 border-slate-700/30 flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleOpenPathPicker("download_audio_path", "Audio Download Path")}
                        className="gap-1 bg-navy-800 text-slate-200 hover:bg-navy-700"
                      >
                        <Folder className="h-4 w-4" /> Browse
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Folder where extracted audio tracks will be saved</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Synology Video Media Source
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={settings.MEDIA_VIDEO_PATH || ""}
                        onChange={(e) => handleSettingChange("MEDIA_VIDEO_PATH", e.target.value)}
                        placeholder="e.g. /volume1/video"
                        className="font-mono bg-navy-950/40 border-slate-700/30 flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleOpenPathPicker("MEDIA_VIDEO_PATH", "Media Video Directory")}
                        className="gap-1 bg-navy-800 text-slate-200 hover:bg-navy-700"
                      >
                        <Folder className="h-4 w-4" /> Browse
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Synology media directory video folder to stream and play media from
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Synology Music Media Source
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={settings.MEDIA_AUDIO_PATH || ""}
                        onChange={(e) => handleSettingChange("MEDIA_AUDIO_PATH", e.target.value)}
                        placeholder="e.g. /volume1/music"
                        className="font-mono bg-navy-950/40 border-slate-700/30 flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleOpenPathPicker("MEDIA_AUDIO_PATH", "Media Audio Directory")}
                        className="gap-1 bg-navy-800 text-slate-200 hover:bg-navy-700"
                      >
                        <Folder className="h-4 w-4" /> Browse
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Synology music shared folder to stream and browse audio tracks
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <Button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-gradient-to-r from-accent-blue to-accent-purple text-white gap-2"
                  >
                    {savingSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Directory Config
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* USER MANAGEMENT */}
          {activeTab === "users" && isAdmin && (
            <Card className="glass border-slate-700/20 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider">User Account Management</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage user access permissions and dashboard credentials</p>
                </div>
                <Button
                  onClick={() => handleOpenUserModal(null)}
                  className="bg-accent-blue hover:bg-accent-blue/80 text-white gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
              </div>

              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-6 w-6 text-accent-blue animate-spin" />
                  <span className="text-xs text-slate-500">Retrieving users database...</span>
                </div>
              ) : (
                <div className="border border-slate-700/20 rounded-xl overflow-hidden bg-navy-950/20">
                  <Table>
                    <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>System Role</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="border-b border-slate-800/40 hover:bg-navy-800/10">
                          <TableCell className="font-semibold text-slate-200">{u.username}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">{u.email}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                u.role === "admin"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                              }`}
                            >
                              {u.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenUserModal(u)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={u.id === user?.id}
                              onClick={() => handleOpenDeleteConfirm(u)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Path Picker Modal Wrapper */}
      <PathPicker
        isOpen={pathPickerOpen}
        onClose={() => setPathPickerOpen(false)}
        onSelect={handleSelectPath}
        currentPath={settings[activePathKey] || ""}
        title={pickerTitle}
      />

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? "Edit User Details" : "Create New User"}
        size="sm"
      >
        <form onSubmit={handleUserFormSubmit} className="p-6 bg-navy-900 text-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <Input
              type="text"
              required
              disabled={!!editingUser}
              value={userForm.username}
              onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Enter unique username"
              className="bg-navy-950/40 border-slate-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <Input
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="name@domain.com"
              className="bg-navy-950/40 border-slate-700/30 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password {editingUser && "(Leave blank to keep current)"}
            </label>
            <Input
              type="password"
              required={!editingUser}
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              className="bg-navy-950/40 border-slate-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">User Access Level</label>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
              options={[
                { value: "user", label: "Standard User" },
                { value: "admin", label: "Administrator" },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
            <Button type="button" variant="ghost" onClick={() => setUserModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submittingUser}
              className="bg-gradient-to-r from-accent-blue to-accent-purple text-white gap-2"
            >
              {submittingUser && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingUser ? "Apply Changes" : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete User Account"
        size="sm"
      >
        <div className="p-6 bg-navy-900 text-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-950/50 flex items-center justify-center text-rose-500 border border-rose-500/20 mb-4">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Delete User Account?</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            This will permanently remove the credentials and settings for user <span className="font-semibold text-slate-200">@{userToDelete?.username}</span>.
          </p>
          <div className="flex justify-end gap-3 w-full border-t border-slate-700/30 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteUser} className="bg-rose-600 hover:bg-rose-500 text-white">
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
