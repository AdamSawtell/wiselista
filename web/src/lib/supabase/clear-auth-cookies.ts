/** Remove Supabase auth cookies from the browser (e.g. after switching projects). */
export function clearSupabaseAuthCookies(onlyOtherProjects = false) {
  if (typeof document === "undefined") return;

  const currentRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/
  )?.[1];

  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name?.startsWith("sb-")) continue;
    if (onlyOtherProjects && currentRef && name.startsWith(`sb-${currentRef}-`)) continue;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    if (typeof window !== "undefined" && window.location.hostname) {
      document.cookie = `${name}=; path=/; max-age=0; domain=${window.location.hostname}; SameSite=Lax`;
    }
  }
}
