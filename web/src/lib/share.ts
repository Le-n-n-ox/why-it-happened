// web/src/share.ts - clipboard and share helpers. Both can be blocked, so every call is guarded.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareText(text: string, url: string): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // any other failure: fall through to copying the link
    }
  }
  return (await copyText(`${text} ${url}`)) ? "copied" : "failed";
}