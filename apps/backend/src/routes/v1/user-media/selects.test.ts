import { media, userMedia } from "@media-voyage/shared";
import { describe, expect, it } from "vitest";
import {
  friendMediaDetailedSelect,
  friendMediaSummarySelect,
} from "../friends/selects";
import {
  publicMediaDetailSelect,
  publicMediaSummarySelect,
} from "../public/selects";
import { userMediaDetailedSelect, userMediaSummarySelect } from "./selects";

const summaryKeys = Object.keys(userMediaSummarySelect);
const detailKeys = [
  ...summaryKeys,
  "mediaId",
  "description",
  "catalogSource",
  "catalogExternalId",
  "catalogMetadata",
  "review",
  "notes",
  "timeSpent",
  "pagesRead",
  "tags",
  "seasonsProgress",
  "startedAt",
  "completedAt",
];

describe("user-media selections", () => {
  it("composes the detailed selection from the summary selection", () => {
    expect(Object.keys(userMediaDetailedSelect).sort()).toEqual(
      detailKeys.sort(),
    );

    for (const key of summaryKeys) {
      expect(userMediaDetailedSelect[key as keyof typeof userMediaSummarySelect])
        .toBe(userMediaSummarySelect[key as keyof typeof userMediaSummarySelect]);
    }

    expect(userMediaDetailedSelect.mediaId).toBe(userMedia.mediaId);
    expect(userMediaDetailedSelect.description).toBe(media.description);
    expect(userMediaDetailedSelect.catalogSource).toBe(media.source);
    expect(userMediaDetailedSelect.catalogExternalId).toBe(media.externalId);
    expect(userMediaDetailedSelect.catalogMetadata).toBe(media.metadata);
    expect(userMediaDetailedSelect.review).toBe(userMedia.review);
    expect(userMediaDetailedSelect.notes).toBe(userMedia.notes);
    expect(userMediaDetailedSelect.timeSpent).toBe(userMedia.timeSpent);
    expect(userMediaDetailedSelect.pagesRead).toBe(userMedia.pagesRead);
    expect(userMediaDetailedSelect.seasonsProgress).toBe(
      userMedia.seasonsProgress,
    );
    expect(userMediaDetailedSelect.startedAt).toBe(userMedia.startedAt);
    expect(userMediaDetailedSelect.completedAt).toBe(userMedia.completedAt);
  });

  it("keeps owner-only fields out of friend and public selections", () => {
    const friendSummary = friendMediaSummarySelect("viewer-1");

    expect(friendSummary).not.toHaveProperty("visibility");
    expect(friendMediaDetailedSelect).not.toHaveProperty("notes");
    expect(friendMediaDetailedSelect).not.toHaveProperty("visibility");

    expect(publicMediaSummarySelect).not.toHaveProperty("id");
    expect(publicMediaSummarySelect).not.toHaveProperty("visibility");
    expect(publicMediaSummarySelect.publicId).toBe(userMedia.publicId);

    expect(publicMediaDetailSelect).not.toHaveProperty("id");
    expect(publicMediaDetailSelect).not.toHaveProperty("mediaId");
    expect(publicMediaDetailSelect).not.toHaveProperty("visibility");
    expect(publicMediaDetailSelect).not.toHaveProperty("notes");
    expect(publicMediaDetailSelect.publicId).toBe(userMedia.publicId);
  });
});
