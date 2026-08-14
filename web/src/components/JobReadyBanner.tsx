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
      {(propertyAddress || portal || expiresAt) && (
        <p className="mt-0.5 text-emerald-800/90">
          {[
            propertyAddress,
            portal ? `Upload to ${portal}` : null,
            expiresAt ? `Available until ${formatJobDateShort(expiresAt)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
