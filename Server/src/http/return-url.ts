/**
 * Payment return URLs must match the allow-list (PAYMENT_RETURN_ALLOW):
 * "khelspot://" allows any URL with that scheme; "http://localhost:3000" allows
 * that exact origin. Returns the URL exactly as given if allowed, otherwise null.
 */
export function allowedReturnUrl(raw: string | undefined, allow: string[]): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.hash) return null; // keeps appending ?ref=&status= unambiguous
  for (const entry of allow) {
    if (entry.endsWith("://")) {
      if (url.protocol === entry.slice(0, -2) && raw.toLowerCase().startsWith(entry.toLowerCase())) return raw;
      continue;
    }
    try {
      if (new URL(entry).origin === url.origin && url.origin !== "null") return raw;
    } catch {
      // ignore malformed allow-list entries
    }
  }
  return null;
}

/**
 * `${returnUrl}?ref=REF&status=paid|cancelled`, keeping any query already there.
 * Appended to the original text (not re-serialised) so app links like
 * khelspot://pay-result don't gain a trailing slash.
 */
export function withResult(returnUrl: string, ref: string, status: "paid" | "cancelled"): string {
  const query = new URLSearchParams({ ref, status }).toString();
  return `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}${query}`;
}
