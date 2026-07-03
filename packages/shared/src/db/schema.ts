import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, jsonb, index, pgEnum, integer, unique } from "drizzle-orm/pg-core";

export const mediaTypeEnum = pgEnum("media_type", ["movie", "show", "game", "book"]);

export const statusEnum = pgEnum("media_status", [
  "planned",
  "in_progress",
  "completed",
  "dropped",
  "on_hold",
  "revisiting",
]);

export const visibilityEnum = pgEnum("visibility", ["private", "friends", "public"]);

// Main Media (Canonical)
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: mediaTypeEnum("type").notNull(),

  originalTitle: text("original_title"),
  description: text("description"),
  imageUrl: text("image_url"),
  releaseDate: timestamp("release_date"),
  externalId: text("external_id"), // Future TMDB/IGDB/etc.

  metadata: jsonb("metadata").default({}), // genres, director, author, etc.

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-specific tracking (the heart)
export const userMedia = pgTable(
  "user_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),

    status: statusEnum("status").notNull().default("planned"),
    rating: integer("rating"),
    review: text("review"),
    notes: text("notes"),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    progress: integer("progress").default(0), // 0 to 100

    favorite: boolean("favorite").default(false),

    rewatches: integer("rewatches").default(0), // How many times you've re-watched/re-read/re-played

    lastProgressUpdate: timestamp("last_progress_update").defaultNow(),

    timeSpent: integer("time_spent"), // Minutes spent (great for games/books/shows)

    source: text("source"), // "Netflix", "Theater", "Kindle", "Steam", etc.

    tags: text("tags").array().default([]), // e.g. ["mind-bending", "comfort-watch", "cry-fest"]

    visibility: visibilityEnum("visibility").default("private"), // 'private' | 'friends' | 'public' (future-proof)

    // Flexible future-proofing
    customFields: jsonb("custom_fields").default({}),

    seasonsProgress: jsonb("seasons_progress").default([]),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    isDeleted: boolean("is_deleted").default(false),
  },
  (table) => [unique("user_media_unique").on(table.userId, table.mediaId)],
);

export const mediaList = pgTable("media_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").default("private"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mediaListItems = pgTable("media_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  listId: uuid("list_id")
    .references(() => mediaList.id, { onDelete: "cascade" })
    .notNull(),
  mediaId: uuid("media_id")
    .references(() => media.id, { onDelete: "cascade" })
    .notNull(),
  position: integer("position"), // For ordering items in the list
  addedAt: timestamp("added_at").defaultNow(),
  notes: text("notes"), // Optional personal notes about this item in the list
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaRelations = relations(media, ({ many }) => ({
  userEntries: many(userMedia),
}));

export const userMediaRelations = relations(userMedia, ({ one }) => ({
  user: one(user, {
    fields: [userMedia.userId],
    references: [user.id],
  }),
  media: one(media, {
    fields: [userMedia.mediaId],
    references: [media.id],
  }),
}));

export const mediaListRelations = relations(mediaList, ({ many, one }) => ({
  user: one(user, {
    fields: [mediaList.userId],
    references: [user.id],
  }),
  items: many(mediaListItems),
}));

export const mediaListItemsRelations = relations(mediaListItems, ({ one }) => ({
  list: one(mediaList, {
    fields: [mediaListItems.listId],
    references: [mediaList.id],
  }),
  media: one(media, {
    fields: [mediaListItems.mediaId],
    references: [media.id],
  }),
}));

// Better Auth Generated Tables

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
