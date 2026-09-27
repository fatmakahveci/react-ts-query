# React Events

A responsive event management application built with React, TypeScript, TanStack Query and Express. Discover events, search by interest or location, and create, edit and delete gatherings.

## Demo

See the current app in action: discover and filter events, browse the calendar, save favourites, build a personal plan, switch themes, and create, edit and delete an event as an administrator. Both recordings use temporary demonstration records.

![React Events demo: discovery, search, filters, calendar, saved events, personal plans, dark mode and administrator create, edit and delete flows](docs/assets/demo.gif)

A shorter tour of the visitor experience:

![React Events visitor demo: discovery, filters, calendar, saved events, personal plan and dark mode](docs/assets/visitor-demo.gif)

## Get started

Use Node.js **24.15+ within Node 24**, or **26+**, and npm. The project pins Node **24.21.0** in `.nvmrc`; CI uses the same version. If you use nvm, run `nvm install` and `nvm use` before installing dependencies.

```bash
npm ci
npm run setup
npm --prefix backend run setup:admin
```

The last command generates a private random administrator key in `backend/.env` (ignored by Git). After starting the app, choose **Admin sign in** and paste the `ADMIN_TOKEN` value from that local file. The key stays in tab memory and is cleared on sign out or refresh. Without a configured key, event browsing remains available and management requests fail closed.

Start the API and frontend in separate terminals:

```bash
npm run dev:api
```

```bash
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` requests to the API at `http://localhost:3000`. Seed events intentionally include historical dates; existing records are preserved.

## Features

- [20 visitor experience improvements](docs/user-experience.md): filters, grid/list/calendar views, saved collections, personal plans, sharing, calendar export, directions and light/dark themes
- Device-local favourites and preferences, recent searches and recently viewed events; no account required
- Responsive event cards, detail pages and a consistent visual system
- Search with shareable URLs, loading feedback, empty states and retry actions
- Validated forms, selectable cover images and prefilled editing
- Mutation feedback, cache invalidation and confirmation before deletion
- Native modal dialogs, keyboard-accessible controls, skip navigation and reduced-motion support
- Typed API client with request cancellation and consistent JSON error handling
- Server-generated IDs, catalogue-validated image choices and serialized, atomic JSON writes
- Administrator-only writes, strict request origin/host checks, security headers and rate limits

## Quality checks

```bash
npm run check         # Frontend coverage, TypeScript, production build and API coverage
npm run format:check  # Consistent source formatting
npm run format       # Apply formatting
npm test             # Frontend and API tests
```

Frontend tests cover search, API requests, create/edit/delete flows, failed-request recovery and protection against duplicate submissions while a save or deletion is pending. They also cover image catalogue failures, revoked administrator access, collection retries, native sharing, system theme changes, invalid URL filters, calendar navigation, storage failures and delayed-response races. TypeScript rejects unused local declarations and parameters.

API tests cover validation, CRUD operations, authorization, rate limits, malformed requests, ID integrity and concurrent writes. Storage failure tests verify that failed writes preserve existing records, remove temporary files and allow later requests to succeed. Administrator-key CLI tests check creation, preservation, rotation, private file permissions and secret-free output. Mutation and CLI tests use temporary fixtures; the CLI runs from an isolated copy without touching `backend/.env`. CI runs frontend and backend checks separately.

## Configuration

| Variable           | Service  | Default                    | Purpose                                                                         |
| ------------------ | -------- | -------------------------- | ------------------------------------------------------------------------------- |
| `VITE_API_URL`     | Frontend | `/api`                     | Backend URL, including any path prefix; set at build time                       |
| `ADMIN_TOKEN`      | Backend  | Unset                      | Random 43–128 character URL-safe administrator key; generate with `setup:admin` |
| `HOST`             | Backend  | `127.0.0.1`                | Bind address; expose only behind an HTTPS reverse proxy                         |
| `PORT`             | Backend  | `3000`                     | HTTP port                                                                       |
| `CORS_ORIGIN`      | Backend  | Unset                      | Exact permitted origin when frontend and backend use different origins          |
| `EVENTS_DATA_FILE` | Backend  | `backend/data/events.json` | Writable event storage file                                                     |
| `IMAGES_DATA_FILE` | Backend  | `backend/data/images.json` | Image catalogue file                                                            |

Copy `frontend/.env.example` to `frontend/.env.local` to customize the client. The backend loads `backend/.env` when started with npm. Shell environment variables take precedence, for example `PORT=3001 npm run dev:api`; update the Vite proxy target if changing the local API port.

## API

