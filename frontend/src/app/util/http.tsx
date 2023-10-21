"use client";

import { EventType } from "../../shared/types";

export const fetchEvents = async (searchTerm: string): Promise<EventType[]> => {
	let url: string = "http://localhost:3000/events";

	if (searchTerm) {
		url += "?search=" + searchTerm;
	}

	const response: Response = await fetch(url);

	if (!response.ok) {
		const error = new Error("An error occurred while fetching the events");
		error.message = await response.json();
		throw error;
	}

	const { events } = await response.json();

	return events;
};
