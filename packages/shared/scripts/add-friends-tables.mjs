/**
 * Additive schema sync for the friends/social feature.
 *
 * `drizzle-kit push` opens an interactive suggestion prompt as soon as a diff
 * contains unique constraints, which can't be answered non-interactively, so
 * this applies the same change as plain SQL. Every statement is additive and
 * guarded with IF NOT EXISTS — nothing here drops or rewrites existing data.
 *
 *   node packages/shared/scripts/add-friends-tables.mjs
 */
import "dotenv/config";
import pg from "pg";

const statements = [
  `do $$ begin
     create type friendship_status as enum ('pending', 'declined', 'accepted');
   exception when duplicate_object then null;
   end $$`,

  `create table if not exists friendships (
     id uuid primary key default gen_random_uuid(),
     requester_id text not null references "user"(id) on delete cascade,
     addressee_id text not null references "user"(id) on delete cascade,
     status friendship_status not null default 'pending',
     created_at timestamp default now(),
     responded_at timestamp,
     constraint friendships_pair_unique unique (requester_id, addressee_id)
   )`,

  `create index if not exists friendships_addressee_status_idx
     on friendships (addressee_id, status)`,

  `create index if not exists friendships_requester_status_idx
     on friendships (requester_id, status)`,

  `create table if not exists user_media_reactions (
     id uuid primary key default gen_random_uuid(),
     user_media_id uuid not null references user_media(id) on delete cascade,
     user_id text not null references "user"(id) on delete cascade,
     value integer not null,
     created_at timestamp default now(),
     updated_at timestamp default now(),
     constraint user_media_reactions_unique unique (user_media_id, user_id)
   )`,

  `create index if not exists user_media_reactions_entry_idx
     on user_media_reactions (user_media_id)`,

  `create table if not exists user_media_comments (
     id uuid primary key default gen_random_uuid(),
     user_media_id uuid not null references user_media(id) on delete cascade,
     user_id text not null references "user"(id) on delete cascade,
     body text not null,
     created_at timestamp default now(),
     updated_at timestamp default now()
   )`,

  `create index if not exists user_media_comments_entry_created_idx
     on user_media_comments (user_media_id, created_at)`,

  `alter table "user"
     add column if not exists default_visibility visibility not null default 'private'`,
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

try {
  await client.query("begin");

  for (const statement of statements) {
    const label = statement.trim().split("\n")[0].trim();
    process.stdout.write(`  ${label}\n`);
    await client.query(statement);
  }

  await client.query("commit");
  console.log("\nFriends schema applied.");
} catch (error) {
  await client.query("rollback");
  console.error("\nFailed, rolled back:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
