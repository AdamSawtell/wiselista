import { getPortalLabel } from "@/lib/enhancement";
import { formatJobDateShort } from "@/lib/jobs";

type Props = {
  photoCount: number;
  targetPortal: string | null;
  propertyAddress: string | null;
  expiresAt: string | null;
};

export function JobReadyBanner({ photoCount, targetPortal, propertyAddress, expiresAt }: Props) {
  const portal = getPortalLabel(targetPortal);

  return (
    <div className="mb-6 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
      <p className="font-medium">
        {photoCount} photo{photoCount === 1 ? "" : "s"} enhanced and ready to download
      </p>
      <p className="mt-0.5 text-emerald-800/90">
        {propertyAddress && <span>{propertyAddress}</span>}
        {propertyAddress && portal && <span className="mx-1.5 text-emerald-600/60">·</span>}
        {portal ? (
          <span>Upload to {portal}</span>
        ) : (
          !propertyAddress && "Add a target portal in project setup if you like"
        )}
        {expiresAt && (
          <>
            <span className="mx-1.5 text-emerald-600/60">·</span>
            <span>Available until {formatJobDateShort(expiresAt)}</span>
          </>
        )}
      </p>
    </div>
  );
}
