import { userMedia } from "@media-voyage/shared";
import { describe, expect, it } from "vitest";
import {
  friendMediaDetailedSelect,
  friendMediaSummarySelect,
} from "../friends/selects";
import {
  publicMediaDetailSelect,
  publicMediaSummarySelect,
} from "../public/selects";

describe("user-media selections", () => {
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
