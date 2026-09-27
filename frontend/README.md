# React Events frontend

React 19 + TypeScript 7 + Vite 8 with TanStack Query and React Router.

Use Node.js 24.15+ within Node 24, or 26+. The root `.nvmrc` pins the Node 24 release used by CI.

From the repository root, run `npm ci`, `npm run setup`, then run `npm run dev:api` and `npm run dev` in separate terminals. The frontend runs at http://localhost:5173; Vite proxies `/api` to the backend on port 3000.

## Commands in this directory

```bash
npm run dev
npm run test:coverage
npm run typecheck
npm run build
npm run preview
```

`npm run test:watch` runs interactive tests. See the [root README](../README.md) for configuration, API details and hosting requirements.

## Source layout

- `src/main.tsx`: browser bootstrap; `src/app`: providers and route configuration.
- `src/features/events`: event API, data types, components, pages and workflow tests.
- `src/components`: shared layout and UI; `src/lib`: general utilities.
- `src/styles` and `src/assets/images`: application styling and imported images.
- `src/testing/setup.ts`: shared Vitest environment.

Component filenames use PascalCase. Route screens end in `Page`; modules without JSX use `.ts` and descriptive lowercase names. Keep code specific to events within its feature directory.

Use `features/events/api/events.queries.ts` for query keys and options. List and detail caches have separate keys; successful writes cancel outdated detail requests, cache the server response and refresh lists in the background.

Discovery state lives in `features/events/hooks/use-event-discovery.ts`. URL validation and the available filter options live in `features/events/lib/event-filters.ts`; UI controls and parsing use the same definitions. Calendar selections follow URL navigation and invalid parameters fall back to supported defaults.

Visitor preference keys and list limits are defined in `lib/visitor-preferences.ts`. Updates notify only subscribers to the changed preference. Bulk removals read the latest list and persist once; blocked storage falls back to memory. Credentials remain separate from visitor preferences.
