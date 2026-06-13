export type AgentProfile = {
  id: string;
  full_name: string;
  business_name: string;
  role_title: string | null;
  phone: string | null;
  business_url: string | null;
  business_address: string | null;
  updated_at?: string;
};

export type AgentProfileInput = {
  full_name: string;
  business_name: string;
  role_title?: string | null;
  phone?: string | null;
  business_url?: string | null;
  business_address?: string | null;
};

export type ShareAgentInfo = {
  name: string;
  email: string | null;
  businessName: string | null;
  roleTitle: string | null;
  phone: string | null;
  businessUrl: string | null;
  businessAddress: string | null;
};

export const PROFILE_FIELD_LABELS = {
  full_name: "Your name",
  business_name: "Agency or business name",
  role_title: "Role or title",
  phone: "Phone number",
  business_url: "Business website or profile link",
  business_address: "Office address",
} as const;

export function normalizeBusinessUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function displayAgentName(
  profile: Partial<AgentProfile> | null | undefined,
  email: string | null | undefined,
  metadata?: Record<string, unknown> | null
): string {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  const metaName = metadata?.full_name;
  if (typeof metaName === "string" && metaName.trim()) return metaName.trim();
  if (email) {
    const local = email.split("@")[0]?.replace(/[._]/g, " ").trim();
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "Your agent";
}

export function shareAgentFromPayload(
  email: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
  profile: Partial<AgentProfile> | null | undefined
): ShareAgentInfo {
  const businessUrl = normalizeBusinessUrl(profile?.business_url ?? null);
  return {
    name: displayAgentName(profile ?? null, email, metadata),
    email: email ?? null,
    businessName: profile?.business_name?.trim() || null,
    roleTitle: profile?.role_title?.trim() || null,
    phone: profile?.phone?.trim() || null,
    businessUrl,
    businessAddress: profile?.business_address?.trim() || null,
  };
}

export function validateProfileInput(input: AgentProfileInput): string | null {
  if (!input.full_name?.trim()) return "Your name is required";
  if (!input.business_name?.trim()) return "Agency or business name is required";
  const url = input.business_url?.trim();
  if (url && !/^https?:\/\/.+/i.test(normalizeBusinessUrl(url) ?? "")) {
    return "Enter a valid business website or profile link";
  }
  return null;
}

export function emptyProfileInput(): AgentProfileInput {
  return {
    full_name: "",
    business_name: "",
    role_title: "",
    phone: "",
    business_url: "",
    business_address: "",
  };
}
