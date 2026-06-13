import { getPortalLabel } from "@/lib/enhancement";

type ListingReadyChecklistProps = {
  photoCount: number;
  editedCount: number;
  targetPortal: string | null;
  propertyAddress: string | null;
};

export function ListingReadyChecklist({
  photoCount,
  editedCount,
  targetPortal,
  propertyAddress,
}: ListingReadyChecklistProps) {
  const portal = getPortalLabel(targetPortal);
  const allEdited = editedCount === photoCount && photoCount > 0;

  const items = [
    { done: allEdited, label: `${editedCount} of ${photoCount} photos enhanced` },
    { done: allEdited, label: "Downloads and ZIP export available" },
    {
      done: Boolean(portal || propertyAddress),
      label: portal
        ? `Ready to upload to ${portal}`
        : "Add a target portal below for tailored next steps",
    },
  ];

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-5">
      <h2 className="font-semibold text-sky-900">Listing-ready checklist</h2>
      {propertyAddress && (
        <p className="mt-1 text-sm text-sky-800">Photos for {propertyAddress}</p>
      )}
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm text-slate-700">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                item.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}
              aria-hidden
            >
              {item.done ? "✓" : "·"}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
