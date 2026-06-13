"use client";

import { useState } from "react";
import type { SharePhoto } from "@/lib/share";

type Props = {
  photos: SharePhoto[];
};

export function ClientShareGallery({ photos }: Props) {
  const [active, setActive] = useState<SharePhoto | null>(null);

  if (photos.length === 0) {
    return (
      <p className="rounded-xl border border-wiselista-border bg-white px-6 py-10 text-center text-sm text-slate-500">
        No enhanced photos are available for this property yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActive(photo)}
            className="group overflow-hidden rounded-xl border border-wiselista-border bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-wiselista-accent focus:ring-offset-2"
          >
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={photo.roomLabel}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
            <div className="border-t border-wiselista-border px-3 py-2.5">
              <p className="text-sm font-medium text-slate-900">{photo.roomLabel}</p>
              <p className="text-xs text-slate-500">Photo {photo.sequence + 1}</p>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.roomLabel} photo`}
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white hover:bg-black/70"
            >
              Close
            </button>
            <div className="max-h-[calc(90vh-4rem)] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.imageUrl}
                alt={active.roomLabel}
                className="h-auto w-full object-contain"
              />
            </div>
            <div className="border-t border-wiselista-border px-4 py-3">
              <p className="font-medium text-slate-900">{active.roomLabel}</p>
              <p className="text-sm text-slate-500">Enhanced for listing — photo {active.sequence + 1}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
