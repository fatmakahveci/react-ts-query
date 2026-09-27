import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../../src/app.js";

const token = randomBytes(32).toString("base64url");
const auth = { Authorization: `Bearer ${token}` };
const makeApp = (security) => createApp({ security: { adminToken: token, ...security } });

test("anonymous and forged credentials cannot create, edit or delete records", async () => {
  const app = makeApp();
  for (const [method, url] of [
    ["post", "/events"],
    ["put", "/events/e1"],
    ["delete", "/events/e1"],
  ]) {
    await request(app)[method](url).send({}).expect(401);
    await request(app)
      [method](url)
      .set("Authorization", `Bearer ${"x".repeat(43)}`)
      .send({})
      .expect(401);
  }
  await request(app).post("/auth/verify").set(auth).send({}).expect(200, { authenticated: true });
  const response = await request(app).get("/events").expect(200);
  assert.ok(Array.isArray(response.body.events));
});

test("management fails closed without a configured key", async () => {
  const app = makeApp({ adminToken: "" });
  await request(app).get("/events").expect(200);
  await request(app).delete("/events/e1").set(auth).expect(503);
  assert.throws(() => makeApp({ adminToken: "short" }), /ADMIN_TOKEN/);
});

test("rejects untrusted origins, null origins, host rebinding and wildcard CORS", async () => {
  const app = makeApp({ corsOrigin: "https://events.example.com" });
  for (const origin of [
    "https://evil.example",
    "null",
    "https://events.example.com.evil.example",
  ]) {
    await request(app).delete("/events/e1").set(auth).set("Origin", origin).expect(403);
    await request(app).options("/events").set("Origin", origin).expect(403);
  }
  await request(app).get("/events").set("Host", "evil.example").expect(403);
  const preflight = await request(app)
    .options("/events")
    .set("Origin", "https://events.example.com")
    .expect(204);
  assert.equal(preflight.headers["access-control-allow-origin"], "https://events.example.com");
  assert.match(preflight.headers["access-control-allow-headers"], /Authorization/);
  assert.throws(() => makeApp({ corsOrigin: "*" }));
  assert.throws(() => makeApp({ corsOrigin: "http://events.example.com" }), /HTTPS/);
  assert.throws(() => makeApp({ corsOrigin: "https://events.example.com/path" }), /exact/);
});

test("restricts payload media types, decompression and image choices", async () => {
  const app = makeApp();
  await request(app).post("/events").set(auth).type("form").send({ title: "injected" }).expect(415);
  await request(app).post("/events").set(auth).type("text").send("{}").expect(415);
  await request(app)
    .post("/events")
    .set(auth)
    .set("Content-Type", "application/json")
    .set("Content-Encoding", "gzip")
    .send(gzipSync("{}"))
    .expect(415);
  await request(app)
    .post("/events")
    .set(auth)
    .send({
      event: {
        title: "Test",
        description: "Test",
        date: "2030-01-01",
        time: "12:00",
        location: "London",
        image: "unlisted.jpg",
      },
    })
    .expect(400);
});

test("security headers prevent framing and MIME sniffing, and secrets are not cacheable", async () => {
  const app = makeApp();
  const response = await request(app).post("/auth/verify").set(auth).send({}).expect(200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.match(response.headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["set-cookie"], undefined);
  assert.equal(JSON.stringify(response.body).includes(token), false);
  for (const file of ["/.env", "/data/events.json", "/src/app.js"])
    await request(app).get(file).expect(404);
});

test("rate limits bad credentials without locking out the valid administrator", async () => {
  const app = makeApp({ authLimit: 2 });
  await request(app).post("/auth/verify").send({}).expect(401);
  await request(app).post("/auth/verify").send({}).expect(401);
  const blocked = await request(app).post("/auth/verify").send({}).expect(429);
  assert.ok(blocked.headers["retry-after"]);
  await request(app).post("/auth/verify").set(auth).send({}).expect(200);
});

test("limits read traffic and authenticated writes", async () => {
  const app = makeApp({ apiLimit: 2 });
  await request(app).get("/events").expect(200);
  await request(app).get("/events").expect(200);
  await request(app).get("/events").expect(429);
  const writeApp = makeApp({ writeLimit: 1 });
  await request(writeApp).post("/auth/verify").set(auth).send({}).expect(200);
  await request(writeApp).post("/auth/verify").set(auth).send({}).expect(429);
});
