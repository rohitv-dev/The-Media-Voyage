import { relations, sql } from "drizzle-orm";
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
  uniqueIndex,
  real,
  check,
  vector,
  customType,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "../embedding";

const tsvector = customType<{ data: string; notNull: true }>({
  dataType: () => "tsvector",
});

type MovieOrShowMetadata = {
  genre?: string[];
  keywords?: string[];
  runtime?: number;
  catalogRating?: number;
};

type GameMetadata = {
  genre?: string[];
  themes?: string[];
  keywords?: string[];
  gameModes?: string[];
  playerPerspectives?: string[];
  catalogRating?: number;
};

type BookMetadata = {
  genre?: string[];
  subjects?: string[];
  numberOfPages?: number;
};

export type CatalogMetadataByType = {
  movie: MovieOrShowMetadata;
  show: MovieOrShowMetadata;
  game: GameMetadata;
  book: BookMetadata;
};

export type CatalogMetadata<
  T extends keyof CatalogMetadataByType = keyof CatalogMetadataByType,
> = CatalogMetadataByType[T];

export const mediaTypeEnum = pgEnum("media_type", [
  "movie",
  "show",
  "game",
  "book",
]);

export const statusEnum = pgEnum("media_status", [
  "planned",
  "in_progress",
  "playing",
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

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "declined",
  "accepted",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "media_like",
  "media_dislike",
  "media_comment",
  "friend_request",
  "friend_request_accepted",
  "friend_recommendation",
  "friend_recommendation_response",
]);

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending",
  "resolved",
]);

export const recommendationOutcomeEnum = pgEnum("recommendation_outcome", [
  "added_to_library",
  "already_completed",
  "not_interested",
]);

