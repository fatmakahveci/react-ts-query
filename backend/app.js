import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

const app = express();

const eventsDataFile = () =>
	process.env.EVENTS_DATA_FILE || path.join("data", "events.json");
const imagesDataFile = () =>
	process.env.IMAGES_DATA_FILE || path.join("data", "images.json");

app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS"
	);
	res.setHeader(
		"Access-Control-Allow-Headers",
		"X-Requested-With,content-type"
	);
	next();
});

app.get("/events", async (req, res) => {
	const { max, search } = req.query;
	const eventsFileContent = await fs.readFile(eventsDataFile());
	let events = JSON.parse(eventsFileContent);

	if (search) {
		events = events.filter((event) => {
			const searchableText = `${event.title} ${event.description} ${event.location}`;
			return searchableText.toLowerCase().includes(search.toLowerCase());
		});
	}

	if (max) {
		events = events.slice(events.length - max, events.length);
	}

	res.json({
		events: events.map((event) => ({
			id: event.id,
			title: event.title,
			image: event.image,
			date: event.date,
			location: event.location,
		})),
	});
});

app.get("/events/images", async (req, res) => {
	const imagesFileContent = await fs.readFile(imagesDataFile());
	const images = JSON.parse(imagesFileContent);

	res.json({ images });
});

app.get("/events/:id", async (req, res) => {
	const { id } = req.params;

	const eventsFileContent = await fs.readFile(eventsDataFile());
	const events = JSON.parse(eventsFileContent);

	const event = events.find((event) => event.id === id);

	if (!event) {
		return res
			.status(404)
			.json({ message: `For the id ${id}, no event could be found.` });
	}

	res.json({ event });
});

app.post("/events", async (req, res) => {
	const { event } = req.body;

	if (!event) {
		return res.status(400).json({ message: "Event is required" });
	}

	if (
		!event.title?.trim() ||
		!event.description?.trim() ||
		!event.date?.trim() ||
		!event.time?.trim() ||
		!event.image?.trim() ||
		!event.location?.trim()
	) {
		return res.status(400).json({ message: "Invalid data provided." });
	}

	const eventsFileContent = await fs.readFile(eventsDataFile());
	const events = JSON.parse(eventsFileContent);

	const newEvent = {
		id: Math.round(Math.random() * 10000).toString(),
		...event,
	};

	events.push(newEvent);

	await fs.writeFile(eventsDataFile(), JSON.stringify(events));

	res.json({ event: newEvent });
});

app.put("/events/:id", async (req, res) => {
	const { id } = req.params;
	const { event } = req.body;

	if (!event) {
		return res.status(400).json({ message: "Event is required" });
	}

	if (
		!event.title?.trim() ||
		!event.description?.trim() ||
		!event.date?.trim() ||
		!event.time?.trim() ||
		!event.image?.trim() ||
		!event.location?.trim()
	) {
		return res.status(400).json({ message: "Invalid data provided." });
	}

	const eventsFileContent = await fs.readFile(eventsDataFile());
	const events = JSON.parse(eventsFileContent);

	const eventIndex = events.findIndex((event) => event.id === id);

	if (eventIndex === -1) {
		return res.status(404).json({ message: "Event not found" });
	}

	events[eventIndex] = {
		id,
		...event,
	};

	await fs.writeFile(eventsDataFile(), JSON.stringify(events));

	res.json({ event: events[eventIndex] });
});

app.delete("/events/:id", async (req, res) => {
	const { id } = req.params;

	const eventsFileContent = await fs.readFile(eventsDataFile());
	const events = JSON.parse(eventsFileContent);

	const eventIndex = events.findIndex((event) => event.id === id);

	if (eventIndex === -1) {
		return res.status(404).json({ message: "Event not found" });
	}

	events.splice(eventIndex, 1);

	await fs.writeFile(eventsDataFile(), JSON.stringify(events));

	res.json({ message: "Event deleted" });
});

const isMainModule =
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
	app.listen(3000, () => {
		console.log("Server running on port 3000");
	});
}

export default app;
