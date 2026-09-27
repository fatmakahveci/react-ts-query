import { randomBytes } from "node:crypto";
import { createApp } from "../../src/app.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";

let app;
const adminToken = randomBytes(32).toString("base64url");
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
  app = createApp({ security: { adminToken } });
  tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "query-api-"));
  dataFile = path.join(tempDirectory, "events.json");
  imagesFile = path.join(tempDirectory, "images.json");
  process.env.EVENTS_DATA_FILE = dataFile;
  process.env.IMAGES_DATA_FILE = imagesFile;
  await fs.writeFile(
    imagesFile,
    JSON.stringify([
      { path: "images/react.jpg", caption: "React" },
      { path: "images/node.jpg", caption: "Node" },
      { path: "images/typescript.jpg", caption: "TypeScript" },
    ]),
  );
});

beforeEach(async () => {
  await fs.writeFile(dataFile, JSON.stringify(initialEvents));
});

after(async () => {
  delete process.env.EVENTS_DATA_FILE;
  delete process.env.IMAGES_DATA_FILE;
  await fs.rm(tempDirectory, { recursive: true, force: true });
});

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
  assert.deepEqual(
    searchResponse.body.events.map((event) => event.id),
    ["event-1"],
  );

  const limitedResponse = await request(app).get("/events").query({ max: 1 }).expect(200);
  assert.deepEqual(
    limitedResponse.body.events.map((event) => event.id),
    ["event-2"],
  );
});

test("serves selectable images and individual event details", async () => {
  const imagesResponse = await request(app).get("/events/images").expect(200);
  assert.equal(imagesResponse.body.images[0].caption, "React");

  const eventResponse = await request(app).get("/events/event-1").expect(200);
  assert.equal(eventResponse.body.event.title, "React Summit");

  await request(app).get("/events/missing").expect(404);
});

test("validates create and update payloads", async () => {
  await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({})
    .expect(400, {
      message: "Event is required",
    });
  await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { title: "" } })
    .expect(400, {
      message: "Invalid data provided.",
    });
  await request(app)
    .put("/events/event-1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({})
    .expect(400);
  await request(app)
    .put("/events/event-1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { ...validEvent, location: "" } })
    .expect(400);
});

test("persists supported categories and rejects unrecognized values", async () => {
  const created = await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { ...validEvent, category: "Workshops" } })
    .expect(201);
  const retrieved = await request(app).get(`/events/${created.body.event.id}`).expect(200);
  assert.equal(retrieved.body.event.category, "Workshops");
  for (const category of ["Unknown", { name: "Community" }, null]) {
    await request(app)
      .put(`/events/${created.body.event.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ event: { ...validEvent, category } })
      .expect(400);
  }
});

test("creates, updates, and deletes events", async () => {
  const createResponse = await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: validEvent })
    .expect(201);
  assert.ok(createResponse.body.event.id);

  const eventId = createResponse.body.event.id;
  const updateResponse = await request(app)
    .put(`/events/${eventId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { ...validEvent, title: "Advanced TypeScript" } })
    .expect(200);
  assert.equal(updateResponse.body.event.title, "Advanced TypeScript");

  await request(app)
    .put("/events/missing")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: validEvent })
    .expect(404);
  await request(app)
    .delete(`/events/${eventId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200, {
      message: "Event deleted",
    });
  await request(app)
    .delete(`/events/${eventId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(404);
});

