"use client";

import { useQuery } from "@tanstack/react-query";

import { EventType } from "../../../shared/types";
import { fetchEvents } from "../../util/http";
import ErrorBlock from "../UI/ErrorBlock";
import LoadingIndicator from "../UI/LoadingIndicator";
import EventItem from "./EventItem";

const NewEventsSection = (): JSX.Element => {
	const { data, isPending, isError, error } = useQuery({
		queryKey: ["events"],
		queryFn: fetchEvents,
		staleTime: 5000,
		gcTime: 30000,
	});

	let content;

	if (isPending) {
		content = <LoadingIndicator />;
	}

	if (isError) {
		content = (
			<ErrorBlock
				title="An error occurred"
				message={error.message || "Failed to fetch events."}
			/>
		);
	}

	if (data) {
		content = (
			<ul className="events-list">
				{data.map((event: EventType) => (
					<li key={event.id}>
						<EventItem event={event} />
					</li>
				))}
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
