import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import { fetchEvents } from "../api/events.api";
import { EventType } from "../event.types";
import EventSearchSection from "../components/EventSearchSection";
import EventActions from "../components/EventActions";
import SaveEventButton from "../components/SaveEventButton";
import GettingStarted from "../components/GettingStarted";
import { EventSpotlight, RecentlyViewed, RelatedEvents } from "../components/DiscoveryHighlights";
import EventCollectionPage from "../pages/EventCollectionPage";
import { AdminProvider } from "../../auth/AdminAccess";
import ThemePicker from "../../../components/layout/ThemePicker";
import Toast from "../../../components/ui/Toast";
import { setPreference, updateVisitorList } from "../../../lib/visitor-preferences";

vi.mock("../api/events.api", async (original) => ({
  ...(await original<typeof import("../api/events.api")>()),
  fetchEvents: vi.fn(),
}));
const fetchMock = vi.mocked(fetchEvents);
const event: EventType = {
  id: "future",
  title: "Creative coding club",
  description: "Learn with your neighbours",
  date: "2099-06-15",
  time: "18:00",
  location: "London",
  image: "park.jpg",
  category: "Workshops",
};
const outdoor: EventType = {
  ...event,
  id: "outdoor",
  title: "A day outdoors",
  location: "Bristol",
  category: "Outdoors",
  date: "2099-06-16",
};
const past: EventType = { ...event, id: "past", title: "Community archive", date: "2020-02-01" };
function setup(node: ReactNode, entry = "/events") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminProvider>
        <MemoryRouter initialEntries={[entry]}>{node}</MemoryRouter>
      </AdminProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue([event, outdoor, past]);
});
afterEach(() => vi.unstubAllGlobals());

test("invalid shared filters leave the calendar and event results usable", async () => {
  setPreference("view", "calendar");
  setup(<EventSearchSection />, "/events?day=not-a-date&category=Unknown&when=never&sort=invalid");
  expect(await screen.findByRole("heading", { name: event.title })).toBeInTheDocument();
  expect(screen.getByLabelText("Category")).toHaveValue("");
  expect(screen.getByLabelText("When")).toHaveValue("");
  expect(screen.getByLabelText("Sort by")).toHaveValue("");
  expect(screen.getByLabelText("Calendar month")).not.toHaveValue("");
  expect(screen.queryByRole("button", { name: /Reset filters/ })).not.toBeInTheDocument();
});

test("combines filters, sorts results, resets and persists the list view", async () => {
  setup(<EventSearchSection />);
  await screen.findByRole("heading", { name: event.title });
  fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "title" } });
  expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(outdoor.title);
  fireEvent.change(screen.getByLabelText("When"), { target: { value: "upcoming" } });
  expect(screen.queryByRole("heading", { name: past.title })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Workshops" } });
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Location"), { target: { value: "London" } });
  fireEvent.click(screen.getByRole("button", { name: "List" }));
  expect(localStorage.getItem("react-events:visitor:view")).toBe("list");
  fireEvent.click(screen.getByRole("button", { name: /Reset filters/ }));
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
});

test("keeps category filters when searching and supports recent searches and keyboard focus", async () => {
  setup(<EventSearchSection />, "/events?category=Workshops");
  await screen.findByRole("heading", { name: event.title });
  fireEvent.keyDown(window, { key: "/" });
  expect(screen.getByRole("searchbox")).toHaveFocus();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "coding" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("coding", expect.any(AbortSignal)));
  expect(screen.getByLabelText("Category")).toHaveValue("Workshops");
  fireEvent.click(screen.getByRole("button", { name: "coding" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear recent searches" }));
  expect(screen.queryByRole("button", { name: "coding" })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("searchbox"), { key: "/" });
  fireEvent.keyDown(window, { key: "/", ctrlKey: true });
});

test("calendar selects an exact date and resets it without losing events", async () => {
  setup(<EventSearchSection />);
  await screen.findByRole("heading", { name: event.title });
  fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
  fireEvent.change(screen.getByLabelText("Calendar month"), { target: { value: "2099-06" } });
  fireEvent.click(screen.getByRole("button", { name: "2099-06-15, 1 event" }));
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
  expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Clear selected date/ }));
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByLabelText("Calendar month")).toHaveValue("2099-07");
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  fireEvent.click(screen.getByRole("button", { name: "This month" }));
  expect(screen.getByLabelText("Calendar month")).not.toHaveValue("2099-06");
});

