import { supabase } from "./supabase";

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
  role_title?: string;
  phone?: string;
  business_url?: string;
  linkedin_url?: string;
  license_number?: string;
  business_address?: string;
};

export function isAgentProfile(profileType: ProfileType | string | null | undefined): boolean {
  return profileType !== "individual";
}

export function normalizeExternalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateProfileInput(input: AgentProfileInput): string | null {
  if (!input.full_name?.trim()) return "Your name is required";
  if (isAgentProfile(input.profile_type) && !input.business_name?.trim()) {
    return "Agency or business name is required for real estate agents";
  }
  return null;
}

export function sanitizeProfileInput(input: AgentProfileInput) {
  if (!isAgentProfile(input.profile_type)) {
    return {
      profile_type: "individual" as const,
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
    profile_type: "agent" as const,
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

export async function fetchProfile(userId: string): Promise<AgentProfile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as AgentProfile | null;
}

export async function saveProfile(userId: string, input: AgentProfileInput): Promise<AgentProfile> {
  const err = validateProfileInput(input);
  if (err) throw new Error(err);

  const row = {
    id: userId,
    ...sanitizeProfileInput(input),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("profiles").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw new Error(error.message);
  return data as AgentProfile;
}
