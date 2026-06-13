/** Shared capture coaching helpers (aligned with the mobile app). */

export function estimateBrightnessFromFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        resolve(null);
        return;
      }
      resolve(estimateBrightnessFromDataUrl(result));
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function estimateBrightnessFromDataUrl(dataUrl: string): number | null {
  const raw = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  if (!raw) return null;
  try {
    const binary = atob(raw);
    const samples: number[] = [];
    const step = Math.max(1, Math.floor(binary.length / 800));
    for (let i = 0; i < binary.length; i += step) {
      samples.push(binary.charCodeAt(i));
    }
    if (samples.length === 0) return null;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  } catch {
    return null;
  }
}

export type BrightnessStatus = "ok" | "dark" | "bright";

export function getBrightnessStatus(luma: number): BrightnessStatus {
  if (luma < 70) return "dark";
  if (luma > 200) return "bright";
  return "ok";
}

export function getBrightnessHint(status: BrightnessStatus): string | null {
  if (status === "dark") return "This looks a bit dark — turn on more lights or open curtains, then retake.";
  if (status === "bright") return "This may be too bright — avoid shooting directly into windows, then retake.";
  return null;
}
