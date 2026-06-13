import { Platform, Linking, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { APP_URL } from "./supabase";

function baseUrl(): string {
  return (APP_URL || "https://wiselista.com").replace(/\/$/, "");
}

async function shareLocalFile(uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.open(uri, "_blank");
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType });
  } else {
    Alert.alert("Download ready", "Sharing is not available on this device.");
  }
}

/** Download edited photos ZIP via API and open share sheet (native) or browser download (web). */
export async function downloadJobZip(
  jobId: string,
  accessToken: string,
  displayName?: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `${baseUrl()}/api/jobs/${jobId}/download-zip`;
  const safeName = (displayName ?? "property").replace(/[^\w\-]+/g, "-").slice(0, 40);

  try {
    if (Platform.OS === "web") {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: (data as { error?: string }).error ?? `Error ${res.status}` };
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (typeof document !== "undefined") {
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = `wiselista-${safeName}.zip`;
        anchor.click();
      }
      URL.revokeObjectURL(blobUrl);
      return { ok: true };
    }

    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) return { ok: false, error: "Storage unavailable" };

    const fileUri = `${dir}wiselista-${safeName}-${jobId.slice(0, 8)}.zip`;
    const result = await FileSystem.downloadAsync(url, fileUri, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (result.status !== 200) {
      return { ok: false, error: `Download failed (${result.status})` };
    }
    await shareLocalFile(result.uri, "application/zip");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download failed" };
  }
}

/** Download a single photo URL and share / save. */
export async function downloadPhoto(url: string, filename: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (Platform.OS === "web") {
      await Linking.openURL(url);
      return { ok: true };
    }
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) return { ok: false, error: "Storage unavailable" };
    const fileUri = `${dir}${filename}`;
    const result = await FileSystem.downloadAsync(url, fileUri);
    if (result.status !== 200) {
      return { ok: false, error: `Download failed (${result.status})` };
    }
    await shareLocalFile(result.uri, "image/jpeg");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download failed" };
  }
}
