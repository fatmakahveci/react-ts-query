import { useEffect, useState } from "react";
import { EventType } from "../event.types";
import { localDate } from "../lib/discovery";
import { isCalendarMonth, isEventDate } from "../lib/event-filters";

export default function EventCalendar({
  events,
  selected,
  onSelect,
}: {
  events: EventType[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  const selectedMonth = isEventDate(selected) ? selected.slice(0, 7) : "";
  const [month, setMonth] = useState(() => selectedMonth || localDate(new Date()).slice(0, 7));
  // Follow the full URL date on navigation, even within one month; clearing it preserves browsing.
  useEffect(() => {
    if (selectedMonth) setMonth(selectedMonth);
  }, [selected, selectedMonth]);
  // String parsing avoids Date's special handling of numeric years 0–99.
  const first = new Date(`${month}-01T12:00:00`);
  const last = new Date(first);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);
  const days = last.getDate();
  const offset = (first.getDay() + 6) % 7;
  const counts = new Map<string, number>();
  events.forEach((event) => counts.set(event.date, (counts.get(event.date) || 0) + 1));
  const today = localDate(new Date());
  function move(delta: number) {
    const next = new Date(first);
    next.setMonth(next.getMonth() + delta);
    const candidate = localDate(next).slice(0, 7);
    if (isCalendarMonth(candidate)) setMonth(candidate);
  }
  return (
    <div className="calendar-browser">
      <div className="calendar-toolbar">
        <button
          className="button button-secondary"
          aria-label="Previous month"
          disabled={month === "0001-01"}
          onClick={() => move(-1)}
        >
          ←
        </button>
        <label>
          <span className="sr-only">Calendar month</span>
          <input
            aria-label="Calendar month"
            type="month"
            min="0001-01"
            max="9999-12"
            value={month}
            onChange={(e) => {
              if (isCalendarMonth(e.target.value)) setMonth(e.target.value);
            }}
          />
        </label>
        <button
          className="button button-secondary"
          aria-label="Next month"
          disabled={month === "9999-12"}
          onClick={() => move(1)}
        >
          →
        </button>
        <button
          className="button-text"
          onClick={() => {
            setMonth(today.slice(0, 7));
            onSelect("");
          }}
        >
          This month
        </button>
      </div>
      <p className="visitor-note">
        Select a date to explore its events. Times are listed in each venue’s local time.
      </p>
      <div
        className="calendar-grid"
        role="group"
        aria-label={first.toLocaleDateString("en", { month: "long", year: "numeric" })}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span className="calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span aria-hidden="true" key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, "0")}`;
          const count = counts.get(day) || 0;
          return (
            <button
              key={day}
              aria-label={`${day}, ${count} ${count === 1 ? "event" : "events"}`}
              aria-pressed={selected === day}
              aria-current={day === today ? "date" : undefined}
              className={count ? "has-events" : ""}
              onClick={() => onSelect(selected === day ? "" : day)}
            >
              <span>{i + 1}</span>
              {count > 0 && (
                <small>
                  {count}
                  <span className="calendar-count-label"> {count === 1 ? "event" : "events"}</span>
                </small>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <button className="button-text calendar-clear" onClick={() => onSelect("")}>
          Clear selected date: {selected} ×
        </button>
      )}
    </div>
  );
}
