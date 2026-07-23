import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  index,
  pgEnum,
  integer,
  unique,
} from "drizzle-orm/pg-core";

export const mediaTypeEnum = pgEnum("media_type", [
  "movie",
  "show",
  "game",
  "book",
]);

export const statusEnum = pgEnum("media_status", [
  "planned",
  "in_progress",
  "completed",
  "dropped",
  "on_hold",
  "revisiting",
]);

export const visibilityEnum = pgEnum("visibility", [
  "private",
  "friends",
  "public",
]);

// Main Media (Canonical)
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: mediaTypeEnum("type").notNull(),

    originalTitle: text("original_title"),
    description: text("description"),
    imageUrl: text("image_url"),
    source: text("source"),
    externalId: text("external_id"),

    metadata: jsonb("metadata").default({}), // genres, director, author, etc.

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("media_source_external_id_unique").on(
      table.source,
      table.externalId,
    ),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("sources_user_normalized_name_unique").on(
      table.userId,
      table.normalizedName,
    ),
  ],
);

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
    statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(),
    rating: integer("rating"),
    review: text("review"),
    notes: text("notes"),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    progress: integer("progress").default(0), // 0 to 100

    favorite: boolean("favorite").default(false),

    rewatches: integer("rewatches").default(0),

    lastProgressUpdate: timestamp("last_progress_update").defaultNow(),

    timeSpent: integer("time_spent"),

    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),

    visibility: visibilityEnum("visibility").default("private"), // 'private' | 'friends' | 'public'

    // Flexible future-proofing
    customFields: jsonb("custom_fields").default({}),

    seasonsProgress: jsonb("seasons_progress").default([]),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    unique("user_media_unique").on(table.userId, table.mediaId),
    index("user_media_status_changed_idx").on(
      table.userId,
      table.status,
      table.statusChangedAt,
    ),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("tags_user_normalized_name_unique").on(
      table.userId,
      table.normalizedName,
    ),
  ],
);

export const userMediaTags = pgTable(
  "user_media_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userMediaId: uuid("user_media_id")
      .references(() => userMedia.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("user_media_tags_unique").on(table.userMediaId, table.tagId),
    index("user_media_tags_tag_idx").on(table.tagId),
  ],
);

export const userMediaStatusHistory = pgTable(
  "user_media_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userMediaId: uuid("user_media_id")
      .references(() => userMedia.id, { onDelete: "cascade" })
      .notNull(),
    fromStatus: statusEnum("from_status"),
    toStatus: statusEnum("to_status").notNull(),
    progressSnapshot: integer("progress_snapshot"),
    source: text("source").notNull(),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_media_status_history_entry_changed_idx").on(
      table.userMediaId,
      table.changedAt,
    ),
  ],
);

export const mediaCollection = pgTable("media_collection", {
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

export const mediaCollectionItems = pgTable(
  "media_collection_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .references(() => mediaCollection.id, { onDelete: "cascade" })
      .notNull(),
    userMediaId: uuid("user_media_id")
      .references(() => userMedia.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("media_collection_item_unique").on(
      table.collectionId,
      table.userMediaId,
    ),
    index("media_collection_items_collection_position_idx").on(
      table.collectionId,
      table.position,
    ),
  ],
);

export const mediaRelations = relations(media, ({ many }) => ({
  userEntries: many(userMedia),
}));

export const userMediaRelations = relations(userMedia, ({ one, many }) => ({
  user: one(user, {
    fields: [userMedia.userId],
    references: [user.id],
  }),
  media: one(media, {
    fields: [userMedia.mediaId],
    references: [media.id],
  }),
  source: one(sources, {
    fields: [userMedia.sourceId],
    references: [sources.id],
  }),
  collectionItems: many(mediaCollectionItems),
  statusHistory: many(userMediaStatusHistory),
  tagLinks: many(userMediaTags),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  user: one(user, {
    fields: [sources.userId],
    references: [user.id],
  }),
  userMediaEntries: many(userMedia),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(user, {
    fields: [tags.userId],
    references: [user.id],
  }),
  mediaLinks: many(userMediaTags),
}));

export const userMediaTagsRelations = relations(userMediaTags, ({ one }) => ({
  tag: one(tags, {
    fields: [userMediaTags.tagId],
    references: [tags.id],
  }),
  userMedia: one(userMedia, {
    fields: [userMediaTags.userMediaId],
    references: [userMedia.id],
  }),
}));

export const userMediaStatusHistoryRelations = relations(
  userMediaStatusHistory,
  ({ one }) => ({
    userMedia: one(userMedia, {
      fields: [userMediaStatusHistory.userMediaId],
      references: [userMedia.id],
    }),
  }),
);

export const mediaCollectionRelations = relations(
  mediaCollection,
  ({ many, one }) => ({
    user: one(user, {
      fields: [mediaCollection.userId],
      references: [user.id],
    }),
    items: many(mediaCollectionItems),
  }),
);

export const mediaCollectionItemsRelations = relations(
  mediaCollectionItems,
  ({ one }) => ({
    list: one(mediaCollection, {
      fields: [mediaCollectionItems.collectionId],
      references: [mediaCollection.id],
    }),
    userMedia: one(userMedia, {
      fields: [mediaCollectionItems.userMediaId],
      references: [userMedia.id],
    }),
  }),
);

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
