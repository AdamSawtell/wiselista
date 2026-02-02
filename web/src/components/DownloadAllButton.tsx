"use client";

type Item = { filename: string; url: string };

export function DownloadAllButton({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  function handleDownloadAll() {
    items.forEach(({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <button
      type="button"
      onClick={handleDownloadAll}
      className="btn-secondary text-sm"
    >
      Download all ({items.length} edited)
    </button>
  );
}
