import { ReactNode } from "react";
import { AdminAccessButton } from "../../features/auth/AdminAccess";
import { Link, NavLink } from "react-router-dom";
import ThemePicker from "./ThemePicker";
import { useVisitorList } from "../../lib/visitor-preferences";

export default function AppHeader({ children }: { children: ReactNode }) {
  const saved = useVisitorList("saved");
  const plan = useVisitorList("plan");
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header id="main-header">
        <Link to="/events" className="brand" aria-label="React Events home">
          <span className="brand-mark" aria-hidden="true">
            re<span>·</span>
          </span>
          <span>
            react<span className="brand-light">events</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <AdminAccessButton />
          {children}
        </nav>
      </header>
      <nav className="discovery-nav" aria-label="Your events">
        <div>
          <NavLink to="/events" end>
            Discover
          </NavLink>
          <NavLink to="/events/saved">
            Saved <span>{saved.length}</span>
          </NavLink>
          <NavLink to="/events/plan">
            My plan <span>{plan.length}</span>
          </NavLink>
        </div>
        <ThemePicker />
      </nav>
    </>
  );
}
