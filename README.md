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
- Media lookup via TMDB (movies and shows), IGDB (games), and Open Library (books)
- CSV export of your whole library
- Semantic library search using catalog descriptions and provider terms
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

2. Copy `.env.example` to `.env` and fill in the required values: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ random characters), `BETTER_AUTH_URL`, `FRONTEND_URL`, `TMDB_API_READ_ACCESS_TOKEN`, and the IGDB credentials. Open Library needs no API key; `OPEN_LIBRARY_CONTACT_EMAIL` is optional and identifies regular API traffic. Semantic embeddings run locally with MiniLM; the model is downloaded and cached on the first embedding run.

   To refresh existing provider metadata safely, run `pnpm refresh-catalog-metadata -- --dry-run`. After reviewing the output, use `pnpm refresh-catalog-metadata -- --apply` to write changes.

   To preview catalog embeddings without loading the local model, run `pnpm embed-catalog-media -- --dry-run`. After reviewing the output, use `pnpm embed-catalog-media -- --apply` to download/cache MiniLM and generate missing or stale embeddings.

   When upgrading an existing semantic-search database, apply `packages/shared/drizzle/migrate_media_embeddings_to_minilm.sql` once before deploying the MiniLM backend. It clears only the old derived vectors, changes the column to 384 dimensions, and guarantees no 1536-dimensional vector remains. The backend Docker cache is `/app/.cache/transformers`; keep that path on persistent storage in Dokploy and ensure it is writable by UID/GID `1000:1000`.

3. Push the database schema:

   ```bash
   pnpm db:push
   ```

4. Start the frontend and backend in development mode:

   ```bash
   pnpm dev
   ```

## TMDB Provider Cutover

This one-time migration is only for databases that still contain legacy TVMaze
catalog records. That identity is not compatible with TMDB. During
the provider cutover, stop application writes, review the target database, and
clear the catalog in a transaction:

```sql
BEGIN;
DELETE FROM media;
COMMIT;
```

The existing foreign-key cascades remove related library and recommendation
data while retaining users and authentication records. Run this manually only
after the TMDB-enabled deployment and token are ready.

## Project Structure

- `apps/frontend` — React/Vite client
- `apps/backend` — Fastify API
- `packages/shared` — shared Drizzle schemas, Zod contracts, and types

## Scripts

Run from the repo root:

| Script                                       | Description                             |
| -------------------------------------------- | --------------------------------------- |
| `pnpm dev`                                   | Run frontend and backend together       |
| `pnpm frontend` / `pnpm backend`             | Run just one side                       |
| `pnpm lint`                                  | Lint the frontend                       |
| `pnpm format`                                | Format root manifests and all packages  |
| `pnpm format:check`                          | Check formatting across all packages    |
| `pnpm db:push`                               | Push the Drizzle schema to the database |
| `pnpm studio`                                | Open Drizzle Studio                     |
| `pnpm refresh-catalog-metadata -- --dry-run` | Preview provider metadata refresh       |
| `pnpm embed-catalog-media -- --dry-run`      | Preview catalog embedding backfill      |
| `pnpm frontend:build` / `pnpm backend:build` | Production builds                       |
