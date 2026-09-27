import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { imageUrl } from "../api/events.api";
import { eventListQuery } from "../api/events.queries";
import { categoryOf, filterEvents, isPast } from "../lib/discovery";
import { useVisitorList } from "../../../lib/visitor-preferences";
import { formatDate } from "../../../lib/format-date";
import { EventType } from "../event.types";
import EventCard from "./EventCard";

export function EventSpotlight() {
  const { data } = useQuery(eventListQuery());
  const event = filterEvents(data || [], {})[0];
  if (!event) return null;
  return (
    <section className="spotlight" aria-labelledby="spotlight-title">
      <img src={imageUrl(event.image)} alt="" loading="lazy" />
      <div>
        <p className="eyebrow">{isPast(event) ? "From the community archive" : "Coming up next"}</p>
        <h2 id="spotlight-title">{event.title}</h2>
        <p>
          {formatDate(event.date)} · {event.time} · {event.location}
        </p>
      </div>
      <Link className="button button-secondary" to={`/events/${encodeURIComponent(event.id)}`}>
        Take a look ↗
      </Link>
    </section>
  );
}

export function RecentlyViewed() {
  const ids = useVisitorList("viewed");
  const { data } = useQuery(eventListQuery());
  const byId = new Map(data?.map((event) => [event.id, event]));
  const events = ids
    .map((id) => byId.get(id))
    .filter((event): event is EventType => Boolean(event))
    .slice(0, 3);
  if (!events.length) return null;
  return (
    <section className="content-section" aria-labelledby="viewed-heading">
      <p className="eyebrow">Pick up where you left off</p>
      <h2 id="viewed-heading">Recently viewed</h2>
      <ul className="events-list">
        {events.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RelatedEvents({ event }: { event: EventType }) {
  const { data } = useQuery(eventListQuery());
  const related = filterEvents(data || [], {})
    .filter(
      (item) =>
        item.id !== event.id &&
        (categoryOf(item) === categoryOf(event) || item.location === event.location),
    )
    .slice(0, 3);
  if (!related.length) return null;
  return (
    <section className="related-events" aria-labelledby="related-heading">
      <p className="eyebrow">Keep exploring</p>
      <h2 id="related-heading">More in your world</h2>
      <p className="visitor-note">Events with the same category or location.</p>
      <ul className="events-list">
        {related.map((item) => (
          <li key={item.id}>
            <EventCard event={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
