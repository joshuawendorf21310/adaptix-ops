// ============================================================
// Adaptix Ops — HTTP Fetch with Timeout
// ============================================================

export interface FetchResult {
  status: number | null;
  body: string;
  error: string | null;
  timedOut: boolean;
  networkError: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "adaptix-ops/1.0 production-sweep",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    const body = await response.text();
    return {
      status: response.status,
      body,
      error: null,
      timedOut: false,
      networkError: false,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const e = err as Error;
    const isAbort = e.name === "AbortError";
    const isNetwork =
      e.message?.includes("fetch failed") ||
      e.message?.includes("ENOTFOUND") ||
      e.message?.includes("ECONNREFUSED") ||
      e.message?.includes("ETIMEDOUT") ||
      e.message?.includes("certificate") ||
      e.message?.includes("SSL");

    return {
      status: null,
      body: "",
      error: e.message ?? "Unknown fetch error",
      timedOut: isAbort,
      networkError: isNetwork || isAbort,
    };
  }
}

export function excerptBody(body: string, maxChars = 2000): string {
  if (body.length <= maxChars) return body;
  return body.slice(0, maxChars) + `\n\n[... truncated at ${maxChars} chars]`;
}
