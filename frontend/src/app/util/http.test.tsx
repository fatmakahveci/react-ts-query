import { fetchEvents } from "./http";

test("fetches and returns filtered events", async () => {
  const events = [{ id: "e1", title: "Conference" }];
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ events }),
  } as Response);

  await expect(fetchEvents("react")).resolves.toEqual(events);
  expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/events?search=react");

  fetchMock.mockRestore();
});

test("throws when the events endpoint fails", async () => {
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    json: async () => "Service unavailable",
  } as Response);

  await expect(fetchEvents("")).rejects.toThrow("Service unavailable");

  fetchMock.mockRestore();
});
