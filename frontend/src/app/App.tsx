import {
	Navigate,
	RouterProvider,
	createBrowserRouter,
} from "react-router-dom";

import Events from "./components/Events/Events";
import EventDetails from "./components/Events/EventDetails";
import NewEvent from "./components/Events/NewEvent";
import EditEvent from "./components/Events/EditEvent";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Navigate to="/events" />,
	},
	{
		path: "/events",
		element: <Events />,

		children: [
			{
				path: "/events/new",
				element: <NewEvent />,
			},
		],
	},
	{
		path: "/events/:id",
		element: <EventDetails />,
		children: [
			{
				path: "/events/:id/edit",
				element: <EditEvent />,
			},
		],
	},
]);

const App = (): JSX.Element => {
	return <RouterProvider router={router}></RouterProvider>;
};

export default App;
