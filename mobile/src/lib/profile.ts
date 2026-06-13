import { supabase } from "./supabase";

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
  role_title?: string;
  phone?: string;
  business_url?: string;
  business_address?: string;
};

export function normalizeBusinessUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateProfileInput(input: AgentProfileInput): string | null {
  if (!input.full_name?.trim()) return "Your name is required";
  if (!input.business_name?.trim()) return "Agency or business name is required";
  return null;
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
    full_name: input.full_name.trim(),
    business_name: input.business_name.trim(),
    role_title: input.role_title?.trim() || null,
    phone: input.phone?.trim() || null,
    business_url: normalizeBusinessUrl(input.business_url),
    business_address: input.business_address?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("profiles").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw new Error(error.message);
  return data as AgentProfile;
}
