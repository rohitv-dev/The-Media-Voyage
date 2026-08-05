import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { queryOptions } from "@tanstack/react-query";
import type {
  CommentFormInput,
  CommentRecord,
  FriendMediaDetailed,
  FriendMediaListResponse,
  FriendMediaRecord,
  FriendRecord,
  FriendRequestsResponse,
  FriendRespondInput,
  ReactionInput,
  ShareLibraryInput,
} from "@media-voyage/shared/api";

function post<T>(path: string, body: unknown, method = "POST") {
  return api<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* Queries ------------------------------------------------------------------ */

export const friendsQueryOptions = queryOptions({
  queryKey: queryKeys.friends.all,
  queryFn: () => api<FriendRecord[]>("/friends"),
});

export const friendRequestsQueryOptions = queryOptions({
  queryKey: queryKeys.friends.requests,
  queryFn: () => api<FriendRequestsResponse>("/friends/requests"),
});

export const friendsFeedQueryOptions = queryOptions({
  queryKey: queryKeys.friends.feed,
  queryFn: () => api<FriendMediaRecord[]>("/friends/feed"),
});

export function friendMediaQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.friends.media(userId),
    queryFn: () =>
      api<FriendMediaListResponse>(
        `/friends/${encodeURIComponent(userId)}/media`,
      ),
  });
}

export type FriendCollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  /** Counts only the items this viewer is allowed to see. */
  itemCount: number;
};

export type FriendCollectionDetail = {
  collection: {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    ownerName: string;
  };
  data: FriendMediaRecord[];
};

export function friendCollectionsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.friends.collections(userId),
    queryFn: () =>
      api<FriendCollectionSummary[]>(
        `/friends/${encodeURIComponent(userId)}/collections`,
      ),
  });
}

export function friendCollectionDetailOptions(collectionId: string) {
  return queryOptions({
    queryKey: queryKeys.friends.collection(collectionId),
    queryFn: () =>
      api<FriendCollectionDetail>(`/friends/collections/${collectionId}`),
  });
}

export function friendMediaDetailOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.friends.entry(id),
    queryFn: () => api<FriendMediaDetailed>(`/friends/media/${id}`),
  });
}

export function friendMediaCommentsOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.friends.comments(id),
    queryFn: () => api<CommentRecord[]>(`/friends/media/${id}/comments`),
  });
}

/* Mutations ---------------------------------------------------------------- */

export function sendFriendRequest(email: string) {
  return post<{ autoAccepted: boolean }>("/friends/requests", { email });
}

export function respondToFriendRequest(
  friendshipId: string,
  action: FriendRespondInput["action"],
) {
  return post(`/friends/requests/${friendshipId}`, { action }, "PATCH");
}

export function removeFriend(userId: string) {
  return api(`/friends/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export function setReaction(userMediaId: string, value: ReactionInput["value"]) {
  return post(`/friends/media/${userMediaId}/reaction`, { value }, "PUT");
}

export function addComment(userMediaId: string, input: CommentFormInput) {
  return post<CommentRecord>(`/friends/media/${userMediaId}/comments`, input);
}

export function deleteComment(commentId: string) {
  return api(`/friends/comments/${commentId}`, { method: "DELETE" });
}

export function shareLibrary(input: ShareLibraryInput) {
  return post<{ updated: number }>("/friends/share-library", input);
}
