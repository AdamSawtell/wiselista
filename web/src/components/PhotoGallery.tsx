"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_LABELS } from "@/lib/jobs";
import { getEnhancementSummary } from "@/lib/enhancement";
import { DeletePhotoButton } from "@/components/DeletePhotoButton";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { ReprocessPhotoButton } from "@/components/ReprocessPhotoButton";

export type GalleryPhoto = {
  id: string;
  room_type: string;
  sequence: number;
  originalUrl: string | null;
  editedUrl: string | null;
  hasEdited: boolean;
};

type PhotoGalleryProps = {
  jobId: string;
  jobStatus: string;
  photos: GalleryPhoto[];
};

export function PhotoGallery({ jobId, jobStatus, photos: initialPhotos }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const isDraft = jobStatus === "draft";
  const canReorder = isDraft && photos.length > 1;

  async function persistOrder(next: GalleryPhoto[]) {
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: next.map((p) => p.id) }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSavingOrder(false);
    }
  }

  function handleDragStart(id: string) {
    if (!canReorder) return;
    setDragId(id);
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((p, i) => ({ ...p, sequence: i + 1 }));
    });
  }

  async function handleDragEnd() {
    if (!dragId) return;
    setDragId(null);
    await persistOrder(photos);
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-medium text-slate-700">No photos yet</p>
        <p className="mt-1 text-sm text-slate-500">Add photos above to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {canReorder && (
        <p className="mb-3 text-sm text-slate-500">
          Drag photos to set listing order (hero shot first).
          {savingOrder && <span className="ml-2 text-wiselista-accent">Saving order…</span>}
        </p>
      )}
      <ul className="grid gap-6 lg:grid-cols-2">
        {photos.map((photo, index) => {
          const label = ROOM_LABELS[photo.room_type] ?? photo.room_type;
          const showCompare = photo.originalUrl && photo.editedUrl;
          const orderNum = photo.sequence > 0 ? photo.sequence : index + 1;

          return (
            <li
              key={photo.id}
              draggable={canReorder}
              onDragStart={() => handleDragStart(photo.id)}
              onDragOver={(e) => handleDragOver(e, photo.id)}
              onDragEnd={() => void handleDragEnd()}
              className={`overflow-hidden rounded-xl border border-wiselista-border bg-white shadow-sm ${
                dragId === photo.id ? "opacity-60 ring-2 ring-wiselista-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-wiselista-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {canReorder && (
                    <span className="cursor-grab text-slate-400" title="Drag to reorder" aria-hidden>
                      ⠿
                    </span>
                  )}
                  <span className="truncate font-medium text-slate-900">
                    {orderNum}. {label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {photo.hasEdited ? (
                    <span className="badge-ready">Edited</span>
                  ) : (
                    <span className="badge-draft">Pending</span>
                  )}
                  {isDraft && <DeletePhotoButton jobId={jobId} photoId={photo.id} />}
                </div>
              </div>

              {showCompare ? (
                <>
                  <BeforeAfterSlider
                    originalUrl={photo.originalUrl!}
                    editedUrl={photo.editedUrl!}
                    alt={label}
                  />
                  <div className="border-t border-wiselista-border px-4 py-3">
                    <p className="text-xs text-slate-600">{getEnhancementSummary(photo.room_type)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={photo.editedUrl!}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-wiselista-accent hover:underline"
                      >
                        Download edited
                      </a>
                      {jobStatus === "ready" && (
                        <ReprocessPhotoButton jobId={jobId} photoId={photo.id} />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className={photo.originalUrl && !photo.editedUrl ? "" : ""}>
                  {photo.originalUrl && (
                    <figure>
                      <a
                        href={photo.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-[4/3] overflow-hidden bg-slate-100"
                      >
                        <img
                          src={photo.originalUrl}
                          alt={`${label} original`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                      <figcaption className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="font-medium text-slate-500">Original</span>
                        <a
                          href={photo.originalUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-wiselista-accent hover:underline"
                        >
                          Download
                        </a>
                      </figcaption>
                    </figure>
                  )}
                  {!photo.originalUrl && !photo.editedUrl && (
                    <div className="p-6 text-center text-sm text-slate-500">
                      Preview unavailable — check storage configuration.
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
