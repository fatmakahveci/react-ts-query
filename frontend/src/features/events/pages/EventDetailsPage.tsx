import { AdminGate } from "../../auth/AdminAccess";
import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteEvent, imageUrl } from "../api/events.api";
import { eventDetailQuery, eventKeys } from "../api/events.queries";
import { formatDate } from "../../../lib/format-date";
import AppHeader from "../../../components/layout/AppHeader";
import Modal from "../../../components/ui/Modal";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorAlert from "../../../components/ui/ErrorAlert";
import { updateVisitorList } from "../../../lib/visitor-preferences";
import { categoryOf, isPast } from "../lib/discovery";
import EventActions from "../components/EventActions";
import { RelatedEvents } from "../components/DiscoveryHighlights";

export default function EventDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const query = useQuery(eventDetailQuery(id));
  const deletion = useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      navigate("/events", { replace: true });
      client.removeQueries({ queryKey: eventKeys.detail(id), exact: true });
      void client.invalidateQueries({ queryKey: eventKeys.lists });
    },
  });
  const event = query.data;
  useEffect(() => {
    if (event?.id) updateVisitorList("viewed", event.id, true);
  }, [event?.id]);
  return (
    <>
      <Outlet />
      <AppHeader>
        <Link to="/events" className="nav-item">
          ← All events
        </Link>
      </AppHeader>
      <main id="main-content" className="detail-page">
        {query.isPending && <LoadingSpinner />}
        {query.isError && (
          <>
            <ErrorAlert title="Event unavailable" message={query.error.message} />
            <button className="button" onClick={() => query.refetch()}>
              Try again
            </button>
          </>
        )}
        {event && (
          <article id="event-details">
            <div className="event-badges">
              <span>{categoryOf(event)}</span>
              <span>{isPast(event) ? "Past event" : "Upcoming"}</span>
            </div>
            <header>
              <div>
                <p className="eyebrow">Make time for connection</p>
                <h1>{event.title}</h1>
              </div>
              <nav aria-label="Manage event">
                <Link className="button button-secondary" to="edit">
                  Edit event
                </Link>
                <button className="button-text danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              </nav>
            </header>
            <div id="event-details-content">
              <img src={imageUrl(event.image)} alt={event.title} />
              <div id="event-details-info">
                <div className="detail-meta">
                  <div>
                    <p className="eyebrow">When</p>
                    <time dateTime={`${event.date}T${event.time}`}>
                      {formatDate(event.date)} · {event.time}
                    </time>
                  </div>
                  <div>
                    <p className="eyebrow">Where</p>
                    <p id="event-details-location">{event.location}</p>
                    <a
                      className="map-link"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get directions ↗
                    </a>
                  </div>
                </div>
                <h2>About this event</h2>
                <p id="event-details-description">{event.description}</p>
              </div>
            </div>
            {/* Remount per event to discard any previous share-link fallback. */}
            <EventActions key={event.id} event={event} />
            <RelatedEvents event={event} />
          </article>
        )}
      </main>
      {confirmDelete && (
        <Modal
          title="Delete this event?"
          onClose={() => {
            if (!deletion.isPending) setConfirmDelete(false);
          }}
        >
          <AdminGate>
            <p>“{event?.title}” will be permanently removed. This cannot be undone.</p>
            {deletion.isError && (
              <ErrorAlert title="Could not delete event" message={deletion.error.message} />
            )}
            <div className="form-actions">
              <button
                className="button-text"
                disabled={deletion.isPending}
                onClick={() => setConfirmDelete(false)}
              >
                Keep event
              </button>
              <button
                className="button button-danger"
                disabled={deletion.isPending}
                onClick={() => deletion.mutate()}
              >
                {deletion.isPending ? "Deleting…" : "Delete event"}
              </button>
            </div>
          </AdminGate>
        </Modal>
      )}
    </>
  );
}
