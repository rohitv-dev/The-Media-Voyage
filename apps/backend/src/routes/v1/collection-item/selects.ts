import {
  media,
  mediaCollection,
  mediaCollectionItems,
  userMedia,
} from "@media-voyage/shared";
import { userMediaSummarySelect } from "../user-media/selects";

export const collectionIdSelect = {
  id: mediaCollection.id,
};

export const userMediaIdSelect = {
  id: userMedia.id,
};

export const collectionItemIdSelect = {
  id: mediaCollectionItems.id,
};

export const collectionItemSelect = {
  id: mediaCollectionItems.id,
  userMediaId: mediaCollectionItems.userMediaId,
  title: media.title,
  type: media.type,
  position: mediaCollectionItems.position,
  createdAt: mediaCollectionItems.createdAt,
};

export const collectionItemDetailedSelect = {
  ...userMediaSummarySelect,
  position: mediaCollectionItems.position,
};
