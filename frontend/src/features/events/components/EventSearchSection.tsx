import { FormEvent, useEffect, useRef, useState } from "react";
import { EVENT_CATEGORIES } from "../event.types";
import { DATE_FILTERS, EVENT_SORTS } from "../lib/event-filters";
import useEventDiscovery from "../hooks/use-event-discovery";
import { setPreference } from "../../../lib/visitor-preferences";
import EventCard from "./EventCard";
import EventCalendar from "./EventCalendar";
import EventSkeletons from "./EventSkeletons";
import ErrorAlert from "../../../components/ui/ErrorAlert";

export default function EventSearchSection() {
  const {
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
    reset,
  } = useEventDiscovery();
  const [searchValue, setSearchValue] = useState(term);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => setSearchValue(term), [term]);
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        target?.closest(
          "input,textarea,select,[contenteditable]:not([contenteditable=false]),dialog",
        )
      )
        return;
      event.preventDefault();
      searchInput.current?.focus();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(searchValue);
  }
  return (
    <section className="content-section" id="all-events-section" aria-labelledby="events-heading">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Find your people</p>
          <h2 id="events-heading">Explore events</h2>
        </div>
        <form onSubmit={handleSubmit} id="search-form" role="search">
          <input
            ref={searchInput}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            aria-label="Search events"
            aria-keyshortcuts="/"
            placeholder="Search events, places, interests…"
            maxLength={200}
          />
          <button className="button">Search</button>
        </form>
      </header>
      <div className="search-shortcuts">
        <span>
          Press <kbd>/</kbd> to search
        </span>
        {recentSearches.length > 0 && (
          <>
            <span>Recent:</span>
            {recentSearches.map((value) => (
              <button
                key={value}
                onClick={() => {
                  setSearchValue(value);
                  search(value);
                }}
              >
                {value}
              </button>
            ))}
            <button
              aria-label="Clear recent searches"
              onClick={() => setPreference("searches", "[]")}
            >
              Clear history
            </button>
          </>
        )}
      </div>
      <div className="filter-bar">
        <label>
          Category
          <select
            aria-label="Category"
            value={filters.category}
            onChange={(e) => change("category", e.target.value)}
          >
            <option value="">All interests</option>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          When
          <select
            aria-label="When"
            value={filters.when}
            onChange={(e) => change("when", e.target.value)}
          >
            {DATE_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select
            aria-label="Location"
            value={filters.location}
            onChange={(e) => change("location", e.target.value)}
          >
            <option value="">Everywhere</option>
            {locations.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select
            aria-label="Sort by"
            value={filters.sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            {EVENT_SORTS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="results-toolbar">
        <p className="results-summary" role="status">
          {query.data
            ? `${events.length} ${events.length === 1 ? "event" : "events"}${term ? ` matching “${term}”` : " to explore"}${filters.day ? ` on ${filters.day}` : ""}`
            : "Finding your next connection…"}
        </p>
        <div className="view-switch" role="group" aria-label="Event view">
          {["grid", "list", "calendar"].map((choice) => (
            <button
              key={choice}
              aria-pressed={view === choice}
              onClick={() => setPreference("view", choice)}
            >
              {choice[0].toUpperCase() + choice.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {activeFilters > 0 && (
        <button
          className="button-text reset-filters"
          onClick={() => {
            reset();
            setSearchValue("");
          }}
        >
          Reset filters ({activeFilters}) ×
        </button>
      )}
      {view === "calendar" && (
        <EventCalendar
          events={calendarEvents}
          selected={filters.day}
          onSelect={(day) => change("day", day)}
        />
      )}
      {query.isPending && <EventSkeletons />}
      {query.isError && (
        <>
          <ErrorAlert title="Could not load events" message={query.error.message} />
          <button className="button button-secondary" onClick={() => query.refetch()}>
            Try again
          </button>
        </>
      )}
      {query.data &&
        (events.length ? (
          <ul className={`events-list ${view === "list" ? "events-list-compact" : ""}`}>
            {events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>{activeFilters ? "No matches just yet" : "The next gathering starts with you"}</h3>
            <p>
              {activeFilters
                ? "Try another interest, date or place. A new connection could be one filter away."
                : "Create the first event and bring your community together."}
            </p>
            {term && (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearchValue("");
                  change("search", "");
                }}
              >
                Clear search
              </button>
            )}
          </div>
        ))}
    </section>
  );
}
