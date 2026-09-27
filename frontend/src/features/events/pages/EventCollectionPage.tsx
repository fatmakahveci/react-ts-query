import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppHeader from "../../../components/layout/AppHeader";
import ErrorAlert from "../../../components/ui/ErrorAlert";
import { notify } from "../../../components/ui/Toast";
import {
  removeVisitorItems,
  updateVisitorList,
  useVisitorList,
} from "../../../lib/visitor-preferences";
import { eventListQuery } from "../api/events.queries";
import EventCard from "../components/EventCard";
import EventSkeletons from "../components/EventSkeletons";
import { filterEvents } from "../lib/discovery";

export default function EventCollectionPage({ kind }: { kind: "saved" | "plan" }) {
  const ids = useVisitorList(kind);
  const query = useQuery(eventListQuery());
  const savedIds = new Set(ids);
  const availableIds = new Set(query.data?.map((event) => event.id));
  const events = filterEvents(
    (query.data || []).filter((event) => savedIds.has(event.id)),
    {},
  );
  const missing = query.data ? ids.filter((id) => !availableIds.has(id)).length : 0;
  return (
    <>
      <AppHeader>
        <Link className="button" to="/events">
          Explore events
        </Link>
      </AppHeader>
      <main id="main-content" className="collection-page">
        <p className="eyebrow">A little more you</p>
        <h1>{kind === "saved" ? "Your good finds." : "Make room for connection."}</h1>
        <p className="collection-intro">
          {kind === "saved"
            ? "All the events that caught your eye, together in one place."
            : "Your personal shortlist for days worth looking forward to."}
        </p>
        <p className="visitor-note">
          Saved on this device, without an account. Your plan is not a booking or registration.
          Clearing browser data removes your collection.
        </p>
        {query.isPending && <EventSkeletons />}
        {query.isError && (
          <>
            <ErrorAlert title="Could not load your events" message={query.error.message} />
            <button className="button" onClick={() => query.refetch()}>
              Try again
            </button>
          </>
        )}
        {query.data && (
          <>
            <p className="results-summary" role="status">
              {events.length} {events.length === 1 ? "event" : "events"} in your{" "}
              {kind === "saved" ? "collection" : "plan"}
            </p>
            {missing > 0 && (
              <p className="visitor-note">
                {missing} previously added {missing === 1 ? "event is" : "events are"} no longer
                available.{" "}
                <button
                  className="button-text"
                  onClick={() =>
                    removeVisitorItems(
                      kind,
                      ids.filter((id) => !availableIds.has(id)),
                    )
                  }
                >
                  Remove unavailable events
                </button>
              </p>
            )}
            {events.length ? (
              <ul className="events-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                    {kind === "plan" && (
                      <button
                        className="button-text plan-remove"
                        aria-label={`Remove ${event.title} from plan`}
                        onClick={() => {
                          updateVisitorList("plan", event.id, false);
                          notify("Removed from your plan", () =>
                            updateVisitorList("plan", event.id, true),
                          );
                        }}
                      >
                        Remove from plan
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="empty-symbol" aria-hidden="true">
                  {kind === "saved" ? "♡" : "✳"}
                </span>
                <h2>
                  {kind === "saved" ? "Keep a little inspiration" : "Your next adventure is open"}
                </h2>
                <p>
                  {kind === "saved"
                    ? "Tap the heart on an event to save it here."
                    : "Open an upcoming event and choose “Add to my plan”."}
                </p>
                <Link className="button" to="/events#all-events-section">
                  Find an event ↗
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
