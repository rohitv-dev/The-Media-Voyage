import { Container, Stack } from "@mantine/core";
import type {
  MediaDetailedRecord,
  UserMediaQuickAction,
} from "@media-voyage/shared/api";
import type { ReactNode } from "react";
import { MediaViewDetails } from "./MediaViewDetails";
import { MediaViewHero } from "./MediaViewHero";
import { MediaViewReadingPanels } from "./MediaViewReadingPanels";
import { MediaViewSeasons } from "./MediaViewSeasons";
import { MediaViewStatusHistory } from "./MediaViewStatusHistory";
import { MediaViewWatchProviders } from "./MediaViewWatchProviders";

export type MediaViewData = Omit<MediaDetailedRecord, "notes" | "visibility"> &
  Partial<Pick<MediaDetailedRecord, "notes" | "visibility">>;

type MediaViewProps = {
  data: MediaViewData;
  readOnly?: boolean;
  onBack?: () => void;
  onEdit?: () => void;
  backLabel?: string;
  eyebrow?: string;
  footer?: ReactNode;
  onCopyToLibrary?: () => void;
  copyingToLibrary?: boolean;
  onRecommendToFriend?: () => void;
  onCopyPublicLink?: () => void;
  copyingPublicLink?: boolean;
  onQuickAction?: (action: UserMediaQuickAction) => void;
  quickActionPending?: boolean;
};

export function MediaView(props: MediaViewProps) {
  const tmdbType =
    props.data.type === "movie" && props.data.catalogSource === "tmdb_movie"
      ? "movie"
      : props.data.type === "show" && props.data.catalogSource === "tmdb_tv"
        ? "show"
        : null;
  const tmdbId = Number(props.data.catalogExternalId);

  return (
    <Container size="md" py={{ base: "sm", sm: "xl" }}>
      <Stack gap="md">
        <MediaViewHero
          data={props.data}
          readOnly={props.readOnly}
          onBack={props.onBack}
          onEdit={props.onEdit}
          backLabel={props.backLabel}
          eyebrow={props.eyebrow}
          onCopyToLibrary={props.onCopyToLibrary}
          copyingToLibrary={props.copyingToLibrary}
          onRecommendToFriend={props.onRecommendToFriend}
          onCopyPublicLink={props.onCopyPublicLink}
          copyingPublicLink={props.copyingPublicLink}
          onQuickAction={props.onQuickAction}
          quickActionPending={props.quickActionPending}
        />
        <MediaViewDetails data={props.data} />
        {tmdbType && Number.isSafeInteger(tmdbId) && tmdbId > 0 && (
          <MediaViewWatchProviders type={tmdbType} id={tmdbId} />
        )}
        <MediaViewStatusHistory
          mediaId={props.data.id}
          readOnly={props.readOnly}
        />
        <MediaViewSeasons data={props.data} />
        <MediaViewReadingPanels data={props.data} />
        {props.footer}
      </Stack>
    </Container>
  );
}
