"use client";

import { useEffect, useState } from "react";
import {
  type AgentProfileInput,
  PROFILE_FIELD_LABELS,
  emptyProfileInput,
} from "@/lib/profile";

export function AgentProfileForm() {
  const [form, setForm] = useState<AgentProfileInput>(emptyProfileInput());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not load profile");
          return;
        }
        const p = data.profile;
        setForm({
          full_name: p.full_name ?? "",
          business_name: p.business_name ?? "",
          role_title: p.role_title ?? "",
          phone: p.phone ?? "",
          business_url: p.business_url ?? "",
          business_address: p.business_address ?? "",
        });
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
      setSaved(true);
    } catch {
      setError("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
      <p className="text-sm text-slate-600">
        This information appears on share links you send to clients, alongside your property photos.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={PROFILE_FIELD_LABELS.full_name}
          required
          value={form.full_name}
          onChange={(v) => updateField("full_name", v)}
          placeholder="Adam Sawtell"
        />
        <Field
          label={PROFILE_FIELD_LABELS.business_name}
          required
          value={form.business_name}
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
          label={PROFILE_FIELD_LABELS.phone}
          value={form.phone ?? ""}
          onChange={(v) => updateField("phone", v)}
          placeholder="0412 345 678"
          type="tel"
        />
        <div className="sm:col-span-2">
          <Field
            label={PROFILE_FIELD_LABELS.business_url}
            value={form.business_url ?? ""}
            onChange={(v) => updateField("business_url", v)}
            placeholder="www.youragency.com.au or realestate.com.au profile"
            type="url"
          />
        </div>
        <div className="sm:col-span-2">
          <Field
            label={PROFILE_FIELD_LABELS.business_address}
            value={form.business_address ?? ""}
            onChange={(v) => updateField("business_address", v)}
            placeholder="123 Main Street, Sydney NSW"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Profile saved. Client share links will show your updated details.</p>}

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
