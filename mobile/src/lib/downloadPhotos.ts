import { Platform, Linking, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { APP_URL } from "./supabase";

function baseUrl(): string {
  return (APP_URL || "https://wiselista.com").replace(/\/$/, "");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ensurePhotoLibraryPermission(): Promise<boolean> {
  const { status: existing } = await MediaLibrary.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
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

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // not JSON
  }
  return `Error ${res.status}`;
}

export type DownloadResult = {
  ok: boolean;
  error?: string;
  savedToPhotos?: boolean;
};

/** Download edited photos ZIP via API; opens share sheet on native. */
export async function downloadJobZip(
  jobId: string,
  accessToken: string,
  displayName?: string
): Promise<DownloadResult> {
  const url = `${baseUrl()}/api/jobs/${jobId}/download-zip`;
  const safeName = (displayName ?? "property").replace(/[^\w\-]+/g, "-").slice(0, 40);

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      return { ok: false, error: await parseApiError(res) };
    }

    if (Platform.OS === "web") {
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
    const buffer = await res.arrayBuffer();
    await FileSystem.writeAsStringAsync(fileUri, arrayBufferToBase64(buffer), {
      encoding: FileSystem.EncodingType.Base64,
    });
    await shareLocalFile(fileUri, "application/zip");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download failed" };
  }
}

/** Download a single photo and save to camera roll (native) or download (web). */
export async function downloadPhoto(url: string, filename: string): Promise<DownloadResult> {
  try {
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.click();
        return { ok: true };
      }
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

    const permitted = await ensurePhotoLibraryPermission();
    if (permitted) {
      await MediaLibrary.saveToLibraryAsync(result.uri);
      return { ok: true, savedToPhotos: true };
    }

    await shareLocalFile(result.uri, "image/jpeg");
    return { ok: true, savedToPhotos: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download failed" };
  }
}
