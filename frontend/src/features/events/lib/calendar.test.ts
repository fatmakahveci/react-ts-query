import { expect, test, vi } from "vitest";
import { calendarFile, downloadCalendar } from "./calendar";
import { EventType } from "../event.types";
const event: EventType = {
  id: "hello/world",
  title: "Friends, food; fun",
  date: "2030-06-15",
  time: "18:30",
  description: "First line\nBEGIN:VALARM\n" + "Ş".repeat(90) + "\\test",
  location: "London",
  image: "park.jpg",
};
test("exports local calendar time, escapes text and folds lines at 75 UTF-8 bytes", () => {
  const result = calendarFile(event, "https://events.example", new Date("2030-01-01T12:00:00Z"));
  expect(result).toContain("DTSTART:20300615T183000\r\n");
  expect(result).toContain("DTSTAMP:20300101T120000Z");
  expect(result).toContain("SUMMARY:Friends\\, food\\; fun");
  expect(result).toContain("URL:https://events.example/events/hello%2Fworld");
  expect(result).not.toContain("\r\nBEGIN:VALARM");
  expect(result).not.toContain("DTEND");
  for (const line of result.split("\r\n"))
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  expect(result.replace(/\r\n /g, "")).toContain("Ş".repeat(90) + "\\\\test");
});
test("downloads a calendar file and revokes its temporary URL", () => {
  vi.useFakeTimers();
  const create = vi.fn().mockReturnValue("blob:calendar");
  const revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  downloadCalendar(event);
  expect(create).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledOnce();
  expect(document.querySelector("a[download]")).toBeNull();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledWith("blob:calendar");
  vi.useRealTimers();
});
