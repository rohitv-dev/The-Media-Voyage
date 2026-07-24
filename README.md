# Media Voyage

Media Voyage is a personal media-tracking app for keeping tabs on the games, movies, and shows you're watching or playing. Track status, progress, ratings, reviews, and collections all in one library.

## Features

- Library of media items with status (e.g. playing, watching, completed) and progress tracking
- Ratings, reviews, tags, and favorites
- Collections for grouping related media
- Activity calendar to see consumption history over time
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
