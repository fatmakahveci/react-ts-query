import { useState } from "react";
import { EventType } from "../event.types";
import { downloadCalendar } from "../lib/calendar";
import { isPast } from "../lib/discovery";
import { updateVisitorList, useVisitorList } from "../../../lib/visitor-preferences";
import { notify } from "../../../components/ui/Toast";
import SaveEventButton from "./SaveEventButton";

export default function EventActions({ event }: { event: EventType }) {
  const planned = useVisitorList("plan").includes(event.id);
  const [shareLink, setShareLink] = useState("");
  const past = isPast(event);
  async function share() {
    const url = new URL(`/events/${encodeURIComponent(event.id)}`, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: "Discover this event on React Events",
          url,
        });
        return;
      } catch (error) {
        // Cancelling the native share sheet must not silently copy the link instead.
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        )
          return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("Event link copied");
    } catch {
      setShareLink(url);
    }
  }
  return (
    <section className="event-actions-panel" aria-label="Your event actions">
      <div className="event-actions">
        <SaveEventButton event={event} />
        <button
          className="button"
          aria-pressed={planned}
          disabled={past && !planned}
          onClick={() => {
            updateVisitorList("plan", event.id, !planned);
            notify(planned ? "Removed from your plan" : "Added to your personal plan", () =>
              updateVisitorList("plan", event.id, planned),
            );
          }}
        >
          {planned ? "Remove from plan" : past ? "Past event" : "Add to my plan"}
        </button>
        <button className="button button-secondary" onClick={() => downloadCalendar(event)}>
          Add to calendar ↓
        </button>
        <button className="button button-secondary" onClick={() => void share()}>
          Share event ↗
        </button>
      </div>
      <p className="visitor-note">
        Your plan is saved on this device. It is not a booking or registration. Calendar times use
        your calendar’s local time.
      </p>
      {shareLink && (
        <label className="share-fallback">
          Copy this event link
          <input readOnly value={shareLink} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </section>
  );
}
