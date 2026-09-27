import type { JSX } from "react";
import { Link, Outlet } from "react-router-dom";

import AppHeader from "../../../components/layout/AppHeader";
import EventsHero from "../components/EventsHero";
import EventSearchSection from "../components/EventSearchSection";
import { EventSpotlight, RecentlyViewed } from "../components/DiscoveryHighlights";
import GettingStarted from "../components/GettingStarted";

const EventListPage = (): JSX.Element => {
  return (
    <>
      <Outlet />
      <AppHeader>
        <Link to="/events/new" className="button">
          New Event
        </Link>
      </AppHeader>
      <main id="main-content">
        <EventsHero />
        <EventSpotlight />
        <EventSearchSection />
        <RecentlyViewed />
        <GettingStarted />
      </main>
      <footer className="site-footer">
        <span>React Events</span>
        <p>A place to find your people.</p>
        <Link to="/events/new">Bring an idea to life ↗</Link>
      </footer>
    </>
  );
};

export default EventListPage;
