import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchEvents } from "../../util/http";
import FindEventSection from "./FindEventSection";
import NewEventsSection from "./NewEventsSection";

vi.mock("../../util/http", () => ({ fetchEvents: vi.fn() }));

const mockedFetchEvents = vi.mocked(fetchEvents);

const renderWithQueryClient = (element: JSX.Element) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{element}</MemoryRouter>
		</QueryClientProvider>
	);
};

beforeEach(() => {
	mockedFetchEvents.mockReset();
});

describe("NewEventsSection", () => {
	test("shows loading feedback and then renders fetched events", async () => {
		mockedFetchEvents.mockResolvedValue([
			{
				id: "event-1",
				title: "React Summit",
				description: "Community conference",
				date: "2030-06-15",
				image: "images/react.jpg",
				location: "Amsterdam",
			},
		]);

		const { container } = renderWithQueryClient(<NewEventsSection />);
		expect(container.querySelector(".lds-ring")).toBeInTheDocument();
		expect(await screen.findByRole("heading", { name: "React Summit" })).toBeInTheDocument();
		expect(mockedFetchEvents).toHaveBeenCalledWith("");
	});

	test("renders API errors", async () => {
		mockedFetchEvents.mockRejectedValue(new Error("Events are unavailable"));
		renderWithQueryClient(<NewEventsSection />);
		expect(await screen.findByText("Events are unavailable")).toBeInTheDocument();
	});
});

describe("FindEventSection", () => {
	test("uses the entered search term as part of its query", async () => {
		mockedFetchEvents.mockResolvedValue([]);
		renderWithQueryClient(<FindEventSection />);

		fireEvent.change(screen.getByRole("searchbox", { name: "Search events" }), {
			target: { value: "typescript" },
		});

		await waitFor(() => expect(mockedFetchEvents).toHaveBeenCalledWith("typescript"));
	});

	test("prevents the search form from navigating", () => {
		mockedFetchEvents.mockResolvedValue([]);
		const { container } = renderWithQueryClient(<FindEventSection />);
		const form = container.querySelector("form");
		const event = new Event("submit", { bubbles: true, cancelable: true });
		form?.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});
});
