import { afterEach, expect, test, vi } from "vitest";
import { request, setAdminToken } from "./api-client";

const key = "test_" + "a".repeat(43);
afterEach(() => {
  setAdminToken(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("credentials are sent only for writes and forgotten on sign out", async () => {
  const fetchMock = vi
    .spyOn(global, "fetch")
    .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  setAdminToken(key);
  await request("/events");
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).has("Authorization")).toBe(false);
  await request("/events/e1", { method: "DELETE" });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get("Authorization")).toBe(
    `Bearer ${key}`,
  );
  setAdminToken(null);
  await request("/events/e1", { method: "DELETE" });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).has("Authorization")).toBe(false);
});

test("a rejected credential clears access before the next request", async () => {
  const fetchMock = vi
    .spyOn(global, "fetch")
    .mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Sign in again" }),
    } as Response)
    .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  const expired = vi.fn();
  window.addEventListener("admin-access-expired", expired);
  setAdminToken(key);
  await expect(request("/events/e1", { method: "DELETE" })).rejects.toThrow("Sign in again");
  expect(expired).toHaveBeenCalledOnce();
  await request("/events/e1", { method: "DELETE" });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).has("Authorization")).toBe(false);
  window.removeEventListener("admin-access-expired", expired);
});

test("a late unauthorized response for an old credential preserves the newer session", async () => {
  let finish!: (response: Response) => void;
  const fetchMock = vi
    .spyOn(global, "fetch")
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  const expired = vi.fn();
  window.addEventListener("admin-access-expired", expired);
  setAdminToken(key);
  const oldRequest = request("/events/e1", { method: "DELETE" });
  const newerKey = "test_" + "b".repeat(43);
  setAdminToken(newerKey);
  finish({
    ok: false,
    status: 401,
    json: async () => ({ message: "Old key revoked" }),
  } as Response);
  await expect(oldRequest).rejects.toThrow("Old key revoked");
  expect(expired).not.toHaveBeenCalled();
  await request("/events/e2", { method: "DELETE" });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get("Authorization")).toBe(
    `Bearer ${newerKey}`,
  );
  window.removeEventListener("admin-access-expired", expired);
});

test("lowercase read methods do not receive automatic credentials", async () => {
  const fetchMock = vi
    .spyOn(global, "fetch")
    .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  setAdminToken(key);
  for (const method of ["get", "head"]) {
    await request("/events", { method });
    expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).has("Authorization")).toBe(false);
  }
  await request("/events", { method: "post" });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get("Authorization")).toBe(
    `Bearer ${key}`,
  );
});

test("refuses to transmit administrator credentials over remote HTTP", async () => {
  vi.stubEnv("VITE_API_URL", "http://untrusted.example");
  vi.resetModules();
  const client = await import("./api-client");
  const fetchMock = vi.spyOn(global, "fetch");
  client.setAdminToken(key);
  await expect(client.request("/events", { method: "POST" })).rejects.toThrow("requires HTTPS");
  expect(fetchMock).not.toHaveBeenCalled();
  client.setAdminToken(null);
});

test("refuses administrator access from a remotely hosted HTTP page", async () => {
  vi.stubEnv("VITE_API_URL", "https://api.example.com");
  vi.stubGlobal("window", { location: { origin: "http://events.example.com" } });
  vi.resetModules();
  const client = await import("./api-client");
  const fetchMock = vi.spyOn(global, "fetch");
  client.setAdminToken(key);
  await expect(client.request("/events", { method: "POST" })).rejects.toThrow("requires HTTPS");
  expect(fetchMock).not.toHaveBeenCalled();
  client.setAdminToken(null);
});
