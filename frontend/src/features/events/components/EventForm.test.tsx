import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { fetchImages } from "../api/events.api";
import type { EventInput } from "../event.types";
import EventForm from "./EventForm";

vi.mock("../api/events.api", async (original) => ({
  ...(await original<typeof import("../api/events.api")>()),
  fetchImages: vi.fn(),
}));

const images = [{ path: "park.jpg", caption: "A green park" }];
const input: EventInput = {
  title: "Community picnic",
  description: "Meet your neighbours",
  date: "2099-06-15",
  time: "12:30",
  location: "Bristol",
  image: "park.jpg",
};
const fetchMock = vi.mocked(fetchImages);

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(images);
});

function setup(inputData: EventInput = input) {
  const onSubmit = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EventForm inputData={inputData} onSubmit={onSubmit}>
        <button>Save event</button>
      </EventForm>
    </QueryClientProvider>,
  );
  return onSubmit;
}

test("waits for the image catalogue before submitting a prefilled event", async () => {
  let resolveImages!: (value: typeof images) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveImages = resolve;
      }),
  );
  const onSubmit = setup();
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).not.toHaveBeenCalled();
  await act(async () => resolveImages(images));
  expect(await screen.findByRole("radio", { name: "A green park" })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ ...input, category: "Community" });
});

test("retries an image catalogue failure without discarding entered fields", async () => {
  fetchMock.mockRejectedValueOnce(new Error("Image service unavailable"));
  const onSubmit = setup();
  expect(await screen.findByRole("alert")).toHaveTextContent("Image service unavailable");
  fireEvent.change(screen.getByLabelText("Event title"), {
    target: { value: "Picnic by the river" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("radio", { name: "A green park" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Event title")).toHaveValue("Picnic by the river");
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
    ...input,
    title: "Picnic by the river",
    category: "Community",
  });
});

test("explains an empty catalogue and prevents submitting an old cover image", async () => {
  fetchMock.mockResolvedValue([]);
  const onSubmit = setup();
  expect(await screen.findByRole("alert")).toHaveTextContent("No cover images are available");
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).not.toHaveBeenCalled();
});

test("requires a cover selection and submits trimmed fields with the chosen category", async () => {
  const onSubmit = setup({
    ...input,
    image: "",
    title: "  Community picnic  ",
    description: "  Meet your neighbours  ",
    location: "  Bristol  ",
  });
  await screen.findByRole("radio", { name: "A green park" });
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: "A green park" }));
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Outdoors" } });
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ ...input, category: "Outdoors" });
});
