import { createHash, timingSafeEqual } from "node:crypto";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;
const hash = (value) => createHash("sha256").update(value).digest();
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function createSecurity({
  adminToken = process.env.ADMIN_TOKEN || "",
  corsOrigin = process.env.CORS_ORIGIN || "",
  apiLimit = 300,
  writeLimit = 60,
  authLimit = 10,
} = {}) {
  if (adminToken && !tokenPattern.test(adminToken)) {
    throw new Error("ADMIN_TOKEN must be a random URL-safe key of 43–128 characters.");
  }
  const origins = new Set(
    [3000, 4173, 5173].flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]),
  );
  const hosts = new Set(localHosts);
  if (corsOrigin) {
    const url = new URL(corsOrigin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== corsOrigin) {
      throw new Error("CORS_ORIGIN must be an exact HTTP(S) origin without a trailing slash.");
    }
    if (url.protocol !== "https:" && !localHosts.has(url.hostname)) {
      throw new Error("Non-local CORS_ORIGIN must use HTTPS.");
    }
    origins.add(corsOrigin);
    hosts.add(url.hostname);
  }
  // Fixed-size digests let timingSafeEqual compare keys of different permitted lengths.
  const expected = adminToken ? hash(adminToken) : null;
  function authenticated(req) {
    const match = /^Bearer ([A-Za-z0-9_-]{43,128})$/i.exec(req.get("authorization") || "");
    return Boolean(expected && match && timingSafeEqual(expected, hash(match[1])));
  }
  const limiter = (limit, windowMs, extra = {}) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Too many requests. Please try again later." },
      ...extra,
    });
  return {
    headers: helmet({
      strictTransportSecurity: process.env.NODE_ENV === "production" ? undefined : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
    apiLimiter: limiter(apiLimit, 60_000),
    writeLimiter: limiter(writeLimit, 60_000),
    // Failed attempts must not lock out a valid administrator sharing the same IP.
    authLimiter: limiter(authLimit, 15 * 60_000, { skip: authenticated }),
    requestPolicy(req, res, next) {
      // Validate Host as well as Origin to reject DNS rebinding against the local API.
      const authority = req.get("host") || "";
      if (!/^[A-Za-z0-9.:[\]-]+$/.test(authority))
        return res.status(403).json({ message: "Host is not allowed." });
      let host;
      try {
        host = new URL(`http://${req.get("host")}`).hostname;
      } catch {
        /* Reject below. */
      }
      if (!hosts.has(host)) return res.status(403).json({ message: "Host is not allowed." });
      const origin = req.get("origin");
      res.vary("Origin");
      if (origin && !origins.has(origin)) {
        return res.status(403).json({ message: "Origin is not allowed." });
      }
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      }
      // Browsers send preflight requests without the actual request's bearer credentials.
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    },
    requireAdmin(req, res, next) {
      res.setHeader("Cache-Control", "no-store");
      if (!expected)
        return res.status(503).json({ message: "Event management is not configured." });
      if (!authenticated(req)) {
        res.setHeader("WWW-Authenticate", "Bearer");
        return res.status(401).json({ message: "Administrator sign-in is required." });
      }
      next();
    },
    requireJson(req, res, next) {
      if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
        return res.status(415).json({ message: "Content-Type must be application/json." });
      }
      next();
    },
  };
}
