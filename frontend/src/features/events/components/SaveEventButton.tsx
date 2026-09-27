import { updateVisitorList, useVisitorList } from "../../../lib/visitor-preferences";
import { notify } from "../../../components/ui/Toast";
import { EventType } from "../event.types";

export default function SaveEventButton({
  event,
  compact = false,
}: {
  event: EventType;
  compact?: boolean;
}) {
  const saved = useVisitorList("saved").includes(event.id);
  function toggle() {
    updateVisitorList("saved", event.id, !saved);
    notify(saved ? "Removed from saved events" : "Saved to your collection", () =>
      updateVisitorList("saved", event.id, saved),
    );
  }
  return (
    <button
      className={compact ? "save-button" : "button button-secondary"}
      aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
      aria-pressed={saved}
      onClick={toggle}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {!compact && (saved ? "Saved" : "Save event")}
    </button>
  );
}