test("rejects invalid types, dates, times, image paths and query parameters", async () => {
  for (const change of [
    { title: 42 },
    { title: " ".repeat(2) },
    { title: "x".repeat(121) },
    { date: "2030-02-30" },
    { date: "invalid" },
    { time: "25:00" },
    { image: "../secret.jpg" },
    { image: "/park.jpg" },
  ]) {
    await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ event: { ...validEvent, ...change } })
      .expect(400);
  }
  await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: [] })
    .expect(400);
  for (const query of [
    "search[a]=b",
    "search=a&search=b",
    "max=0",
    "max=-1",
    "max=no",
    "max=1.5",
  ]) {
    await request(app).get(`/events?${query}`).expect(400);
  }
});
test("preserves server IDs, strips unknown fields and trims strings", async () => {
  const created = await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { ...validEvent, id: "event-1", title: "  Trimmed  ", admin: true } })
    .expect(201);
  assert.notEqual(created.body.event.id, "event-1");
  assert.equal(created.body.event.title, "Trimmed");
  assert.equal(created.body.event.admin, undefined);
  const updated = await request(app)
    .put("/events/event-1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { ...validEvent, id: "hijacked" } })
    .expect(200);
  assert.equal(updated.body.event.id, "event-1");
});
test("does not lose concurrent writes", async () => {
  const responses = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      request(app)
        .post("/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ event: { ...validEvent, title: `Event ${i}` } })
        .expect(201),
    ),
  );
  assert.equal(new Set(responses.map((response) => response.body.event.id)).size, 12);
  const events = JSON.parse(await fs.readFile(dataFile, "utf8"));
  assert.equal(events.length, initialEvents.length + 12);
});
test("returns JSON for malformed requests and unknown endpoints", async () => {
  const response = await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
  assert.equal(response.body.message, "Request body must be valid JSON.");
  await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .set("Content-Type", "application/json")
    .send(JSON.stringify({ value: "x".repeat(40000) }))
    .expect(413);
  await request(app).options("/events").expect(204);
  await request(app).get("/unknown").expect(404);
});

for (const operation of ["writeFile", "rename"]) {
  test(`preserves stored events after ${operation} fails and accepts the next write`, async (t) => {
    const originalBytes = await fs.readFile(dataFile, "utf8");
    const originalOperation = fs[operation];
    const failure = Object.assign(new Error(`Storage failure at ${dataFile}`), { code: "EIO" });
    const log = t.mock.method(console, "error", () => {});
    // Inject a disk error at the atomic write boundary without relying on platform permissions.
    const failingOperation = t.mock.method(fs, operation, async (...args) => {
      const target = operation === "rename" ? args[1] : args[0];
      if (target === dataFile || String(target).startsWith(`${dataFile}.`)) throw failure;
      return originalOperation(...args);
    });
    await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ event: validEvent })
      .expect(500, { message: "The server could not complete your request." });
    assert.equal(await fs.readFile(dataFile, "utf8"), originalBytes);
    assert.deepEqual((await fs.readdir(tempDirectory)).sort(), ["events.json", "images.json"]);
    assert.equal(log.mock.calls[0].arguments[0], failure);
    failingOperation.mock.restore();

    const created = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ event: validEvent })
      .expect(201);
    const persisted = JSON.parse(await fs.readFile(dataFile, "utf8"));
    assert.deepEqual(persisted, [...initialEvents, created.body.event]);
  });
}

test("returns a safe error for damaged storage and resumes writes after recovery", async (t) => {
  t.mock.method(console, "error", () => {});
  await fs.writeFile(dataFile, '{"private-internal-marker":');
  for (const endpoint of ["/events", "/events/event-1"]) {
    await request(app)
      .get(endpoint)
      .expect(500, { message: "The server could not complete your request." });
  }
  await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: validEvent })
    .expect(500, { message: "The server could not complete your request." });
  assert.equal(await fs.readFile(dataFile, "utf8"), '{"private-internal-marker":');
  await fs.writeFile(dataFile, JSON.stringify(initialEvents));
  const created = await request(app)
    .post("/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: validEvent })
    .expect(201);
  const recovered = await request(app).get("/events").expect(200);
  assert.deepEqual(recovered.body.events, [...initialEvents, created.body.event]);
});

test("rejected updates and missing deletions leave persisted data unchanged", async () => {
  const originalBytes = await fs.readFile(dataFile, "utf8");
  await request(app)
    .put("/events/event-1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: { ...validEvent, image: "missing.jpg" } })
    .expect(400);
  await request(app)
    .put("/events/missing")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: validEvent })
    .expect(404);
  await request(app)
    .delete("/events/missing")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(404);
  assert.equal(await fs.readFile(dataFile, "utf8"), originalBytes);
  await request(app)
    .put("/events/event-1")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ event: validEvent })
    .expect(200);
  const persisted = JSON.parse(await fs.readFile(dataFile, "utf8"));
  assert.deepEqual(persisted, [{ ...validEvent, id: "event-1" }, initialEvents[1]]);
});
