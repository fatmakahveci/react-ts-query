import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import { createSecurity } from "./middleware/security.js";

export function createApp({ security: options } = {}) {
  const app = express();
  const security = createSecurity(options);
  const directory = fileURLToPath(new URL("../", import.meta.url));
  const eventsDataFile = () =>
    process.env.EVENTS_DATA_FILE || path.join(directory, "data/events.json");
  const imagesDataFile = () =>
    process.env.IMAGES_DATA_FILE || path.join(directory, "data/images.json");
  const readEvents = async () => JSON.parse(await fs.readFile(eventsDataFile(), "utf8"));

  // Serialize read-modify-write operations in this process and replace files atomically.
  let pendingWrite = Promise.resolve();
  function mutateEvents(mutate) {
    const operation = pendingWrite.then(async () => {
      const events = await readEvents();
      const result = mutate(events);
      const target = eventsDataFile();
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify(events, null, 2) + "\n");
        await fs.rename(temporary, target);
      } finally {
        await fs.rm(temporary, { force: true });
      }
      return result;
    });
    // Keep later writes running after a failure; the caller still receives the original rejection.
    pendingWrite = operation.catch(() => {});
    return operation;
  }
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const limits = { title: 120, description: 5000, date: 10, time: 5, image: 200, location: 200 };
  async function validateEvent(req, res, next) {
    const input = req.body?.event;
    if (!input) return next(fail(400, "Event is required"));
    if (typeof input !== "object" || Array.isArray(input))
      return next(fail(400, "Invalid data provided."));
    // Copy allowed fields instead of persisting client-supplied IDs or other extra properties.
    const event = {};
    if (input.category !== undefined) {
      if (!["Community", "Workshops", "Networking", "Outdoors", "Culture"].includes(input.category))
        return next(fail(400, "Select a valid event category."));
      event.category = input.category;
    }
    for (const [key, max] of Object.entries(limits)) {
      if (typeof input[key] !== "string" || !input[key].trim() || input[key].trim().length > max) {
        return next(fail(400, "Invalid data provided."));
      }
      event[key] = input[key].trim();
    }
    const date = new Date(`${event.date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== event.date ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) ||
      !/^[\w/-]+\.(jpg|jpeg|png|webp)$/i.test(event.image) ||
      event.image.startsWith("/")
    ) {
      return next(fail(400, "Please provide a valid date, time and image path."));
    }
    const images = JSON.parse(await fs.readFile(imagesDataFile(), "utf8"));
    if (!images.some((image) => image.path === event.image))
      return next(fail(400, "Select an image from the catalogue."));
    res.locals.event = event;
    next();
  }

  app.disable("x-powered-by");
  app.use(security.headers);
  app.use(security.apiLimiter);
  app.use(security.requestPolicy);
  // Authorize writes before parsing their bodies or entering any route handler.
  app.use((req, res, next) => {
    if (["GET", "HEAD"].includes(req.method)) return next();
    security.authLimiter(req, res, () =>
      security.requireAdmin(req, res, () => security.writeLimiter(req, res, next)),
    );
  });
  app.use(security.requireJson);
  app.use(express.json({ limit: "32kb", inflate: false }));
  app.use(
    express.static(path.join(directory, "public"), {
      dotfiles: "deny",
      index: false,
      setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
    }),
  );
  app.post("/auth/verify", (req, res) => res.json({ authenticated: true }));

  app.get("/events", async (req, res) => {
    const { max, search } = req.query;
    if (
      Object.keys(req.query).some((key) => !["search", "max"].includes(key)) ||
      (search !== undefined && (typeof search !== "string" || search.length > 200)) ||
      (max !== undefined &&
        (typeof max !== "string" || !/^[1-9]\d*$/.test(max) || !Number.isSafeInteger(Number(max))))
    ) {
      throw fail(400, "Invalid search or limit parameter.");
    }
    let events = await readEvents();
    if (search?.trim()) {
      const term = search.trim().toLowerCase();
      events = events.filter((event) =>
        `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(term),
      );
    }
    if (max) events = events.slice(-Number(max));
    res.json({ events });
  });
  app.get("/events/images", async (req, res) => {
    res.json({ images: JSON.parse(await fs.readFile(imagesDataFile(), "utf8")) });
  });
  app.get("/events/:id", async (req, res) => {
    const event = (await readEvents()).find((event) => event.id === req.params.id);
    if (!event) throw fail(404, "Event not found");
    res.json({ event });
  });
  app.post("/events", validateEvent, async (req, res) => {
    const event = await mutateEvents((events) => {
      const event = { ...res.locals.event, id: randomUUID() };
      events.push(event);
      return event;
    });
    res.status(201).json({ event });
  });
  app.put("/events/:id", validateEvent, async (req, res) => {
    const event = await mutateEvents((events) => {
      const index = events.findIndex((event) => event.id === req.params.id);
      if (index === -1) throw fail(404, "Event not found");
      events[index] = { ...res.locals.event, id: req.params.id };
      return events[index];
    });
    res.json({ event });
  });
  app.delete("/events/:id", async (req, res) => {
    await mutateEvents((events) => {
      const index = events.findIndex((event) => event.id === req.params.id);
      if (index === -1) throw fail(404, "Event not found");
      events.splice(index, 1);
    });
    res.json({ message: "Event deleted" });
  });
  app.use((req, res) => res.status(404).json({ message: "Endpoint not found" }));
  app.use((error, req, res, next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    const message =
      status === 500
        ? "The server could not complete your request."
        : error.type === "entity.parse.failed"
          ? "Request body must be valid JSON."
          : error.type === "entity.too.large"
            ? "Request body is too large."
            : error.message;
    if (status === 500) console.error(error);
    res.status(status).json({ message });
  });

  return app;
}

export default createApp();
