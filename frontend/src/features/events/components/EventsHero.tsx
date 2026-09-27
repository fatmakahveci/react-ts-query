import { Link } from "react-router-dom";
import meetupImg from "../../../assets/images/community-meetup.jpg";

export default function EventsHero() {
  return (
    <section id="overview-section" aria-labelledby="intro-title">
      <div className="hero-copy">
        <p className="eyebrow">Good things happen together</p>
        <h1 id="intro-title">
          Less scrolling.
          <br />
          More <em>connecting.</em>
        </h1>
        <p className="hero-description">
          Discover a new interest, share what you love, and meet the people who make it even better.
        </p>
        <div className="hero-actions">
          <a href="#all-events-section" className="button">
            Explore events <span aria-hidden="true">↗</span>
          </a>
          <Link to="/events/new" className="hero-secondary">
            Host an event →
          </Link>
        </div>
        <p className="hero-note">
          <span aria-hidden="true">✳</span> New ideas. Shared experiences. Real connections.
        </p>
      </div>
      <div className="hero-visual">
        <img src={meetupImg} alt="People connecting at a community gathering" />
        <div className="hero-caption">
          <span className="live-dot" /> A little curiosity. A whole new community.
        </div>
      </div>
    </section>
  );
}
