export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
let adminToken: string | null = null;

// Credentials live only in this tab's memory, never in browser storage or URLs.
export function setAdminToken(token: string | null) {
  adminToken = token;
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const method = (options?.method || "GET").toUpperCase();
  if (adminToken && !["GET", "HEAD"].includes(method)) {
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${adminToken}`);
  }
  if (headers.has("Authorization")) {
    const destination = new URL(`${API_BASE_URL}${path}`, window.location.origin);
    const isSecureOrLocal = (url: URL) =>
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
    // Protect the page where the key is entered as well as the API receiving it.
    if (!isSecureOrLocal(destination) || !isSecureOrLocal(new URL(window.location.origin))) {
      throw new Error("Administrator access requires HTTPS or a local server.");
    }
  }
  // Keep authenticated calls on the checked destination and avoid sending ambient cookies.
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    headers.has("Authorization")
      ? { ...options, headers, redirect: "error", credentials: "omit" }
      : options,
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // A delayed failure for an old key must not sign out a newer session.
    if (
      response.status === 401 &&
      adminToken &&
      headers.get("Authorization") === `Bearer ${adminToken}`
    ) {
      setAdminToken(null);
      window.dispatchEvent(new Event("admin-access-expired"));
    }
    throw new Error(
      typeof payload === "string"
        ? payload
        : payload?.message || "Unable to complete your request. Please try again.",
    );
  }
  if (payload === null) throw new Error("The server returned an invalid response.");
  return payload as T;
}
