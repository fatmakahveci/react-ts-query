# React Query Events

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-149ECA?logo=react&logoColor=white)](frontend/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)](backend/)
[![Last commit](https://img.shields.io/github/last-commit/fatmakahveci/react-ts-query)](https://github.com/fatmakahveci/react-ts-query/commits/main)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE.md)

A full-stack event management exercise that pairs a React client with TanStack Query and a lightweight Express API.

## Highlights

- Browse, search, create, and edit events
- Server-state caching and mutations with TanStack Query
- Loading and error feedback around network operations
- Local JSON-backed Express API for repeatable development

## Technology

- React
- TypeScript
- Vite
- TanStack Query
- React Router
- Express
- Styled Components

## Getting Started

### Prerequisites

- Node.js 20.19 or newer
- npm

### Installation

```bash
cd backend
npm install
npm start

# In a second terminal
cd frontend
npm install
npm run dev
```

The frontend opens on http://localhost:5173 and communicates with the local backend on port 3000.

## Quality Checks

```bash
cd frontend && npm run test:coverage
cd frontend && npm run typecheck
cd frontend && npm run build
cd backend && npm run test:coverage
```

## Repository Structure

- `frontend/src/app/components/Events` — event screens and forms
- `frontend/src/app/util/http.tsx` — API queries and mutations
- `backend` — Express service and JSON data

## Project Resources

- [Changelog](CHANGELOG.md)
- [Contributing guide](.github/CONTRIBUTING.md)
- [Security policy](.github/SECURITY.md)
- [License](LICENSE.md)
