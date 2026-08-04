import { user, userMedia } from "@media-voyage/shared";
import {
  userMediaDetailedSelect,
  userMediaSummarySelect,
} from "../user-media/selects";

const {
  id: _summaryId,
  visibility: _summaryVisibility,
  ...publicMediaSummaryFields
} = userMediaSummarySelect;

export const publicMediaSummarySelect = {
  publicId: userMedia.publicId,
  ...publicMediaSummaryFields,
};

const {
  id: _detailId,
  mediaId: _mediaId,
  visibility: _visibility,
  notes: _notes,
  ...publicMediaDetailFields
} = {
  ...userMediaDetailedSelect,
  ownerName: user.name,
};

export const publicMediaDetailSelect = {
  publicId: userMedia.publicId,
  ...publicMediaDetailFields,
};
