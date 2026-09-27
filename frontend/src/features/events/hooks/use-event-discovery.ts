import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { updateVisitorList, usePreference, useVisitorList } from "../../../lib/visitor-preferences";
import { eventListQuery } from "../api/events.queries";
import { filterEvents } from "../lib/discovery";
import { changeEventSearch, readEventSearch, SearchField } from "../lib/event-filters";

export default function useEventDiscovery() {
  const [params, setParams] = useSearchParams();
  const { term, filters } = readEventSearch(params);
  const query = useQuery(eventListQuery(term));
  const recentSearches = useVisitorList("searches");
  const storedView = usePreference("view", "grid");
  const view = storedView === "list" || storedView === "calendar" ? storedView : "grid";
  // Sort and apply shared filters once; a day selection only narrows that result.
  const calendarEvents = filterEvents(query.data || [], { ...filters, day: "" });
  const events = filters.day
    ? calendarEvents.filter((event) => event.date === filters.day)
    : calendarEvents;
  const locations = [
    ...new Set([
      ...(query.data || []).map((event) => event.location),
      ...(filters.location ? [filters.location] : []),
    ]),
  ].sort();
  const activeFilters = [term, ...Object.values(filters)].filter(Boolean).length;

  function change(key: SearchField, value: string) {
    setParams(changeEventSearch(params, key, value));
  }
  function search(value: string) {
    const clean = value.trim().slice(0, 200);
    change("search", clean);
    if (clean) updateVisitorList("searches", clean, true);
  }
  return {
    term,
    filters,
    query,
    recentSearches,
    view,
    events,
    calendarEvents,
    locations,
    activeFilters,
    change,
    search,
    reset: () => setParams({}),
  };
}