test("saves across components, survives remount and allows undo", () => {
  const first = setup(
    <>
      <SaveEventButton event={event} />
      <Toast />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: `Save ${event.title}` }));
  expect(screen.getByRole("button", { name: `Unsave ${event.title}` })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  first.unmount();
  setup(
    <>
      <SaveEventButton event={event} />
      <Toast />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: `Unsave ${event.title}` }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("button", { name: `Unsave ${event.title}` })).toBeInTheDocument();
});

test("adds a personal plan, removes it with undo and blocks planning past events", () => {
  setup(
    <>
      <EventActions event={event} />
      <EventActions event={past} />
      <Toast />
    </>,
  );
  expect(screen.getByRole("button", { name: "Past event" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Add to my plan" }));
  expect(JSON.parse(localStorage.getItem("react-events:visitor:plan")!)).toEqual([event.id]);
  fireEvent.click(screen.getByRole("button", { name: "Remove from plan" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("button", { name: "Remove from plan" })).toBeInTheDocument();
});

test("copies a share link and offers selectable text if clipboard permission is denied", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  setup(
    <>
      <EventActions event={event} />
      <Toast />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Share event ↗" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/events/future`),
  );
  writeText.mockRejectedValue(new Error("Permission denied"));
  fireEvent.click(screen.getByRole("button", { name: "Share event ↗" }));
  expect(await screen.findByLabelText("Copy this event link")).toHaveValue(
    `${window.location.origin}/events/future`,
  );
  fireEvent.focus(screen.getByLabelText("Copy this event link"));
  vi.unstubAllGlobals();
});

test("uses native share and ignores cancellation", async () => {
  const share = vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError"));
  vi.stubGlobal("navigator", { share });
  setup(<EventActions event={event} />);
  fireEvent.click(screen.getByRole("button", { name: "Share event ↗" }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  expect(screen.queryByLabelText("Copy this event link")).not.toBeInTheDocument();
  vi.unstubAllGlobals();
});

test("shares through the native sheet and falls back to copying when sharing fails", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { share, clipboard: { writeText } });
  setup(
    <>
      <EventActions event={event} />
      <Toast />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Share event ↗" }));
  await waitFor(() =>
    expect(share).toHaveBeenCalledWith({
      title: event.title,
      text: "Discover this event on React Events",
      url: `${window.location.origin}/events/future`,
    }),
  );
  expect(writeText).not.toHaveBeenCalled();
  share.mockRejectedValueOnce(new Error("Share service unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Share event ↗" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/events/future`),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Event link copied");
  expect(screen.queryByLabelText("Copy this event link")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test.each(["saved", "plan"] as const)(
  "preserves the %s collection during an API outage and reloads it on retry",
  async (kind) => {
    updateVisitorList(kind, event.id, true);
    fetchMock.mockRejectedValueOnce(new Error("Service unavailable"));
    setup(<EventCollectionPage kind={kind} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    expect(
      screen.queryByRole("button", { name: "Remove unavailable events" }),
    ).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(`react-events:visitor:${kind}`)!)).toEqual([event.id]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: event.title })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(`react-events:visitor:${kind}`)!)).toEqual([event.id]);
  },
);

test("follows operating-system theme changes only when the system preference is selected", () => {
  const media = new EventTarget();
  Object.assign(media, { matches: false });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  const changeSystemTheme = (dark: boolean) =>
    act(() => {
      Object.assign(media, { matches: dark });
      media.dispatchEvent(new Event("change"));
    });
  setup(<ThemePicker />);
  expect(screen.getByLabelText("Color theme")).toHaveValue("system");
  expect(document.documentElement.dataset.theme).toBe("light");
  changeSystemTheme(true);
  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.change(screen.getByLabelText("Color theme"), { target: { value: "light" } });
  changeSystemTheme(false);
  changeSystemTheme(true);
  expect(document.documentElement.dataset.theme).toBe("light");
  fireEvent.change(screen.getByLabelText("Color theme"), { target: { value: "system" } });
  expect(document.documentElement.dataset.theme).toBe("dark");
  changeSystemTheme(false);
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("collections show saved events and let users remove unavailable records", async () => {
  updateVisitorList("saved", event.id, true);
  updateVisitorList("saved", "deleted", true);
  setup(<EventCollectionPage kind="saved" />);
  expect(await screen.findByRole("heading", { name: event.title })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: outdoor.title })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove unavailable events" }));
  expect(JSON.parse(localStorage.getItem("react-events:visitor:saved")!)).toEqual([event.id]);
  fireEvent.click(screen.getByRole("button", { name: `Unsave ${event.title}` }));
  expect(screen.getByRole("heading", { name: "Keep a little inspiration" })).toBeInTheDocument();
});

test("personal plan collection removes an event without removing its favourite", async () => {
  updateVisitorList("saved", event.id, true);
  updateVisitorList("plan", event.id, true);
  setup(
    <>
      <EventCollectionPage kind="plan" />
      <Toast />
    </>,
  );
  await screen.findByRole("heading", { name: event.title });
  fireEvent.click(screen.getByRole("button", { name: `Remove ${event.title} from plan` }));
  expect(screen.getByRole("heading", { name: "Your next adventure is open" })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("react-events:visitor:saved")!)).toEqual([event.id]);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
});

test("theme and onboarding choices persist and can be changed again", () => {
  const first = setup(
    <>
      <ThemePicker />
      <GettingStarted />
    </>,
  );
  fireEvent.change(screen.getByLabelText("Color theme"), { target: { value: "dark" } });
  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss getting started" }));
  first.unmount();
  setup(
    <>
      <ThemePicker />
      <GettingStarted />
    </>,
  );
  expect(screen.getByLabelText("Color theme")).toHaveValue("dark");
  expect(
    screen.queryByRole("heading", { name: "Your next good story starts here." }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "How it works ↗" }));
  expect(
    screen.getByRole("heading", { name: "Your next good story starts here." }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Color theme"), { target: { value: "light" } });
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("spotlight selects the next upcoming event and labels an archive honestly", async () => {
  const first = setup(<EventSpotlight />);
  expect(await screen.findByRole("heading", { name: event.title })).toBeInTheDocument();
  expect(screen.getByText("Coming up next")).toBeInTheDocument();
  first.unmount();
  fetchMock.mockResolvedValue([past]);
  setup(<EventSpotlight />);
  expect(await screen.findByText("From the community archive")).toBeInTheDocument();
});

test("recently viewed follows visit order and related events exclude the current event", async () => {
  updateVisitorList("viewed", outdoor.id, true);
  updateVisitorList("viewed", event.id, true);
  setup(
    <>
      <RecentlyViewed />
      <RelatedEvents event={event} />
    </>,
  );
  const recent = await screen.findByRole("region", { name: "Recently viewed" });
  await within(recent).findByRole("heading", { name: event.title });
  expect(within(recent).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(event.title);
  const related = screen.getByRole("region", { name: "More in your world" });
  expect(within(related).getByRole("heading", { name: past.title })).toBeInTheDocument();
  expect(within(related).queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
});

test("ignores corrupted saved data and reacts to changes from another tab", () => {
  localStorage.setItem("react-events:visitor:saved", "not-json");
  setup(<SaveEventButton event={event} />);
  expect(screen.getByRole("button", { name: `Save ${event.title}` })).toBeInTheDocument();
  act(() => {
    localStorage.setItem(
      "react-events:visitor:saved",
      JSON.stringify([event.id, null, 4, event.id]),
    );
    window.dispatchEvent(new Event("storage"));
  });
  expect(screen.getByRole("button", { name: `Unsave ${event.title}` })).toBeInTheDocument();
  act(() => setPreference("saved", JSON.stringify({ invalid: true })));
  expect(screen.getByRole("button", { name: `Save ${event.title}` })).toBeInTheDocument();
});

test("keeps preferences usable in memory if browser storage is blocked", () => {
  vi.spyOn(localStorage, "getItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  setup(<SaveEventButton event={{ ...event, id: "memory-only" }} />);
  fireEvent.click(screen.getByRole("button", { name: `Save ${event.title}` }));
  expect(screen.getByRole("button", { name: `Unsave ${event.title}` })).toBeInTheDocument();
});
