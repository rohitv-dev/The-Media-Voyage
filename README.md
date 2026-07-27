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
- Trash with restore for soft-deleted entries
- Tag and source management
- Media lookup via IGDB (games) and OMDB (movies/shows)

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

2. Copy `.env.example` to `.env` and fill in the required values (database connection, auth secret, IGDB/OMDB API credentials).

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

See [AGENTS.md](AGENTS.md) for detailed contributor guidelines.
