import {
  fetchEvents,
  fetchEvent,
  fetchImages,
  saveEvent,
  deleteEvent,
  imageUrl,
} from "./events.api";
import { vi } from "vitest";

test("fetches and returns filtered events", async () => {
  const events = [{ id: "e1", title: "Conference" }];
  const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ events }),
  } as Response);

  await expect(fetchEvents("react")).resolves.toEqual(events);
  expect(fetchMock).toHaveBeenCalledWith("/api/events?search=react", { signal: undefined });
});

test("throws when the events endpoint fails", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    json: async () => "Service unavailable",
  } as Response);

  await expect(fetchEvents("")).rejects.toThrow("Service unavailable");
});

test("encodes search terms before sending them to the API", async () => {
  const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ events: [] }),
  } as Response);

  await fetchEvents("react & typescript");

  expect(fetchMock).toHaveBeenCalledWith("/api/events?search=react%20%26%20typescript", {
    signal: undefined,
  });
});

test("uses structured API error messages", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    json: async () => ({ message: "API unavailable" }),
  } as Response);

  await expect(fetchEvents("")).rejects.toThrow("API unavailable");
});

const eventInput = {
  title: "Meetup",
  description: "Community",
  date: "2030-01-01",
  time: "12:00",
  image: "park.jpg",
  location: "London",
};
test("loads details and images and creates, updates and deletes events", async () => {
  const event = { ...eventInput, id: "e1" };
  const mock = vi
    .spyOn(global, "fetch")
    .mockResolvedValue({ ok: true, json: async () => ({ event, images: [] }) } as Response);
  await expect(fetchEvent("e1")).resolves.toEqual(event);
  await expect(fetchImages()).resolves.toEqual([]);
  await expect(saveEvent(eventInput)).resolves.toEqual(event);
  expect(mock).toHaveBeenLastCalledWith(
    "/api/events",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ event: eventInput }) }),
  );
  await saveEvent(eventInput, "e1");
  expect(mock).toHaveBeenLastCalledWith(
    "/api/events/e1",
    expect.objectContaining({ method: "PUT" }),
  );
  await deleteEvent("e1");
  expect(mock).toHaveBeenLastCalledWith("/api/events/e1", { method: "DELETE" });
  expect(imageUrl("park.jpg")).toBe("/api/park.jpg");
});
test("handles non-JSON failures and malformed successful responses", async () => {
  const mock = vi.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    json: async () => {
      throw new Error("HTML");
    },
  } as unknown as Response);
  await expect(fetchEvents("")).rejects.toThrow("Unable to complete your request");
  mock.mockResolvedValue({ ok: true, json: async () => null } as Response);
  await expect(fetchEvents("")).rejects.toThrow("invalid response");
});
