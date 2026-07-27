# Media Voyage

Media Voyage is a personal media-tracking app for keeping tabs on the movies, shows, games, and books you're watching, playing, or reading. Track status, progress, ratings, reviews, and collections all in one library, and see what your friends are up to.

## Features

- Library of movies, shows, games, and books with status, progress, and per-season tracking for shows
- Grid and table views, filtering (status, type, rating, source, tags, dates), saved filter presets, and a "Pick for me" random picker for your Planned list
- Ratings, reviews, tags, and favorites
- Collections for grouping related media
- Dashboard with library stats and quick actions
- Activity calendar to see consumption history over time
- Friends: follow other users, browse their libraries and collections, and copy items into your own library
- Per-entry visibility with a configurable default, plus direct library sharing
- Trash with restore for soft-deleted entries
- Tag and source management
- Media lookup via IGDB (games), OMDB (movies/shows), and Open Library (books)
- CSV export of your whole library
- Appearance settings: light/dark theme, cover art toggle and size, reduced motion

## Tech Stack

- **Frontend:** React, Vite, TanStack Router/Query, Mantine
- **Backend:** Fastify, Better Auth
- **Database:** PostgreSQL with Drizzle ORM
- **Monorepo:** pnpm workspaces, TypeScript

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in the required values: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ random characters), `BETTER_AUTH_URL`, `FRONTEND_URL`, and the IGDB/OMDB credentials. Open Library needs no API key.

   Registration is gated by `SIGNUP_INVITE_CODE` — signups must supply that code, and it is required when `NODE_ENV=production`.

3. Push the database schema:

   ```bash
   pnpm db:push
   ```

4. Start the frontend and backend in development mode:

   ```bash
   pnpm dev
   ```

## Project Structure

- `apps/frontend` — React/Vite client
- `apps/backend` — Fastify API
- `packages/shared` — shared Drizzle schemas, Zod contracts, and types

## Scripts

Run from the repo root:

| Script | Description |
| --- | --- |
| `pnpm dev` | Run frontend and backend together |
| `pnpm frontend` / `pnpm backend` | Run just one side |
| `pnpm lint` | Lint the frontend |
| `pnpm db:push` | Push the Drizzle schema to the database |
| `pnpm studio` | Open Drizzle Studio |
| `pnpm frontend:build` / `pnpm backend:build` | Production builds |
