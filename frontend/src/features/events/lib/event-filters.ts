import { EVENT_CATEGORIES, EventCategory } from "../event.types";

export const DATE_FILTERS = [
  { value: "", label: "Any date" },
  { value: "upcoming", label: "Upcoming" },
  { value: "weekend", label: "This weekend" },
  { value: "month", label: "This month" },
  { value: "past", label: "Past events" },
] as const;
export const EVENT_SORTS = [
  { value: "", label: "Date: upcoming first" },
  { value: "added", label: "Recently added" },
  { value: "title", label: "Title A–Z" },
] as const;
export type EventFilters = {
  category: EventCategory | "";
  when: (typeof DATE_FILTERS)[number]["value"];
  location: string;
  sort: (typeof EVENT_SORTS)[number]["value"];
  day: string;
};
export type SearchField = keyof EventFilters | "search";

export function isCalendarMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= "0001-01";
}

export function isEventDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isCalendarMonth(value.slice(0, 7))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Date silently normalizes impossible days; round-tripping rejects dates such as February 30.
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function optionValue<T extends string>(value: string | null, values: readonly T[]): T | "" {
  return values.find((option) => option === value) ?? "";
}

export function readEventSearch(params: URLSearchParams): { term: string; filters: EventFilters } {
  const day = params.get("day") || "";
  return {
    term: (params.get("search") || "").trim().slice(0, 200),
    filters: {
      category: optionValue(params.get("category"), EVENT_CATEGORIES),
      when: optionValue(
        params.get("when"),
        DATE_FILTERS.map((option) => option.value),
      ),
      location: (params.get("location") || "").trim().slice(0, 200),
      sort: optionValue(
        params.get("sort"),
        EVENT_SORTS.map((option) => option.value),
      ),
      day: isEventDate(day) ? day : "",
    },
  };
}

export function changeEventSearch(params: URLSearchParams, key: SearchField, value: string) {
  // Normalize our filters while preserving unrelated URL parameters, such as referral tags.
  const next = new URLSearchParams(params);
  next.set(key, value);
  const { term, filters } = readEventSearch(next);
  for (const [field, normalized] of Object.entries({ search: term, ...filters })) {
    if (normalized) next.set(field, normalized);
    else next.delete(field);
  }
  return next;
}