| Method | Endpoint                     | Result                                                |
| ------ | ---------------------------- | ----------------------------------------------------- |
| GET    | `/events?search=term&max=10` | Event list; `max` selects the last N matching records |
| POST   | `/auth/verify`               | Verify the administrator key                          |
| GET    | `/events/images`             | Available cover images                                |
| GET    | `/events/:id`                | Event details                                         |
| POST   | `/events`                    | Create event (`201`)                                  |
| PUT    | `/events/:id`                | Replace event fields                                  |
| DELETE | `/events/:id`                | Delete event                                          |

All `POST`, `PUT` and `DELETE` requests require `Authorization: Bearer <ADMIN_TOKEN>`. POST and PUT bodies require `Content-Type: application/json`; `/auth/verify` accepts `{}`. Do not put keys in URLs or any `VITE_*` variable. Requests are limited to 300/minute per IP, writes to 60/minute, and failed authorization attempts to 10 per 15 minutes. Rate limits use process memory and reset on restart.

Create and update bodies use `{ "event": { "title", "description", "date", "time", "location", "image" } }` with string values. Dates use `YYYY-MM-DD`; times use local `HH:mm` and are displayed without timezone conversion. Titles, descriptions and locations are limited to 120, 5,000 and 200 characters. IDs are controlled by the server. Errors use `{ "message": "..." }` and an appropriate HTTP status.

Events can also include an optional `category`: `Community`, `Workshops`, `Networking`, `Outdoors` or `Culture`. The API validates this field; older records remain compatible and appear under Community. Saved events and personal plans live on the visitor's device and do not represent bookings or registration. See the [visitor guide](docs/user-experience.md) for storage and calendar behaviour.

## Build and hosting

`npm --prefix frontend run build` produces `frontend/dist`. Configure the host to serve `index.html` for client routes such as `/events/:id`. Forward `/api/*` to the Express backend, stripping `/api`, or build with `VITE_API_URL` and configure `CORS_ORIGIN` on the backend. Event images are served by the backend.

The backend is a **single-process, local/demo service**. Serialized atomic writes prevent lost updates within that process; JSON storage does not support multiple server instances. Write access uses one administrator key; there is no user registration or per-user ownership. A public multi-user deployment needs individual identities, per-user authorization and transactional database storage. Serve both the frontend and API through HTTPS. Keep the backend bound to loopback behind the reverse proxy; the API does not trust forwarded IP headers, so proxied clients share that proxy’s rate limit. Public hosting must set `CORS_ORIGIN` to the exact HTTPS frontend origin.

To revoke administrator access, run `npm --prefix backend run setup:admin -- --rotate` and restart the API. Signing out removes the key from the current tab; rotation revokes all copies of the old key.

## Structure

```text
frontend/
├── public/                       Static files served at fixed URLs
└── src/
    ├── app/                      App providers and route configuration
    ├── assets/images/            Images imported by components
    ├── components/
    │   ├── layout/               Shared application layout
    │   └── ui/                   Reusable feedback and dialog components
    ├── features/auth/            Administrator access UI and tests
    ├── features/events/
    │   ├── api/                  Event API client and its tests
    │   ├── components/           Event cards, forms and discovery sections
    │   ├── pages/                Route-level event screens
    │   ├── hooks/                Event discovery state and URL coordination
    │   ├── lib/                  Discovery filters and calendar export
    │   ├── __tests__/            Discovery and workflow integration tests
    │   └── event.types.ts        Event-specific TypeScript types
    ├── lib/                      Shared API transport and utility functions
    ├── styles/                   Global application styles
    ├── testing/                  Shared test environment setup
    ├── main.tsx                  Browser entry point
    └── vite-env.d.ts             Vite environment declarations
backend/
├── src/
│   ├── app.js                    Express application (without a listener)
│   ├── server.js                 HTTP server entry point
│   └── middleware/               Authorization and request security
├── scripts/                      Private administrator key setup
├── data/                         Persistent JSON records and image catalogue
├── public/                       Event cover images served by Express
└── tests/integration/            Isolated API regression tests
```

React components use PascalCase filenames; route components end in `Page`. Non-component modules use descriptive lowercase names, such as `events.api.ts`, `event.types.ts` and `format-date.ts`. Only files containing JSX use `.tsx`. Tests use `.test.ts` or `.test.tsx`, live alongside their module or within the feature's `__tests__` directory, and share setup from `testing`.

Keep event-specific code inside `features/events`; reusable UI belongs in `components`. Backend data and public asset paths resolve relative to the package. Use `npm run dev:api` to load `backend/.env` automatically.

See the [contributing guide](.github/CONTRIBUTING.md), [security policy](SECURITY.md) and [license](LICENSE.md).
