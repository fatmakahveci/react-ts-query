import { expect, test } from "vitest";
import { changeEventSearch, isCalendarMonth, isEventDate, readEventSearch } from "./event-filters";

test("invalid URL filters fall back to usable defaults and text respects API limits", () => {
  const params = new URLSearchParams({
    category: "unknown",
    when: "yesterday",
    sort: "invalid",
    day: "2030-02-30",
    search: "  " + "a".repeat(250),
    location: "b".repeat(250),
  });
  const { term, filters } = readEventSearch(params);
  expect(term).toHaveLength(200);
  expect(filters).toEqual({ category: "", when: "", sort: "", day: "", location: "b".repeat(200) });
});

test("changing one filter preserves the others and unrelated URL parameters", () => {
  const params = new URLSearchParams(
    "search=hello&category=Workshops&day=bad&when=upcoming&source=invite",
  );
  const changed = changeEventSearch(params, "location", "  London  ");
  expect(readEventSearch(changed)).toEqual({
    term: "hello",
    filters: { category: "Workshops", when: "upcoming", location: "London", sort: "", day: "" },
  });
  expect(changed.get("source")).toBe("invite");
  expect(changed.has("day")).toBe(false);
  expect(params.get("day")).toBe("bad");
  expect(changeEventSearch(changed, "search", " ").has("search")).toBe(false);
});

test("calendar dates reject impossible days and support leap years and four-digit boundaries", () => {
  for (const date of ["0001-01-01", "0099-12-31", "2000-02-29", "2024-02-29", "9999-12-31"])
    expect(isEventDate(date)).toBe(true);
  for (const date of [
    "",
    "0000-01-01",
    "1900-02-29",
    "2030-02-29",
    "2030-04-31",
    "2030-13-01",
    "2030-01-00",
    "10000-01-01",
    "not-a-date",
  ])
    expect(isEventDate(date)).toBe(false);
  expect(isCalendarMonth("0001-01")).toBe(true);
  expect(isCalendarMonth("9999-12")).toBe(true);
  expect(isCalendarMonth("2030-00")).toBe(false);
});
