import { APP_URL } from "./supabase";

function baseUrl(): string {
  return (APP_URL || "https://wiselista.com").replace(/\/$/, "");
}

/** Create or fetch a client share link for a ready job. */
export async function createShareLink(
  jobId: string,
  accessToken: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl()}/api/jobs/${jobId}/share`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Error ${res.status}` };
    }
    if (!data.url) return { ok: false, error: "No share URL returned" };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create share link" };
  }
}
