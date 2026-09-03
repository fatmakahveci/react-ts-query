import { fetchEvents } from "./http";
import { vi } from "vitest";

test("fetches and returns filtered events", async () => {
  const events = [{ id: "e1", title: "Conference" }];
  const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ events }),
  } as Response);

  await expect(fetchEvents("react")).resolves.toEqual(events);
  expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/events?search=react");
});

test("throws when the events endpoint fails", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    json: async () => "Service unavailable",
  } as Response);

  await expect(fetchEvents("")).rejects.toThrow("Service unavailable");
});
