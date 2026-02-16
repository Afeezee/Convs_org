import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Camera } from "lucide-react";
import Avatar from "@/components/shared/Avatar";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ username: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const profiles = await base44.entities.Profile.filter({ email: u.email });
      if (profiles[0]) {
        setProfile(profiles[0]);
        setFormData({ username: profiles[0].username || "", bio: profiles[0].bio || "" });
      } else {
        // Auto-create profile on first visit
        const newProfile = await base44.entities.Profile.create({
          email: u.email,
          full_name: u.full_name,
          username: u.email.split("@")[0],
          bio: "",
          profile_image: "",
          cover_image: "",
          badges: [],
        });
        setProfile(newProfile);
        setFormData({ username: newProfile.username || "", bio: "" });
      }
    });
  }, []);

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (profile) {
      await base44.entities.Profile.update(profile.id, { [field]: file_url });
      setProfile({ ...profile, [field]: file_url });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (profile) {
      await base44.entities.Profile.update(profile.id, {
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
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[var(--convs-accent)] hover:bg-[var(--convs-accent-hover)] text-white gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}