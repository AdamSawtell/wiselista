import type { ShareAgentInfo } from "@/lib/profile";

type Props = {
  agent: ShareAgentInfo;
  completedAt: string | null;
  completedLabel?: string;
};

export function ShareAgentCard({ agent, completedAt, completedLabel }: Props) {
  const roleLine = [agent.roleTitle, agent.businessName].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-6 border-b border-wiselista-border px-6 py-6 sm:grid-cols-[1fr_auto] sm:items-start sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prepared by</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{agent.name}</p>
        {roleLine && <p className="mt-0.5 text-sm font-medium text-slate-700">{roleLine}</p>}
        {agent.businessAddress && (
          <p className="mt-1 text-sm text-slate-600">{agent.businessAddress}</p>
        )}
        <div className="mt-3 flex flex-col gap-1 text-sm text-slate-600">
          {agent.phone && (
            <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="hover:text-wiselista-accent">
              {agent.phone}
            </a>
          )}
          {agent.email && (
            <a href={`mailto:${agent.email}`} className="hover:text-wiselista-accent">
              {agent.email}
            </a>
          )}
          {agent.businessUrl && (
            <a
              href={agent.businessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-wiselista-accent hover:underline"
            >
              Visit {displayHost(agent.businessUrl)}
            </a>
          )}
        </div>
      </div>
      {completedAt && completedLabel && (
        <p className="text-sm text-slate-500 sm:text-right">{completedLabel}</p>
      )}
    </div>
  );
}

function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "business website";
  }
}
