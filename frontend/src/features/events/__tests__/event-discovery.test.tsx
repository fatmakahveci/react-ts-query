import type { JSX } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchEvents } from "../api/events.api";
import EventSearchSection from "../components/EventSearchSection";

vi.mock("../api/events.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/events.api")>()),
  fetchEvents: vi.fn(),
}));

const mockedFetchEvents = vi.mocked(fetchEvents);

const renderWithQueryClient = (element: JSX.Element) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  mockedFetchEvents.mockReset();
});

describe("EventSearchSection loading states", () => {
  test("shows loading feedback and then renders fetched events", async () => {
    mockedFetchEvents.mockResolvedValue([
      {
        id: "event-1",
        title: "React Summit",
        description: "Community conference",
        date: "2030-06-15",
        time: "10:00",
        image: "images/react.jpg",
        location: "Amsterdam",
      },
    ]);

    renderWithQueryClient(<EventSearchSection />);
    expect(screen.getByRole("status", { name: "Loading events" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "React Summit" })).toBeInTheDocument();
    expect(mockedFetchEvents).toHaveBeenCalledWith("", expect.any(AbortSignal));
  });

  test("renders API errors", async () => {
    mockedFetchEvents.mockRejectedValue(new Error("Events are unavailable"));
    renderWithQueryClient(<EventSearchSection />);
    expect(await screen.findByText("Events are unavailable")).toBeInTheDocument();
  });
});

describe("EventSearchSection", () => {
  test("uses the entered search term as part of its query", async () => {
    mockedFetchEvents.mockResolvedValue([]);
    renderWithQueryClient(<EventSearchSection />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search events" }), {
      target: { value: "typescript" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(mockedFetchEvents).toHaveBeenCalledWith("typescript", expect.any(AbortSignal)),
    );
  });

  test("prevents the search form from navigating", () => {
    mockedFetchEvents.mockResolvedValue([]);
    const { container } = renderWithQueryClient(<EventSearchSection />);
    const form = container.querySelector("form");
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

test("renders search results and clears an empty search", async () => {
  mockedFetchEvents.mockImplementation(async (term) =>
    term
      ? []
      : [
          {
            id: "e1",
            title: "Community Meetup",
            date: "2030-01-01",
            time: "12:00",
            image: "park.jpg",
            description: "Meet people",
            location: "London",
          },
        ],
  );
  renderWithQueryClient(<EventSearchSection />);
  expect(await screen.findByRole("heading", { name: "Community Meetup" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "unknown" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByText("No matches just yet")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(await screen.findByRole("heading", { name: "Community Meetup" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox")).toHaveValue("");
});
test("retries a failed search", async () => {
  mockedFetchEvents.mockRejectedValueOnce(new Error("Offline")).mockResolvedValue([]);
  renderWithQueryClient(<EventSearchSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("The next gathering starts with you")).toBeInTheDocument();
});
