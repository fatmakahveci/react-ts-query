"use client";

import { Link, Outlet } from "react-router-dom";

import Header from "../Header";
import EventsIntroSection from "./EventsIntroSection";
import FindEventSection from "./FindEventSection";

const Events = (): JSX.Element => {
	return (
		<>
			<Outlet />
			<Header>
				<Link to="/events/new" className="button">
					New Event
				</Link>
			</Header>
			<main>
				<EventsIntroSection />
				<FindEventSection />
			</main>
		</>
	);
};

export default Events;
