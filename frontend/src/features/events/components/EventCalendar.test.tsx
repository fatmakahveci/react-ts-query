import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import EventCalendar from "./EventCalendar";
import { localDate } from "../lib/discovery";

test("an invalid selected date leaves the calendar navigable", () => {
  render(<EventCalendar events={[]} selected="2030-99-40" onSelect={vi.fn()} />);
  expect(screen.getByLabelText("Calendar month")).toHaveValue(localDate(new Date()).slice(0, 7));
  fireEvent.change(screen.getByLabelText("Calendar month"), { target: { value: "2032-02" } });
  expect(screen.getByRole("button", { name: "2032-02-29, 0 events" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByLabelText("Calendar month")).toHaveValue("2032-03");
});

test("a changed selection follows browser navigation; clearing it keeps the browsed month", () => {
  const select = vi.fn();
  const { rerender } = render(
    <EventCalendar events={[]} selected="2030-06-15" onSelect={select} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByLabelText("Calendar month")).toHaveValue("2030-07");
  rerender(<EventCalendar events={[]} selected="2030-05-12" onSelect={select} />);
  expect(screen.getByLabelText("Calendar month")).toHaveValue("2030-05");
  expect(screen.getByRole("button", { name: "2030-05-12, 0 events" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "2030-05-12, 0 events" }));
  expect(select).toHaveBeenCalledWith("");
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  rerender(<EventCalendar events={[]} selected="2030-05-13" onSelect={select} />);
  expect(screen.getByLabelText("Calendar month")).toHaveValue("2030-05");
  rerender(<EventCalendar events={[]} selected="" onSelect={select} />);
  expect(screen.getByLabelText("Calendar month")).toHaveValue("2030-05");
});

test("calendar navigation stays inside supported year boundaries", () => {
  render(<EventCalendar events={[]} selected="0001-01-01" onSelect={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "0001-01-31, 0 events" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Calendar month"), { target: { value: "9999-12" } });
  expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "9999-12-31, 0 events" })).toBeInTheDocument();
});
