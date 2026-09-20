# ADR 006: React and Vite Frontend Architecture

## Status
Accepted

## Context
We require a responsive, fast, and easily maintainable Single Page Application (SPA) for the user dashboard.

## Decision
Use React 18, TypeScript, and Vite. The codebase is organized by feature (`src/features/...`) rather than horizontally by type (e.g., keeping components, hooks, and API calls for workflows together). We implement a centralized API client that automatically handles JWT injection and normalizes HTTP errors.

## Consequences
Vite provides exceptionally fast Hot Module Replacement (HMR) and builds. Feature-based structure isolates domain concerns on the frontend and scales well. React Context is sufficient for global authentication state without the boilerplate of Redux.

## Alternatives Considered
Next.js (App Router). Rejected because Server-Side Rendering (SSR) adds unnecessary complexity for an authenticated B2B dashboard. A static SPA deployed via Nginx drastically simplifies the deployment architecture.
