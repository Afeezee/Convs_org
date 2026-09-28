import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Camera, Trash2, AlertTriangle } from "lucide-react";
import Avatar from "@/components/shared/Avatar";

export default function Settings() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ username: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profiles = await api.entities.Profile.filter({ email: user.email });
      if (profiles[0]) {
        setProfile(profiles[0]);
        setFormData({ username: profiles[0].username || "", bio: profiles[0].bio || "" });
      } else {
        const newProfile = await api.entities.Profile.create({
          full_name: user.full_name,
          username: user.email.split("@")[0],
          bio: "",
        });
        setProfile(newProfile);
        setFormData({ username: newProfile.username || "", bio: "" });
      }
    })().catch(() => {});
  }, [user]);

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await api.integrations.UploadFile({ file });
    if (profile) {
      await api.entities.Profile.update(profile.id, { [field]: file_url });
      setProfile({ ...profile, [field]: file_url });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (profile) {
      await api.entities.Profile.update(profile.id, {
        username: formData.username,
        bio: formData.bio,
        full_name: user.full_name,
      });
    }
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[var(--convs-text)] mb-6">Settings</h1>

      {/* Profile Image */}
      <div className="convs-card p-6 mb-4">
        <Label className="text-sm font-semibold text-[var(--convs-text)] mb-4 block">Profile</Label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={user.full_name} image={profile?.profile_image} size="xl" />
            <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--convs-accent)] flex items-center justify-center cursor-pointer shadow-md">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, "profile_image")} className="hidden" />
            </label>
          </div>
          <div>
            <p className="font-semibold text-[var(--convs-text)]">{user.full_name}</p>
            <p className="text-sm text-[var(--convs-text-muted)]">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="convs-card p-6 space-y-4">
        <div>
          <Label className="text-sm text-[var(--convs-text-secondary)]">Username</Label>
          <Input
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })}
            placeholder="@yourusername"
            className="mt-1 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
          />
        </div>
        <div>
          <Label className="text-sm text-[var(--convs-text-secondary)]">Bio</Label>
          <Textarea
            value={formData.bio}
            onChange={e => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about your intellectual interests..."
            rows={3}
            className="mt-1 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] resize-none"
          />
        </div>
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#6366F1" }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="convs-card p-6 mt-6 border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-bold text-red-500">Danger Zone</h2>
        </div>
        <p className="text-xs text-[var(--convs-text-muted)] mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-red-500 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="space-y-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Type <span className="font-bold">DELETE</span> to confirm:
            </p>
            <Input
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="border-red-300 dark:border-red-800"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (deleteText !== "DELETE") return;
                  setIsDeleting(true);
                  // Server-side cascade: one call deletes convs, comments,
                  // follows, bookmarks, ratings, reconvs, messages, notifications,
                  // profile, users row and the Clerk account.
                  try {
                    await api.entities.User.delete(user.id);
                  } catch (err) {
                    setIsDeleting(false);
                    // eslint-disable-next-line no-alert
                    alert(err.message ?? "Delete failed.");
                    return;
                  }
                  logout("/");
                }}
                disabled={deleteText !== "DELETE" || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Permanently Delete
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--convs-text-secondary)] hover:bg-[var(--convs-bg-tertiary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}