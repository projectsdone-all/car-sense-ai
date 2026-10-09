/**
 * Sharing + future SMS abstraction.
 * No SMS provider is configured, so we never claim a message was sent.
 */

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unsupported";

export async function shareText(payload: { title: string; text: string; url?: string }): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  const clipboardText = payload.url ? `${payload.text} ${payload.url}` : payload.text;
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(clipboardText);
      return "copied";
    } catch {
      return "unsupported";
    }
  }
  return "unsupported";
}

export function isSmsProviderConfigured(): boolean {
  return false;
}

/** Placeholder for a future SMS provider (Twilio/MSG91). Returns false until configured. */
export async function sendEmergencySms(_message: string, _to?: string): Promise<boolean> {
  return false;
}
