"use client";

import { useQuery } from "@tanstack/react-query";

import LoadingIndicator from "../UI/LoadingIndicator";
// import ErrorBlock from "../UI/ErrorBlock";
// import EventItem from "./EventItem";
import { fetchEvents } from "../../util/http";

const NewEventsSection = (): JSX.Element => {
	const { data, isPending, isError } = useQuery({ // ,error
		queryKey: ["events"],
		queryFn: fetchEvents,
	});

	let content;

	if (isPending) {
		content = <LoadingIndicator />;
	}

	if (isError) {
		content = (
			<></>
			// <ErrorBlock
			// 	title="An error occurred"
			// 	message={error.info?.message || "Failed to fetch events."}
			// />
		);
	}

	if (data) {
		content = (
			<ul className="events-list">
				<li></li>
				{/* {data.map((event) => (
					<li key={event.id}>
						<EventItem event={event} />
					</li>
				))} */}
			</ul>
		);
	}

	return (
		<section className="content-section" id="new-events-section">
			<header>
				<h2>Recently added events</h2>
			</header>
			{content}
		</section>
	);
};

export default NewEventsSection;
