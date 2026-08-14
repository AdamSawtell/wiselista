/** Mobile-web capture. ImagePicker.launchCameraAsync loses the shot when iOS
 *  backgrounds the tab. A file input stays on this page. */

export function pickWebImage(mode: "camera" | "library"): Promise<File | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (mode === "camera") input.setAttribute("capture", "environment");

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      resolve(file);
    };

    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    input.addEventListener("cancel", () => finish(null));
    input.click();
  });
}

export function fileToPreviewUri(file: File): string {
  return URL.createObjectURL(file);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}
