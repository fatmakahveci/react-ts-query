export const fetchEvents = async (): Promise<Event> => {
	const response: Response = await fetch("http://localhost:3000/events");

	if (!response.ok) {
		const error: any = new Error("An error occurred while fetching the events");
		error.code = response.status;
		error.info = await response.json();
		throw error;
	}

	const { events } = await response.json();

	return events;
}
