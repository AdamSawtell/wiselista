"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LISTING_TYPE_LABELS, PORTAL_OPTIONS, type ListingType } from "@/lib/enhancement";

type PropertyContextFormProps = {
  jobId: string;
  initialAddress: string | null;
  initialListingType: string | null;
  initialPortal: string | null;
  readOnly?: boolean;
};

export function PropertyContextForm({
  jobId,
  initialAddress,
  initialListingType,
  initialPortal,
  readOnly = false,
}: PropertyContextFormProps) {
  const [address, setAddress] = useState(initialAddress ?? "");
  const [listingType, setListingType] = useState(initialListingType ?? "");
  const [portal, setPortal] = useState(initialPortal ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_address: address,
          listing_type: listingType || null,
          target_portal: portal || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (readOnly && !address && !listingType && !portal) return null;

  return (
    <section className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Property details</h2>
      <p className="mt-1 text-sm text-slate-500">
        Optional — helps tailor exports and your listing workflow.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Address</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={readOnly || saving}
            placeholder="e.g. 42 Beach Road, Bondi"
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-wiselista-border px-3 py-2 text-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent disabled:bg-slate-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Listing type</span>
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value)}
            disabled={readOnly || saving}
            className="mt-1 w-full rounded-lg border border-wiselista-border px-3 py-2 text-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent disabled:bg-slate-50"
          >
            <option value="">Not set</option>
            {(Object.entries(LISTING_TYPE_LABELS) as [ListingType, string][]).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Target portal</span>
          <select
            value={portal}
            onChange={(e) => setPortal(e.target.value)}
            disabled={readOnly || saving}
            className="mt-1 w-full rounded-lg border border-wiselista-border px-3 py-2 text-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent disabled:bg-slate-50"
          >
            <option value="">Not set</option>
            {PORTAL_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!readOnly && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-secondary text-sm">
            {saving ? "Saving…" : "Save details"}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      )}
    </section>
  );
}
