import { media, mediaRecommendations, user } from "@media-voyage/shared";

export const recommendationCoreSelect = {
  id: mediaRecommendations.id,
  recipientId: mediaRecommendations.recipientId,
  senderId: mediaRecommendations.senderId,
  mediaId: mediaRecommendations.mediaId,
  recipientUserMediaId: mediaRecommendations.recipientUserMediaId,
  senderNote: mediaRecommendations.senderNote,
  recipientNote: mediaRecommendations.recipientNote,
  status: mediaRecommendations.status,
  outcome: mediaRecommendations.outcome,
  createdAt: mediaRecommendations.createdAt,
  updatedAt: mediaRecommendations.updatedAt,
  resolvedAt: mediaRecommendations.resolvedAt,
};

export const recommendationMediaSelect = {
  id: media.id,
  title: media.title,
  type: media.type,
  description: media.description,
  imageUrl: media.imageUrl,
};

export const recommendationUserSelect = {
  id: user.id,
  name: user.name,
  image: user.image,
};
