"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AgentProfile,
  type AgentProfileInput,
  type ProfileType,
  PROFILE_FIELD_LABELS,
  PROFILE_TYPE_LABELS,
  PROFILE_TYPES,
  emptyProfileInput,
  isAgentProfile,
} from "@/lib/profile";

export function AgentProfileForm() {
  const [form, setForm] = useState<AgentProfileInput>(emptyProfileInput());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not load profile");
          return;
        }
        const p = data.profile as AgentProfile;
        setForm({
          profile_type: p.profile_type === "individual" ? "individual" : "agent",
          full_name: p.full_name ?? "",
          business_name: p.business_name ?? "",
          role_title: p.role_title ?? "",
          phone: p.phone ?? "",
          business_url: p.business_url ?? "",
          linkedin_url: p.linkedin_url ?? "",
          license_number: p.license_number ?? "",
          business_address: p.business_address ?? "",
        });
        setPhotoUrl(p.share_profile_photo_url ?? null);
      } catch {
        setError("Could not load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateField<K extends keyof AgentProfileInput>(key: K, value: AgentProfileInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setProfileType(type: ProfileType) {
    setForm((prev) => ({ ...prev, profile_type: type }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save profile");
        return;
      }
      const p = data.profile as AgentProfile;
      setPhotoUrl(p.share_profile_photo_url ?? null);
      setSaved(true);
    } catch {
      setError("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);

    setUploadingPhoto(true);
    setError(null);
    setSaved(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not upload photo");
        setPhotoPreview(null);
        return;
      }
      const p = data.profile as AgentProfile;
      setPhotoUrl(p.share_profile_photo_url ?? null);
      setPhotoPreview(null);
      setSaved(true);
    } catch {
      setError("Could not upload photo");
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
      URL.revokeObjectURL(localPreview);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not remove photo");
        return;
      }
      setPhotoUrl(null);
      setPhotoPreview(null);
      setSaved(true);
    } catch {
      setError("Could not remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  }

  const showAgentFields = isAgentProfile(form.profile_type);

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
      <p className="text-sm text-slate-600">
        This information appears on share links you send to clients, alongside your property photos.
      </p>

      <fieldset>
        <legend className="mb-3 block text-sm font-medium text-slate-700">
          {PROFILE_FIELD_LABELS.profile_type}
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          {PROFILE_TYPES.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                form.profile_type === type
                  ? "border-wiselista-accent bg-sky-50 text-slate-900"
                  : "border-wiselista-border bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="profile_type"
                value={type}
                checked={form.profile_type === type}
                onChange={() => setProfileType(type)}
                className="text-wiselista-accent focus:ring-wiselista-accent"
              />
              {PROFILE_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      {showAgentFields && (
        <div className="rounded-xl border border-wiselista-border bg-slate-50/80 p-4 sm:p-5">
          <p className="text-sm font-medium text-slate-800">{PROFILE_FIELD_LABELS.photo}</p>
          <p className="mt-1 text-xs text-slate-500">
            Shown on client share pages, like a realestate.com.au agent profile.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm ring-2 ring-amber-300/60">
              {photoPreview || photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview ?? photoUrl ?? ""}
                  alt="Your profile photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                  {form.full_name.trim().charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handlePhotoChange(e)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="rounded-lg border border-wiselista-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {uploadingPhoto ? "Uploading…" : photoPreview || photoUrl ? "Change photo" : "Upload photo"}
              </button>
              {(photoPreview || photoUrl) && (
                <button
                  type="button"
                  onClick={() => void handleRemovePhoto()}
                  disabled={uploadingPhoto}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={PROFILE_FIELD_LABELS.full_name}
          required
          value={form.full_name}
          onChange={(v) => updateField("full_name", v)}
          placeholder="Adam Sawtell"
        />

        {showAgentFields && (
          <>
            <Field
              label={PROFILE_FIELD_LABELS.business_name}
              required
              value={form.business_name ?? ""}
              onChange={(v) => updateField("business_name", v)}
              placeholder="Ray White Inner West"
            />
            <Field
              label={PROFILE_FIELD_LABELS.role_title}
              value={form.role_title ?? ""}
              onChange={(v) => updateField("role_title", v)}
              placeholder="Licensed Sales Agent"
            />
            <Field
              label={PROFILE_FIELD_LABELS.license_number}
              value={form.license_number ?? ""}
              onChange={(v) => updateField("license_number", v)}
              placeholder="RLA337431"
            />
          </>
        )}

        <Field
          label={PROFILE_FIELD_LABELS.phone}
          value={form.phone ?? ""}
          onChange={(v) => updateField("phone", v)}
          placeholder="0412 345 678"
          type="tel"
        />

        {showAgentFields && (
          <>
            <Field
              label={PROFILE_FIELD_LABELS.business_url}
              value={form.business_url ?? ""}
              onChange={(v) => updateField("business_url", v)}
              placeholder="www.youragency.com.au"
              type="url"
            />
            <Field
              label={PROFILE_FIELD_LABELS.linkedin_url}
              value={form.linkedin_url ?? ""}
              onChange={(v) => updateField("linkedin_url", v)}
              placeholder="linkedin.com/in/yourname"
              type="url"
            />
            <div className="sm:col-span-2">
              <Field
                label={PROFILE_FIELD_LABELS.business_address}
                value={form.business_address ?? ""}
                onChange={(v) => updateField("business_address", v)}
                placeholder="123 Main Street, Sydney NSW"
              />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && (
        <p className="text-sm text-emerald-600">
          Profile saved. Client share links will show your updated details.
        </p>
      )}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-wiselista-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
      />
    </label>
  );
}
