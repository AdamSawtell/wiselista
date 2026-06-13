export const PROFILE_TYPES = ["agent", "individual"] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  agent: "Real estate agent",
  individual: "Individual (landlord, owner, etc.)",
};

export type AgentProfile = {
  id: string;
  profile_type: ProfileType;
  full_name: string;
  business_name: string;
  role_title: string | null;
  phone: string | null;
  business_url: string | null;
  linkedin_url: string | null;
  license_number: string | null;
  business_address: string | null;
  photo_key: string | null;
  share_profile_photo_url: string | null;
  updated_at?: string;
};

export type AgentProfileInput = {
  profile_type: ProfileType;
  full_name: string;
  business_name?: string;
  role_title?: string | null;
  phone?: string | null;
  business_url?: string | null;
  linkedin_url?: string | null;
  license_number?: string | null;
  business_address?: string | null;
};

export type ShareAgentInfo = {
  profileType: ProfileType;
  name: string;
  email: string | null;
  businessName: string | null;
  roleTitle: string | null;
  phone: string | null;
  businessUrl: string | null;
  linkedinUrl: string | null;
  licenseNumber: string | null;
  businessAddress: string | null;
  photoUrl: string | null;
};

export const PROFILE_FIELD_LABELS = {
  profile_type: "Profile type",
  full_name: "Your name",
  business_name: "Agency or business name",
  role_title: "Role or title",
  phone: "Phone number",
  business_url: "Agency website",
  linkedin_url: "LinkedIn profile",
  license_number: "Real estate licence number",
  business_address: "Office address",
  photo: "Profile photo",
} as const;

export const PROFILE_PHOTO_SIGNED_EXPIRY = 60 * 60 * 24 * 7;

export function isAgentProfile(profileType: ProfileType | string | null | undefined): boolean {
  return profileType !== "individual";
}

export function normalizeExternalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** @deprecated Use normalizeExternalUrl */
export const normalizeBusinessUrl = normalizeExternalUrl;

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
  const profileType: ProfileType =
    profile?.profile_type === "individual" ? "individual" : "agent";
  const businessUrl = normalizeExternalUrl(profile?.business_url ?? null);
  const linkedinUrl = normalizeExternalUrl(profile?.linkedin_url ?? null);

  return {
    profileType,
    name: displayAgentName(profile ?? null, email, metadata),
    email: email ?? null,
    businessName: isAgentProfile(profileType) ? profile?.business_name?.trim() || null : null,
    roleTitle: isAgentProfile(profileType) ? profile?.role_title?.trim() || null : null,
    phone: profile?.phone?.trim() || null,
    businessUrl: isAgentProfile(profileType) ? businessUrl : null,
    linkedinUrl: isAgentProfile(profileType) ? linkedinUrl : null,
    licenseNumber: isAgentProfile(profileType) ? profile?.license_number?.trim() || null : null,
    businessAddress: isAgentProfile(profileType) ? profile?.business_address?.trim() || null : null,
    photoUrl: isAgentProfile(profileType) ? profile?.share_profile_photo_url?.trim() || null : null,
  };
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateProfileInput(input: AgentProfileInput): string | null {
  if (!input.full_name?.trim()) return "Your name is required";

  const profileType: ProfileType =
    input.profile_type === "individual" ? "individual" : "agent";

  if (isAgentProfile(profileType) && !input.business_name?.trim()) {
    return "Agency or business name is required for real estate agents";
  }

  if (isAgentProfile(profileType)) {
    const businessUrl = input.business_url?.trim();
    if (businessUrl && !isValidUrl(normalizeExternalUrl(businessUrl) ?? "")) {
      return "Enter a valid agency website link";
    }
    const linkedinUrl = input.linkedin_url?.trim();
    if (linkedinUrl && !isValidUrl(normalizeExternalUrl(linkedinUrl) ?? "")) {
      return "Enter a valid LinkedIn profile link";
    }
  }

  return null;
}

export function emptyProfileInput(): AgentProfileInput {
  return {
    profile_type: "agent",
    full_name: "",
    business_name: "",
    role_title: "",
    phone: "",
    business_url: "",
    linkedin_url: "",
    license_number: "",
    business_address: "",
  };
}

export function sanitizeProfileInput(input: AgentProfileInput): Omit<AgentProfile, "id" | "updated_at" | "photo_key" | "share_profile_photo_url"> & {
  id?: string;
} {
  const profileType: ProfileType =
    input.profile_type === "individual" ? "individual" : "agent";

  if (!isAgentProfile(profileType)) {
    return {
      profile_type: "individual",
      full_name: input.full_name.trim(),
      business_name: "",
      role_title: null,
      phone: input.phone?.trim() || null,
      business_url: null,
      linkedin_url: null,
      license_number: null,
      business_address: null,
    };
  }

  return {
    profile_type: "agent",
    full_name: input.full_name.trim(),
    business_name: input.business_name?.trim() ?? "",
    role_title: input.role_title?.trim() || null,
    phone: input.phone?.trim() || null,
    business_url: normalizeExternalUrl(input.business_url),
    linkedin_url: normalizeExternalUrl(input.linkedin_url),
    license_number: input.license_number?.trim() || null,
    business_address: input.business_address?.trim() || null,
  };
}

export function profilePhotoStorageKey(userId: string, ext: string): string {
  return `${userId}/profile/avatar.${ext}`;
}
