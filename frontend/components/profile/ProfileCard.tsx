"use client";

import { useState, useRef } from "react";
import { Calendar, Edit3, Check, X, Camera, Trash2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useStore } from "@/lib/store";
import AvatarCropModal from "./AvatarCropModal";

export default function ProfileCard() {
  const user = useStore((s) => s.user);
  const {
    displayName, avatarColor, avatarUrl, initial, memberSince,
    accountAgeDays, accountAgeLabel, updateProfile, uploadAvatar, removeAvatar, profile,
  } = useProfile();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [bioInput, setBioInput] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setSaving(true);
    await updateProfile({
      display_name: nameInput.trim() || displayName,
      bio: bioInput.trim() || undefined,
    });
    setSaving(false);
    setEditing(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    setCropFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleCropConfirm(cropped: File) {
    setCropFile(null);
    setUploading(true);
    try {
      await uploadAvatar(cropped);
    } catch {
      // silent
    }
    setUploading(false);
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    await removeAvatar();
    setUploading(false);
  }

  function formatDate(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function formatAgeLong(days: number): string {
    if (days < 1) return "Joined today";
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
    const years = Math.floor(days / 365);
    const rem = Math.floor((days % 365) / 30);
    return rem > 0 ? `${years}y ${rem}mo` : `${years} year${years > 1 ? "s" : ""}`;
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Banner */}
      <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${avatarColor}20, ${avatarColor}05)` }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div className="absolute -bottom-10 left-6 group">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold font-mono shadow-lg overflow-hidden relative"
            style={{
              backgroundColor: `${avatarColor}20`,
              color: avatarColor,
              border: `2px solid ${avatarColor}50`,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#fff" }} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-blue)", color: "#fff" }}
              title="Upload photo"
            >
              <Camera size={11} />
            </button>
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--accent-red, #FF1744)", color: "#fff" }}
                title="Remove photo"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-6 pt-14 pb-6">
        {editing ? (
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                Display Name
              </span>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)", color: "var(--text-primary)" }}
                autoFocus
              />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                Bio
              </span>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={160}
                rows={2}
                placeholder="Tell others about yourself..."
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)", color: "var(--text-primary)" }}
              />
              <span className="text-[10px] block text-right mt-0.5" style={{ color: "var(--text-muted)" }}>{bioInput.length}/160</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={() => { setEditing(false); setNameInput(displayName); setBioInput(profile?.bio ?? ""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{displayName}</h2>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
              </div>
              <button
                onClick={() => { setEditing(true); setNameInput(displayName); setBioInput(profile?.bio ?? ""); }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Edit3 size={14} />
              </button>
            </div>

            {profile?.bio && (
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {memberSince ? formatDate(memberSince) : "Unknown"}
                </span>
              </div>
              <div
                className="px-2 py-0.5 rounded-md text-xs font-mono font-medium"
                style={{
                  backgroundColor: accountAgeDays >= 365 ? "rgba(0,230,118,0.1)" : accountAgeDays >= 30 ? "rgba(41,121,255,0.1)" : "rgba(255,255,255,0.04)",
                  color: accountAgeDays >= 365 ? "var(--accent-green)" : accountAgeDays >= 30 ? "var(--accent-blue)" : "var(--text-muted)",
                }}
              >
                {formatAgeLong(accountAgeDays)}
              </div>
            </div>
          </div>
        )}
      </div>

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
