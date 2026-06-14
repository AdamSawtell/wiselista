"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJobDisplayName } from "@/lib/jobs";

type JobNameEditorProps = {
  jobId: string;
  initialName: string | null;
};

export function JobNameEditor({ jobId, initialName }: JobNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (trimmed === (initialName ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        setValue(initialName ?? "");
      } else {
        router.refresh();
      }
    } catch {
      setValue(initialName ?? "");
    }
    setSaving(false);
    setEditing(false);
  }

  const displayName = getJobDisplayName({ id: jobId, name: initialName });

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
          if (e.key === "Escape") {
            setValue(initialName ?? "");
            setEditing(false);
          }
        }}
        maxLength={120}
        disabled={saving}
        className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xl font-semibold text-slate-900 focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
        aria-label="Project name"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex max-w-full items-center gap-2 text-left"
      title="Click to rename"
    >
      <h1 className="truncate text-xl font-semibold text-slate-900">{displayName}</h1>
      <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        Rename
      </span>
    </button>
  );
}
