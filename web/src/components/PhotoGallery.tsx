import { ROOM_LABELS } from "@/lib/jobs";
import { DeletePhotoButton } from "@/components/DeletePhotoButton";

export type GalleryPhoto = {
  id: string;
  room_type: string;
  originalUrl: string | null;
  editedUrl: string | null;
  hasEdited: boolean;
};

type PhotoGalleryProps = {
  jobId: string;
  jobStatus: string;
  photos: GalleryPhoto[];
};

export function PhotoGallery({ jobId, jobStatus, photos }: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-medium text-slate-700">No photos yet</p>
        <p className="mt-1 text-sm text-slate-500">Add photos above to get started.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {photos.map((photo) => {
        const label = ROOM_LABELS[photo.room_type] ?? photo.room_type;
        const showCompare = photo.originalUrl && photo.editedUrl;

        return (
          <li
            key={photo.id}
            className="overflow-hidden rounded-xl border border-wiselista-border bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b border-wiselista-border px-4 py-3">
              <span className="font-medium text-slate-900">{label}</span>
              <div className="flex items-center gap-2">
                {photo.hasEdited ? (
                  <span className="badge-ready">Edited</span>
                ) : (
                  <span className="badge-draft">Pending</span>
                )}
                {jobStatus === "draft" && (
                  <DeletePhotoButton jobId={jobId} photoId={photo.id} />
                )}
              </div>
            </div>

            <div className={showCompare ? "grid grid-cols-2 gap-px bg-slate-200" : ""}>
              {photo.originalUrl && (
                <figure className={showCompare ? "bg-white" : ""}>
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

              {photo.editedUrl && (
                <figure className="bg-white">
                  <a
                    href={photo.editedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-[4/3] overflow-hidden bg-slate-100"
                  >
                    <img
                      src={photo.editedUrl}
                      alt={`${label} edited`}
                      className="h-full w-full object-cover"
                    />
                  </a>
                  <figcaption className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-medium text-slate-500">Edited</span>
                    <a
                      href={photo.editedUrl}
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
          </li>
        );
      })}
    </ul>
  );
}
