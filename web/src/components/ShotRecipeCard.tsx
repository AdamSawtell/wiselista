import type { ShotRecipe } from "@/lib/shot-recipes";

export function ShotRecipeCard({ recipe }: { recipe: ShotRecipe }) {
  const rows: Array<[string, string]> = [
    ["Stance", recipe.stance],
    ["Lens", recipe.lensLabel],
    ["Height", recipe.height],
    ["Include", recipe.include],
    ["Hide", recipe.hide],
  ];

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-sky-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Shot recipe</p>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
      {recipe.orientation === "landscape" ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Rotate your phone sideways (landscape) for this shot. Use 1×, not ultra-wide.
        </p>
      ) : null}
    </div>
  );
}
