"use client";

import { EventType } from "../../shared/types";

export const fetchEvents = async (searchTerm: string): Promise<EventType[]> => {
	let url: string = "http://localhost:3000/events";

	if (searchTerm) {
		url += "?search=" + encodeURIComponent(searchTerm);
	}

	const response: Response = await fetch(url);

	if (!response.ok) {
		const payload = await response.json();
		const message =
			typeof payload === "string"
				? payload
				: payload?.message || "An error occurred while fetching the events";
		throw new Error(message);
	}

	const { events } = await response.json();

	return events;
};
