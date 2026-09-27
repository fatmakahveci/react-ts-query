import { Link } from "react-router-dom";
import { EventType } from "../event.types";
import { imageUrl } from "../api/events.api";
import { formatDate } from "../../../lib/format-date";
import { categoryOf, isPast } from "../lib/discovery";
import SaveEventButton from "./SaveEventButton";

export default function EventCard({ event }: { event: EventType }) {
  return (
    <article className="event-item">
      <SaveEventButton event={event} compact />
      <Link
        to={`/events/${encodeURIComponent(event.id)}`}
        className="event-image-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <img loading="lazy" src={imageUrl(event.image)} alt="" />
      </Link>
      <div className="event-item-content">
        <div className="event-badges">
          <span>{categoryOf(event)}</span>
          <span>{isPast(event) ? "Past event" : "Upcoming"}</span>
        </div>
        <time className="event-item-date" dateTime={event.date}>
          {formatDate(event.date)} · {event.time}
        </time>
        <h3>
          <Link to={`/events/${encodeURIComponent(event.id)}`}>{event.title}</Link>
        </h3>
        <p className="event-excerpt">{event.description}</p>
        <p className="event-item-location">
          <span aria-hidden="true">↗</span> {event.location}
        </p>
        <Link
          to={`/events/${encodeURIComponent(event.id)}`}
          className="event-details-link"
          aria-label={`View details for ${event.title}`}
        >
          View details <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
