import { Alert, Loader, Stack, Text } from "@mantine/core";
import type {
  RecommendationDetail,
  ResolveRecommendationInput,
} from "@media-voyage/shared/api";
import { IconAlertCircle, IconClock } from "@tabler/icons-react";
import { DetailMedia } from "./DetailMedia";
import { PendingResponse } from "./PendingResponse";
import { ReadOnlyResponse } from "./ReadOnlyResponse";

export type DetailContentProps = {
  detail: RecommendationDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  resolvePending: boolean;
  resolveError?: string | null;
  onResolve: (input: ResolveRecommendationInput) => void;
  onOpenLibrary: (userMediaId: string) => void;
};

export function DetailContent({
  detail,
  isLoading,
  isError,
  resolvePending,
  resolveError,
  onResolve,
  onOpenLibrary,
}: DetailContentProps) {
  const isPendingRecipient =
    detail?.status === "pending" && detail.viewerRole === "recipient";

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading recommendation…
        </Text>
      </Stack>
    );
  }

  if (isError || !detail) {
    return (
      <Alert
        icon={<IconAlertCircle size={18} />}
        color="red"
        title="Recommendation could not be loaded"
      >
        Check your connection and try again.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <DetailMedia detail={detail} />

      {detail.status === "expired" && (
        <Alert
          icon={<IconClock size={18} />}
          color="gray"
          title="Recommendation expired"
        >
          This recommendation is no longer available to resolve.
        </Alert>
      )}

      {isPendingRecipient ? (
        <PendingResponse
          detail={detail}
          resolvePending={resolvePending}
          resolveError={resolveError}
          onResolve={onResolve}
          onOpenLibrary={onOpenLibrary}
        />
      ) : detail.status !== "expired" ? (
        <ReadOnlyResponse detail={detail} onOpenLibrary={onOpenLibrary} />
      ) : null}
    </Stack>
  );
}
