import { Navigate, createBrowserRouter } from "react-router-dom";
import EventListPage from "../features/events/pages/EventListPage";
import EventDetailsPage from "../features/events/pages/EventDetailsPage";
import CreateEventPage from "../features/events/pages/CreateEventPage";
import EditEventPage from "../features/events/pages/EditEventPage";
import EventCollectionPage from "../features/events/pages/EventCollectionPage";

export const router = createBrowserRouter([
  { path: "/events/saved", element: <EventCollectionPage kind="saved" /> },
  { path: "/events/plan", element: <EventCollectionPage kind="plan" /> },
  {
    path: "*",
    element: (
      <main className="not-found">
        <h1>Page not found</h1>
        <p>This page may have moved or no longer exists.</p>
        <a className="button" href="/events">
          Explore events
        </a>
      </main>
    ),
  },
  {
    path: "/",
    element: <Navigate to="/events" replace />,
  },
  {
    path: "/events",
    element: <EventListPage />,

    children: [
      {
        path: "/events/new",
        element: <CreateEventPage />,
      },
    ],
  },
  {
    path: "/events/:id",
    element: <EventDetailsPage />,
    children: [
      {
        path: "/events/:id/edit",
        element: <EditEventPage />,
      },
    ],
  },
]);
