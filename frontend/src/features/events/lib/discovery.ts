import { EventType } from "../event.types";
import { EventFilters } from "./event-filters";

export const categoryOf = (event: EventType) => event.category || "Community";
export const eventStart = (event: EventType) => new Date(`${event.date}T${event.time}`);
export const isPast = (event: EventType, now = new Date()) => eventStart(event) < now;
export function localDate(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function filterEvents(
  events: readonly EventType[],
  filters: Partial<EventFilters>,
  now = new Date(),
) {
  const weekendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // On Sunday, this weekend starts at yesterday's Saturday rather than the next one.
  weekendStart.setDate(weekendStart.getDate() + (now.getDay() === 0 ? -1 : 6 - now.getDay()));
  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendEnd.getDate() + 2);
  const filtered = events
    .map((event) => ({ event, start: eventStart(event) }))
    .filter(({ event, start }) => {
      if (filters.category && categoryOf(event) !== filters.category) return false;
      if (filters.location && event.location !== filters.location) return false;
      if (filters.day && event.date !== filters.day) return false;
      if (filters.when === "upcoming" && start < now) return false;
      if (filters.when === "past" && start >= now) return false;
      if (
        filters.when === "weekend" &&
        (start < now || start < weekendStart || start >= weekendEnd)
      )
        return false;
      if (
        filters.when === "month" &&
        (start < now ||
          start.getFullYear() !== now.getFullYear() ||
          start.getMonth() !== now.getMonth())
      )
        return false;
      return true;
    });
  if (filters.sort === "added") return filtered.reverse().map(({ event }) => event);
  if (filters.sort === "title")
    return filtered
      .sort((a, b) => a.event.title.localeCompare(b.event.title))
      .map(({ event }) => event);
  // Show upcoming events soonest first, followed by historical events newest first.
  return filtered
    .sort((a, b) => {
      const aPast = a.start < now,
        bPast = b.start < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      const difference = a.start.getTime() - b.start.getTime();
      return aPast ? -difference : difference;
    })
    .map(({ event }) => event);
}
