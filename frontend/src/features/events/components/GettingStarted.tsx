import { setPreference, usePreference } from "../../../lib/visitor-preferences";

export default function GettingStarted() {
  const dismissed = usePreference("welcome-dismissed", "false") === "true";
  if (dismissed)
    return (
      <div className="welcome-reopen">
        <button className="button-text" onClick={() => setPreference("welcome-dismissed", "false")}>
          How it works ↗
        </button>
      </div>
    );
  return (
    <section className="getting-started" aria-labelledby="welcome-title">
      <div className="welcome-heading">
        <h2 id="welcome-title">Your next good story starts here.</h2>
        <button
          className="button-text"
          aria-label="Dismiss getting started"
          onClick={() => setPreference("welcome-dismissed", "true")}
        >
          ×
        </button>
      </div>
      <ol>
        <li>
          <span>01</span>
          <div>
            <h3>Follow your curiosity</h3>
            <p>Find an interest, a place and a day that work for you.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h3>Keep the good finds</h3>
            <p>Tap the heart to build a collection on this device.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h3>Make a little space</h3>
            <p>Add an event to your personal plan or calendar.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
