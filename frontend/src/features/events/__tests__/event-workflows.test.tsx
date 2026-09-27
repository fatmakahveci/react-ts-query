import { AdminProvider } from "../../auth/AdminAccess";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { EventType } from "../event.types";
import CreateEventPage from "../pages/CreateEventPage";
import EditEventPage from "../pages/EditEventPage";
import EventDetailsPage from "../pages/EventDetailsPage";
import { eventDetailQuery } from "../api/events.queries";

const adminKey = "test_" + "a".repeat(43);

const initialEvent: EventType = {
  id: "e1",
  title: "Community meetup",
  description: "Meet your neighbours",
  date: "2030-05-15",
  time: "18:00",
  location: "London",
  image: "park.jpg",
};
let saved: EventType;
let rejectWrite: boolean;
let deleted: boolean;
let client: QueryClient;

beforeEach(() => {
  saved = { ...initialEvent };
  rejectWrite = false;
  deleted = false;
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    let payload: unknown;
    let ok = true;
    if (url.endsWith("/auth/verify"))
      return { ok: true, json: async () => ({ authenticated: true }) } as Response;
    if (init?.method && ["POST", "PUT", "DELETE"].includes(init.method)) {
      expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${adminKey}`);
    }
    if (url.endsWith("/events/images"))
      payload = { images: [{ path: "park.jpg", caption: "A green park" }] };
    else if (init?.method === "DELETE") {
      ok = !rejectWrite;
      deleted = !rejectWrite;
      payload = { message: rejectWrite ? "Please try again later" : "Event deleted" };
    } else if (init?.method === "POST" || init?.method === "PUT") {
      if (rejectWrite) {
        ok = false;
        payload = { message: "Please try again later" };
      } else {
        saved = { ...JSON.parse(String(init.body)).event, id: "e1" };
        payload = { event: saved };
      }
    } else if (url.endsWith("/events")) payload = { events: [saved] };
    else payload = { event: saved };
    return { ok, json: async () => payload } as Response;
  });
});

async function setup(path: string) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/events", element: <h1>All events</h1> },
      { path: "/events/new", element: <CreateEventPage /> },
      {
        path: "/events/:id",
        element: <EventDetailsPage />,
        children: [{ path: "edit", element: <EditEventPage /> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <AdminProvider>
        <RouterProvider router={router} />
      </AdminProvider>
    </QueryClientProvider>,
  );
  if (!screen.queryByLabelText("Administrator access key"))
    fireEvent.click(await screen.findByRole("button", { name: "Admin sign in" }));
  fireEvent.change(await screen.findByLabelText("Administrator access key"), {
    target: { value: adminKey },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(screen.queryByLabelText("Administrator access key")).not.toBeInTheDocument(),
  );
  return router;
}
async function completeForm() {
  fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "New gathering" } });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "A welcoming community" },
  });
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2030-06-01" } });
  fireEvent.change(screen.getByLabelText("Local time"), { target: { value: "19:00" } });
  fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Bristol" } });
  fireEvent.click(await screen.findByRole("radio", { name: "A green park" }));
}

test("creates an event, closes the dialog and navigates to saved details", async () => {
  const router = await setup("/events/new");
  expect(screen.getByRole("dialog", { name: "Create an event" })).toBeInTheDocument();
  await completeForm();
  fireEvent.click(screen.getByRole("button", { name: "Create event" }));
  expect(await screen.findByRole("heading", { name: "New gathering" })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/events/e1");
  expect(saved.location).toBe("Bristol");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
});

test("prefills edit fields and refreshes details after saving", async () => {
  await setup("/events/e1/edit");
  expect(await screen.findByLabelText("Event title")).toHaveValue(initialEvent.title);
  await screen.findByRole("radio");
  fireEvent.change(screen.getByLabelText("Event title"), {
    target: { value: "Updated gathering" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(await screen.findByRole("heading", { name: "Updated gathering" })).toBeInTheDocument();
  expect(saved.id).toBe("e1");
});

test("saving cancels an obsolete detail read and does not wait for a slow list refresh", async () => {
  await setup("/events/e1/edit");
  await screen.findByRole("radio");
  const fetchMock = vi.mocked(fetch);
  const original = fetchMock.getMockImplementation()!;
  let finishOldRead!: (response: Response) => void;
  let oldSignal: AbortSignal | undefined;
  fetchMock.mockImplementation((input, options) => {
    if (!options?.method && String(input).endsWith("/events/e1")) {
      oldSignal = options?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        finishOldRead = resolve;
      });
    }
    if (!options?.method && String(input).endsWith("/events"))
      return new Promise<Response>(() => {});
    return original(input, options);
  });
  let refresh: Promise<unknown> = Promise.resolve();
  act(() => {
    refresh = client
      .fetchQuery({ ...eventDetailQuery("e1"), staleTime: 0 })
      .catch((error: unknown) => error);
  });
  fireEvent.change(screen.getByLabelText("Event title"), {
    target: { value: "Latest saved title" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("heading", { name: "Latest saved title" })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => {
    finishOldRead({ ok: true, json: async () => ({ event: initialEvent }) } as Response);
    await refresh;
  });
  expect(client.getQueryData(eventDetailQuery("e1").queryKey)?.title).toBe("Latest saved title");
  expect(screen.getByRole("heading", { name: "Latest saved title" })).toBeInTheDocument();
});

test("keeps entered values when creation fails and allows retry", async () => {
  rejectWrite = true;
  await setup("/events/new");
  await completeForm();
  fireEvent.click(screen.getByRole("button", { name: "Create event" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later");
  expect(screen.getByLabelText("Event title")).toHaveValue("New gathering");
  rejectWrite = false;
  fireEvent.click(screen.getByRole("button", { name: "Create event" }));
  expect(await screen.findByRole("heading", { name: "New gathering" })).toBeInTheDocument();
});

test("requires confirmation before deleting and returns to the list", async () => {
  const router = await setup("/events/e1");
  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  expect(deleted).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Keep event" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete event" }));
  expect(await screen.findByRole("heading", { name: "All events" })).toBeInTheDocument();
  expect(deleted).toBe(true);
  expect(router.state.location.pathname).toBe("/events");
});

test("escape cancels a modal and restores body scrolling", async () => {
  const router = await setup("/events/new");
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
  await waitFor(() => expect(router.state.location.pathname).toBe("/events"));
  expect(document.body.style.overflow).toBe("");
});

test("keeps unsaved edits after an update failure and applies them on retry", async () => {
  const router = await setup("/events/e1/edit");
  await completeForm();
  rejectWrite = true;
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later");
  expect(screen.getByLabelText("Event title")).toHaveValue("New gathering");
  expect(screen.getByLabelText("Location")).toHaveValue("Bristol");
  expect(router.state.location.pathname).toBe("/events/e1/edit");
  expect(saved).toEqual(initialEvent);
  rejectWrite = false;
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("heading", { name: "New gathering" })).toBeInTheDocument();
  expect(saved.location).toBe("Bristol");
});

test("keeps the event and confirmation open after a failed deletion and allows retry", async () => {
  const router = await setup("/events/e1");
  rejectWrite = true;
  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later");
  expect(screen.getByRole("dialog", { name: "Delete this event?" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: initialEvent.title })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/events/e1");
  expect(deleted).toBe(false);
  rejectWrite = false;
  fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
  expect(await screen.findByRole("heading", { name: "All events" })).toBeInTheDocument();
  expect(deleted).toBe(true);
  expect(client.getQueryData(eventDetailQuery("e1").queryKey)).toBeUndefined();
});

test.each([
  { path: "/events/new", method: "POST", submit: "Create event", pending: "Creating…" },
  { path: "/events/e1/edit", method: "PUT", submit: "Save changes", pending: "Saving…" },
])(
  "blocks duplicate saves and closing while $method is pending",
  async ({ path, method, submit, pending }) => {
    const router = await setup(path);
    await completeForm();
    const fetchMock = vi.mocked(fetch);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockClear();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fetchMock.mockImplementation(async (input, options) => {
      if (options?.method === method) await gate;
      return original(input, options);
    });
    fireEvent.click(screen.getByRole("button", { name: submit }));
    const pendingButton = await screen.findByRole("button", { name: pending });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByLabelText("Event title")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.click(pendingButton);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(router.state.location.pathname).toBe(path);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === method)).toHaveLength(
      1,
    );
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "New gathering" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/events/e1");
  },
);

test("blocks duplicate deletion and keeps its dialog open until the server responds", async () => {
  const router = await setup("/events/e1");
  const fetchMock = vi.mocked(fetch);
  const original = fetchMock.getMockImplementation()!;
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  fetchMock.mockImplementation(async (input, options) => {
    if (options?.method === "DELETE") await gate;
    return original(input, options);
  });
  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
  const pending = await screen.findByRole("button", { name: "Deleting…" });
  expect(pending).toBeDisabled();
  expect(screen.getByRole("button", { name: "Keep event" })).toBeDisabled();
  fireEvent.click(pending);
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/events/e1");
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE")).toHaveLength(
    1,
  );
  await act(async () => finish());
  expect(await screen.findByRole("heading", { name: "All events" })).toBeInTheDocument();
  expect(deleted).toBe(true);
});

test("retries a failed detail request without recording an unavailable event as viewed", async () => {
  const fetchMock = vi.mocked(fetch);
  const original = fetchMock.getMockImplementation()!;
  let unavailable = true;
  fetchMock.mockImplementation(async (input, options) => {
    if (unavailable && !options?.method && String(input).endsWith("/events/e1"))
      return {
        ok: false,
        status: 503,
        json: async () => ({ message: "Temporarily unavailable" }),
      } as Response;
    return original(input, options);
  });
  await setup("/events/e1");
  expect(await screen.findByRole("alert")).toHaveTextContent("Temporarily unavailable");
  expect(localStorage.getItem("react-events:visitor:viewed")).toBeNull();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  unavailable = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("heading", { name: initialEvent.title })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("react-events:visitor:viewed")!)).toEqual(["e1"]);
});
