import app from "./app.js";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log(`Server running at http://${host}:${port}`),
);
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