// Main Media (Canonical)
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: mediaTypeEnum("type").notNull(),

    description: text("description"),
    imageUrl: text("image_url"),
    imageFocusX: real("image_focus_x"),
    imageFocusY: real("image_focus_y"),
    source: text("source"),
    externalId: text("external_id"),

    metadata: jsonb("metadata").$type<CatalogMetadata>().default({}).notNull(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(sql`
      setweight(
        to_tsvector('simple'::regconfig, coalesce("title", '')),
        'A'
      ) ||
      setweight(
        to_tsvector(
          'simple'::regconfig,
          coalesce("metadata"->>'genre', '') ||
          ' ' ||
          coalesce("metadata"->>'keywords', '') ||
          ' ' ||
          coalesce("metadata"->>'themes', '') ||
          ' ' ||
          coalesce("metadata"->>'gameModes', '') ||
          ' ' ||
          coalesce("metadata"->>'playerPerspectives', '') ||
          ' ' ||
          coalesce("metadata"->>'subjects', '')
        ),
        'B'
      ) ||
      setweight(
        to_tsvector('simple'::regconfig, coalesce("description", '')),
        'C'
      )
    `),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    embeddingModel: text("embedding_model"),
    embeddingUpdatedAt: timestamp("embedding_updated_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("media_source_external_id_unique").on(
      table.source,
      table.externalId,
    ),
    index("media_search_vector_idx").using("gin", table.searchVector),
    index("media_title_trgm_idx").using(
      "gist",
      sql`${table.title} gist_trgm_ops`,
    ),
    check(
      "media_image_focus_x_range",
      sql`${table.imageFocusX} is null or (${table.imageFocusX} >= 0 and ${table.imageFocusX} <= 1)`,
    ),
    check(
      "media_image_focus_y_range",
      sql`${table.imageFocusY} is null or (${table.imageFocusY} >= 0 and ${table.imageFocusY} <= 1)`,
    ),
    check(
      "media_image_focus_pair",
      sql`(${table.imageFocusX} is null) = (${table.imageFocusY} is null)`,
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
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
    publicId: uuid("public_id").defaultRandom().unique().notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    imageFocusX: real("image_focus_x"),
    imageFocusY: real("image_focus_y"),

    status: statusEnum("status").notNull().default("planned"),
    rating: integer("rating"),
    review: text("review"),
    notes: text("notes"),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    progress: integer("progress").default(0).notNull(), // 0 to 100

    favorite: boolean("favorite").default(false).notNull(),

    lastProgressUpdate: timestamp("last_progress_update")
      .defaultNow()
      .notNull(),

    timeSpent: integer("time_spent"),

    pagesRead: integer("pages_read"),

    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),

    visibility: visibilityEnum("visibility").default("private").notNull(), // 'private' | 'friends' | 'public'

    seasonsProgress: jsonb("seasons_progress").default([]).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    unique("user_media_unique").on(table.userId, table.mediaId),
    check(
      "user_media_image_focus_x_range",
      sql`${table.imageFocusX} is null or (${table.imageFocusX} >= 0 and ${table.imageFocusX} <= 1)`,
    ),
    check(
      "user_media_image_focus_y_range",
      sql`${table.imageFocusY} is null or (${table.imageFocusY} >= 0 and ${table.imageFocusY} <= 1)`,
    ),
    check(
      "user_media_image_focus_pair",
      sql`(${table.imageFocusX} is null) = (${table.imageFocusY} is null)`,
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
  publicId: uuid("public_id").defaultRandom().unique().notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").default("private").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
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

/**
 * A friendship is stored as a single directed row: the requester on one side,
 * the addressee on the other. Nothing mirrors it when accepted, so any lookup
 * between two people has to check both orderings — see `friendshipBetween` in
 * the backend friends queries.
 */
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: text("requester_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    addresseeId: text("addressee_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
  },
  (table) => [
    unique("friendships_pair_unique").on(table.requesterId, table.addresseeId),
    index("friendships_addressee_status_idx").on(
      table.addresseeId,
      table.status,
    ),
    index("friendships_requester_status_idx").on(
      table.requesterId,
      table.status,
    ),
  ],
);

// One reaction per person per entry: +1 like, -1 dislike. Toggling off deletes
// the row rather than storing a zero.
export const userMediaReactions = pgTable(
  "user_media_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userMediaId: uuid("user_media_id")
      .references(() => userMedia.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("user_media_reactions_unique").on(table.userMediaId, table.userId),
    index("user_media_reactions_entry_idx").on(table.userMediaId),
  ],
);

export const userMediaComments = pgTable(
  "user_media_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userMediaId: uuid("user_media_id")
      .references(() => userMedia.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("user_media_comments_entry_created_idx").on(
      table.userMediaId,
      table.createdAt,
    ),
  ],
);

export const mediaRecommendations = pgTable(
  "media_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: text("recipient_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    senderId: text("sender_id")
      .references(() => user.id, {
        onDelete: "cascade",
      })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    recipientUserMediaId: uuid("recipient_user_media_id").references(
      () => userMedia.id,
      { onDelete: "set null" },
    ),
    senderNote: text("sender_note"),
    recipientNote: text("recipient_note"),
    status: recommendationStatusEnum("status").notNull().default("pending"),
    outcome: recommendationOutcomeEnum("outcome"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("media_recommendations_recipient_status_created_idx").on(
      table.recipientId,
      table.status,
      table.createdAt,
    ),
    index("media_recommendations_sender_created_idx").on(
      table.senderId,
      table.createdAt,
    ),
    uniqueIndex("media_recommendations_friend_pending_unique")
      .on(table.senderId, table.recipientId, table.mediaId)
      .where(sql`${table.status} = 'pending'`),
    check(
      "media_recommendations_sender_recipient_distinct_check",
      sql`${table.senderId} <> ${table.recipientId}`,
    ),
    check(
      "media_recommendations_status_fields_check",
      sql`(
        ${table.status} = 'pending'
        and ${table.outcome} is null
        and ${table.resolvedAt} is null
        and ${table.recipientNote} is null
        and ${table.recipientUserMediaId} is null
      ) or (
        ${table.status} = 'resolved'
        and ${table.outcome} is not null
        and ${table.resolvedAt} is not null
      )`,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: text("recipient_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    actorId: text("actor_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    type: notificationTypeEnum("type").notNull(),
    userMediaId: uuid("user_media_id").references(() => userMedia.id, {
      onDelete: "cascade",
    }),
    recommendationId: uuid("recommendation_id").references(
      () => mediaRecommendations.id,
      { onDelete: "cascade" },
    ),
    seenAt: timestamp("seen_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(
      table.recipientId,
      table.createdAt,
    ),
    index("notifications_recipient_seen_idx").on(
      table.recipientId,
      table.seenAt,
    ),
  ],
);

export const dismissedSystemRecommendations = pgTable(
  "dismissed_system_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    dismissedAt: timestamp("dismissed_at").defaultNow().notNull(),
  },
  (table) => [
    unique("dismissed_system_recommendations_unique").on(
      table.userId,
      table.source,
      table.externalId,
    ),
  ],
);

export const mediaRelations = relations(media, ({ many }) => ({
  userEntries: many(userMedia),
  recommendations: many(mediaRecommendations),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(user, {
    fields: [friendships.requesterId],
    references: [user.id],
    relationName: "friendshipRequester",
  }),
  addressee: one(user, {
    fields: [friendships.addresseeId],
    references: [user.id],
    relationName: "friendshipAddressee",
  }),
}));

export const userMediaReactionsRelations = relations(
  userMediaReactions,
  ({ one }) => ({
    userMedia: one(userMedia, {
      fields: [userMediaReactions.userMediaId],
      references: [userMedia.id],
    }),
    user: one(user, {
      fields: [userMediaReactions.userId],
      references: [user.id],
    }),
  }),
);

export const userMediaCommentsRelations = relations(
  userMediaComments,
  ({ one }) => ({
    userMedia: one(userMedia, {
      fields: [userMediaComments.userMediaId],
      references: [userMedia.id],
    }),
    user: one(user, {
      fields: [userMediaComments.userId],
      references: [user.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(user, {
    fields: [notifications.recipientId],
    references: [user.id],
    relationName: "notificationRecipient",
  }),
  actor: one(user, {
    fields: [notifications.actorId],
    references: [user.id],
    relationName: "notificationActor",
  }),
  userMedia: one(userMedia, {
    fields: [notifications.userMediaId],
    references: [userMedia.id],
  }),
  recommendation: one(mediaRecommendations, {
    fields: [notifications.recommendationId],
    references: [mediaRecommendations.id],
  }),
}));

export const mediaRecommendationsRelations = relations(
  mediaRecommendations,
  ({ one, many }) => ({
    recipient: one(user, {
      fields: [mediaRecommendations.recipientId],
      references: [user.id],
      relationName: "recommendationRecipient",
    }),
    sender: one(user, {
      fields: [mediaRecommendations.senderId],
      references: [user.id],
      relationName: "recommendationSender",
    }),
    media: one(media, {
      fields: [mediaRecommendations.mediaId],
      references: [media.id],
    }),
    recipientUserMedia: one(userMedia, {
      fields: [mediaRecommendations.recipientUserMediaId],
      references: [userMedia.id],
      relationName: "recommendationRecipientMedia",
    }),
    notifications: many(notifications),
  }),
);

export const dismissedSystemRecommendationsRelations = relations(
  dismissedSystemRecommendations,
  ({ one }) => ({
    user: one(user, {
      fields: [dismissedSystemRecommendations.userId],
      references: [user.id],
    }),
  }),
);

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
  recommendationRecipients: many(mediaRecommendations, {
    relationName: "recommendationRecipientMedia",
  }),
  collectionItems: many(mediaCollectionItems),
  statusHistory: many(userMediaStatusHistory),
  tagLinks: many(userMediaTags),
  reactions: many(userMediaReactions),
  comments: many(userMediaComments),
  notifications: many(notifications),
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
  publicId: text("public_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  defaultVisibility: visibilityEnum("default_visibility")
    .default("private")
    .notNull(),
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
  sentFriendRequests: many(friendships, {
    relationName: "friendshipRequester",
  }),
  receivedFriendRequests: many(friendships, {
    relationName: "friendshipAddressee",
  }),
  reactions: many(userMediaReactions),
  comments: many(userMediaComments),
  receivedNotifications: many(notifications, {
    relationName: "notificationRecipient",
  }),
  sentNotifications: many(notifications, {
    relationName: "notificationActor",
  }),
  sentRecommendations: many(mediaRecommendations, {
    relationName: "recommendationSender",
  }),
  receivedRecommendations: many(mediaRecommendations, {
    relationName: "recommendationRecipient",
  }),
  dismissedSystemRecommendations: many(dismissedSystemRecommendations),
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
