import { describe, expect, test } from "vitest";
import { filterEvents, localDate } from "./discovery";
import { EventType } from "../event.types";
const item = (id: string, date: string, time = "12:00"): EventType => ({
  id,
  date,
  time,
  title: id,
  location: "London",
  image: "park.jpg",
  description: "Hello",
});
const now = new Date(2030, 5, 14, 10); // Friday
const events = [
  item("Past", "2030-06-13"),
  item("Saturday", "2030-06-15"),
  item("Sunday", "2030-06-16"),
  item("Next month", "2030-07-01"),
];
describe("discovery filters", () => {
  test("weekend includes only remaining Saturday/Sunday events and respects Sunday boundaries", () => {
    expect(filterEvents(events, { when: "weekend" }, now).map((e) => e.id)).toEqual([
      "Saturday",
      "Sunday",
    ]);
    expect(
      filterEvents(events, { when: "weekend" }, new Date(2030, 5, 16, 10)).map((e) => e.id),
    ).toEqual(["Sunday"]);
    expect(filterEvents(events, { when: "weekend" }, new Date(2030, 5, 16, 13))).toEqual([]);
  });
  test("month, past and location filters compose without mutating source data", () => {
    expect(
      filterEvents(events, { when: "month", location: "London" }, now).map((e) => e.id),
    ).toEqual(["Saturday", "Sunday"]);
    expect(filterEvents(events, { when: "past" }, now).map((e) => e.id)).toEqual(["Past"]);
    expect(filterEvents(events, { location: "Paris" }, now)).toEqual([]);
    expect(filterEvents(events, { sort: "added" }, now)[0].id).toBe("Next month");
    expect(events[0].id).toBe("Past");
  });
  test("upcoming events sort first; history sorts newest first; unclassified events are Community", () => {
    const data = [...events, item("Older", "2029-01-01")];
    expect(filterEvents(data, { category: "Community" }, now).map((e) => e.id)).toEqual([
      "Saturday",
      "Sunday",
      "Next month",
      "Past",
      "Older",
    ]);
    expect(filterEvents(data, { category: "Culture" }, now)).toEqual([]);
    expect(localDate(new Date(2030, 0, 5, 23))).toBe("2030-01-05");
  });
});
