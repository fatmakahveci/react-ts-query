import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";

let dataFile;
let imagesFile;
let tempDirectory;

const initialEvents = [
	{
		id: "event-1",
		title: "React Summit",
		description: "A frontend community conference",
		date: "2030-06-15",
		time: "10:00",
		image: "images/react.jpg",
		location: "Amsterdam",
	},
	{
		id: "event-2",
		title: "Node Meetup",
		description: "Backend engineering talks",
		date: "2030-07-20",
		time: "18:00",
		image: "images/node.jpg",
		location: "Berlin",
	},
];

before(async () => {
	tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "query-api-"));
	dataFile = path.join(tempDirectory, "events.json");
	imagesFile = path.join(tempDirectory, "images.json");
	process.env.EVENTS_DATA_FILE = dataFile;
	process.env.IMAGES_DATA_FILE = imagesFile;
	await fs.writeFile(imagesFile, JSON.stringify([{ path: "images/react.jpg", caption: "React" }]));
});

beforeEach(async () => {
	await fs.writeFile(dataFile, JSON.stringify(initialEvents));
});

after(async () => {
	delete process.env.EVENTS_DATA_FILE;
	delete process.env.IMAGES_DATA_FILE;
	await fs.rm(tempDirectory, { recursive: true, force: true });
});

const { default: app } = await import("../app.js");

const validEvent = {
	title: "TypeScript Workshop",
	description: "Practical type-safe application patterns",
	date: "2030-08-12",
	time: "09:30",
	image: "images/typescript.jpg",
	location: "London",
};

test("lists, searches, and limits events", async () => {
	const listResponse = await request(app).get("/events").expect(200);
	assert.equal(listResponse.body.events.length, 2);

	const searchResponse = await request(app)
		.get("/events")
		.query({ search: "frontend" })
		.expect(200);
	assert.deepEqual(searchResponse.body.events.map((event) => event.id), ["event-1"]);

	const limitedResponse = await request(app)
		.get("/events")
		.query({ max: 1 })
		.expect(200);
	assert.deepEqual(limitedResponse.body.events.map((event) => event.id), ["event-2"]);
});

test("serves selectable images and individual event details", async () => {
	const imagesResponse = await request(app).get("/events/images").expect(200);
	assert.equal(imagesResponse.body.images[0].caption, "React");

	const eventResponse = await request(app).get("/events/event-1").expect(200);
	assert.equal(eventResponse.body.event.title, "React Summit");

	await request(app).get("/events/missing").expect(404);
});

test("validates create and update payloads", async () => {
	await request(app).post("/events").send({}).expect(400, {
		message: "Event is required",
	});
	await request(app).post("/events").send({ event: { title: "" } }).expect(400, {
		message: "Invalid data provided.",
	});
	await request(app).put("/events/event-1").send({}).expect(400);
	await request(app)
		.put("/events/event-1")
		.send({ event: { ...validEvent, location: "" } })
		.expect(400);
});

test("creates, updates, and deletes events", async () => {
	const createResponse = await request(app)
		.post("/events")
		.send({ event: validEvent })
		.expect(200);
	assert.ok(createResponse.body.event.id);

	const eventId = createResponse.body.event.id;
	const updateResponse = await request(app)
		.put(`/events/${eventId}`)
		.send({ event: { ...validEvent, title: "Advanced TypeScript" } })
		.expect(200);
	assert.equal(updateResponse.body.event.title, "Advanced TypeScript");

	await request(app).put("/events/missing").send({ event: validEvent }).expect(404);
	await request(app).delete(`/events/${eventId}`).expect(200, {
		message: "Event deleted",
	});
	await request(app).delete(`/events/${eventId}`).expect(404);
});
