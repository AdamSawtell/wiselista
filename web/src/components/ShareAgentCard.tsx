import Image from "next/image";
import type { ShareAgentInfo } from "@/lib/profile";
import { isAgentProfile } from "@/lib/profile";

type Props = {
  agent: ShareAgentInfo;
  completedAt: string | null;
  completedLabel?: string;
};

export function ShareAgentCard({ agent, completedAt, completedLabel }: Props) {
  const isAgent = isAgentProfile(agent.profileType);
  const preparedByLabel = isAgent ? "Prepared by" : "Shared by";

  const roleParts: string[] = [];
  if (agent.roleTitle) roleParts.push(agent.roleTitle);
  if (agent.businessName) roleParts.push(`at ${agent.businessName}`);
  const roleLine = roleParts.join(" ");

  return (
    <div className="border-b border-wiselista-border px-6 py-6 sm:px-8">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-start">
        {isAgent && (
          <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-md ring-2 ring-amber-300/50 sm:mx-0 sm:h-28 sm:w-28">
            {agent.photoUrl ? (
              <Image
                src={agent.photoUrl}
                alt={agent.name}
                fill
                className="object-cover"
                unoptimized
                sizes="112px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-3xl font-semibold text-slate-400">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={isAgent ? "" : "sm:col-span-2"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{preparedByLabel}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{agent.name}</p>

          {isAgent && roleLine && (
            <p className="mt-1 text-sm font-medium text-slate-700">
              {roleLine}
              {agent.licenseNumber && (
                <>
                  {" "}
                  —{" "}
                  <span className="text-slate-600" title="Real estate licence number">
                    {agent.licenseNumber}
                  </span>
                </>
              )}
            </p>
          )}

          {isAgent && agent.businessAddress && (
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
            {isAgent && agent.businessUrl && (
              <a
                href={agent.businessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-wiselista-accent hover:underline"
              >
                Visit {displayHost(agent.businessUrl)}
              </a>
            )}
            {isAgent && agent.linkedinUrl && (
              <a
                href={agent.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-wiselista-accent hover:underline"
              >
                View LinkedIn profile
              </a>
            )}
          </div>
        </div>

        {completedAt && completedLabel && (
          <p className="text-sm text-slate-500 sm:text-right">{completedLabel}</p>
        )}
      </div>
    </div>
  );
}

function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "agency website";
  }
}
