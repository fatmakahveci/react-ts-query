export default function EventSkeletons() {
  return (
    <div className="event-skeletons" role="status" aria-label="Loading events">
      <span className="sr-only">Loading events…</span>
      {[0, 1, 2].map((id) => (
        <div className="event-skeleton" aria-hidden="true" key={id}>
          <div />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
