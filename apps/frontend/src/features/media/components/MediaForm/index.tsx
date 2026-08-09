import type {
  MediaDetailedRecord,
  SeasonProgressEntry,
  SourceMediaRecord,
  UserMediaDropdowns,
  UserMediaFormSchema,
} from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useCanGoBack,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import type { MouseEventHandler } from "react";
import { FormProvider, useForm } from "./context";
import { api, getApiErrorMessage } from "#/lib/api";
import { Container, Grid, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import {
  userMediaDropdownOptions,
  userMediaDetailedOptions,
} from "../../queries";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import { useUnsavedChangesBlocker } from "#/hooks/useUnsavedChangesBlocker";
import { useDeleteMedia } from "../../hooks/useDeleteMedia";
import { queryKeys } from "#/lib/queryKeys";
import type { CatalogMetadata } from "../../catalogMetadata";
import { FormActions } from "./FormActions";
import { FormHeader } from "./FormHeader";
import { MediaDetailsSection } from "./MediaDetailsSection";
import { PersonalNotesSection } from "./PersonalNotesSection";
import { ProgressTrackingSection } from "./ProgressTrackingSection";
import { StatusDetailsSection } from "./StatusDetailsSection";
import {
  getCatalogRuntimeMinutes,
  getEstimatedTimeSpentMinutes,
} from "./TimeSpentModal";
import { formatDuration } from "../../formatDuration";
import { hydrateMediaRecord } from "../../providers/hydrateMedia";
import { mergeTmdbSeasons } from "../../providers/tmdb";
import { getLibraryReturnDepth } from "../../libraryNavigation";

const addInitialValues: UserMediaFormSchema = {
  title: "",
  type: "movie",
  description: undefined,
  metadata: undefined,

  status: "planned",
  rating: undefined,
  favorite: false,
  source: "",
  review: "",
  notes: "",
  startedAt: undefined,
  completedAt: undefined,
  progress: undefined,
  timeSpent: undefined,
  pagesRead: undefined,
  tags: [],
  visibility: "private",
  seasonsProgress: [],
};

function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    const key = trimmed.toLowerCase();

    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
}

function calculateShowProgress(seasonsProgress?: SeasonProgressEntry[]) {
  let totalEpisodeCount = 0;
  let watchedEpisodeCount = 0;

  for (const season of seasonsProgress ?? []) {
    if (
      season.expectedEpisodeCount === undefined ||
      season.expectedEpisodeCount === null
    ) {
      continue;
    }

    totalEpisodeCount += season.expectedEpisodeCount;
    watchedEpisodeCount += Math.max(0, season.episodesWatched ?? 0);
  }

  if (totalEpisodeCount === 0) return undefined;

  return Math.min(
    100,
    Math.round((watchedEpisodeCount / totalEpisodeCount) * 100),
  );
}

function calculateMovieProgress(
  timeSpent: UserMediaFormSchema["timeSpent"],
  catalogMetadata?: CatalogMetadata<"movie">,
) {
  const runtimeMinutes = getEstimatedTimeSpentMinutes("movie", catalogMetadata);
  if (!runtimeMinutes) return undefined;

  const timeSpentMinutes = Math.max(0, Number(timeSpent) || 0);

  return Math.min(100, Math.round((timeSpentMinutes / runtimeMinutes) * 100));
}

function getBookPageCount(catalogMetadata?: CatalogMetadata<"book">) {
  if (!catalogMetadata) return undefined;

  const { numberOfPages } = catalogMetadata;
  return typeof numberOfPages === "number" && numberOfPages > 0
    ? numberOfPages
    : undefined;
}

function calculateBookProgress(
  pagesRead: UserMediaFormSchema["pagesRead"],
  catalogMetadata?: CatalogMetadata,
) {
  const numberOfPages = getBookPageCount(catalogMetadata);
  if (!numberOfPages) return undefined;

  const readPages = Math.max(0, Number(pagesRead) || 0);
  return Math.min(100, Math.round((readPages / numberOfPages) * 100));
}

type MediaFormProps =
  | {
      mode: "add";
      dropdowns: UserMediaDropdowns;
      defaultVisibility?: UserMediaFormSchema["visibility"];
    }
  | {
      id: string;
      mode: "update";
      initialValues: UserMediaFormSchema;
      catalogSource: string | null;
      catalogExternalId: string | null;
      dropdowns: UserMediaDropdowns;
    };

export function MediaForm(props: MediaFormProps) {
  const { mode } = props;
  const isAddMode = mode === "add";
  const canGoBack = useCanGoBack();

  const [mediaRecord, setMediaRecord] = useState<SourceMediaRecord | null>(
    null,
  );
  const [isLoadingSeasonInfo, setIsLoadingSeasonInfo] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  const libraryReturnDepth = useLocation({
    select: (location) => getLibraryReturnDepth(location.state),
  });
  const queryClient = useQueryClient();

  const returnToLibrary = () => {
    if (libraryReturnDepth) {
      router.history.go(-libraryReturnDepth);
      return;
    }

    navigate({ to: "/media" });
  };

  const form = useForm({
    initialValues: isAddMode
      ? {
          ...addInitialValues,
          visibility: props.defaultVisibility ?? "private",
        }
      : {
          ...props.initialValues,
          ...(props.initialValues.type === "show" &&
          getCatalogRuntimeMinutes(props.initialValues.metadata)
            ? {
                timeSpent: getEstimatedTimeSpentMinutes(
                  "show",
                  props.initialValues.metadata,
                  props.initialValues.seasonsProgress,
                ),
              }
            : {}),
        },
    transformValues: (values) => ({
      ...values,
      timeSpent: Number(values.timeSpent) === 0 ? undefined : values.timeSpent,
      tags: normalizeTags(values.tags ?? []),
    }),
    validate: {
      title: (value) =>
        isAddMode && !value.trim() ? "Title is required" : undefined,
      completedAt: (value, values) =>
        values.status === "completed" && !value
          ? "Completed date is required"
          : undefined,
    },
  });

  const catalogMetadataForTimeSpent = form.values.metadata ?? undefined;

  useUnsavedChangesBlocker(() => form.isDirty());

  form.watch("status", ({ value, previousValue }) => {
    if (value === "completed") {
      form.setFieldValue("progress", 100);
      if (form.values.type === "book") {
        const numberOfPages = getBookPageCount(catalogMetadataForTimeSpent);
        if (numberOfPages) form.setFieldValue("pagesRead", numberOfPages);
      }
      const completedSeasons = (
        form.values.seasonsProgress ?? []
      ).map<SeasonProgressEntry>((entry) => {
        const episodeCount = entry.expectedEpisodeCount;
        const hasKnownEpisodeCount =
          episodeCount !== undefined && episodeCount !== null;
        const alreadyComplete =
          entry.status === "completed" &&
          (!hasKnownEpisodeCount || entry.episodesWatched === episodeCount);

        if (alreadyComplete) return entry;

        return {
          ...entry,
          status: "completed",
          ...(hasKnownEpisodeCount ? { episodesWatched: episodeCount } : {}),
          updatedAt: new Date().toISOString(),
        };
      });
      form.setFieldValue("seasonsProgress", completedSeasons);

      if (form.values.type === "movie") {
        const estimatedMinutes = getEstimatedTimeSpentMinutes(
          form.values.type,
          catalogMetadataForTimeSpent,
          completedSeasons,
        );
        const currentMinutes = Number(form.values.timeSpent) || 0;

        if (estimatedMinutes && estimatedMinutes !== currentMinutes) {
          modals.openConfirmModal({
            title: "Update time spent?",
            children: (
              <Text size="sm">
                Based on the catalog runtime and your progress, this looks like
                about {formatDuration(estimatedMinutes)}. Set Time Spent to this
                estimate?
              </Text>
            ),
            labels: {
              confirm: `Use ${formatDuration(estimatedMinutes)}`,
              cancel: "Review manually",
            },
            cancelProps: {
              color: "accent",
              variant: "light",
            },
            onConfirm: () => form.setFieldValue("timeSpent", estimatedMinutes),
          });
        } else if (!currentMinutes) {
          showNotification({
            title: "Remember time spent",
            message: "Open Time Spent to add an estimate before saving.",
            color: "blue",
            position: "top-center",
          });
        }
      }
    } else if (previousValue === "completed") {
      form.setFieldValue("completedAt", undefined);
    }
  });

  form.watch("seasonsProgress", ({ value }) => {
    if (form.values.type !== "show") return;

    const calculatedProgress = calculateShowProgress(value);
    if (
      calculatedProgress !== undefined &&
      calculatedProgress !== form.values.progress
    ) {
      form.setFieldValue("progress", calculatedProgress);
    }

    const calculatedTimeSpent = getEstimatedTimeSpentMinutes(
      "show",
      catalogMetadataForTimeSpent,
      value,
    );
    const nextTimeSpent = calculatedTimeSpent || undefined;

    if (
      getCatalogRuntimeMinutes(catalogMetadataForTimeSpent) &&
      nextTimeSpent !== form.values.timeSpent
    ) {
      form.setFieldValue("timeSpent", nextTimeSpent);
    }
  });

  form.watch("timeSpent", ({ value }) => {
    if (form.values.type !== "movie") return;

    const calculatedProgress = calculateMovieProgress(
      value,
      catalogMetadataForTimeSpent,
    );
    if (
      calculatedProgress !== undefined &&
      calculatedProgress !== form.values.progress
    ) {
      form.setFieldValue("progress", calculatedProgress);
    }
  });

  form.watch("pagesRead", ({ value }) => {
    if (form.values.type !== "book") return;

    const calculatedProgress = calculateBookProgress(
      value,
      catalogMetadataForTimeSpent,
    );
    if (
      calculatedProgress !== undefined &&
      calculatedProgress !== form.values.progress
    ) {
      form.setFieldValue("progress", calculatedProgress);
    }
  });

  const handleTypeChange = (type: MediaType | null) => {
    if (!type) return;

    form.setFieldValue("type", type);
    form.setFieldValue("title", "");
    form.setFieldValue("description", undefined);
    form.setFieldValue("metadata", undefined);
    form.setFieldValue("seasonsProgress", []);
    form.setFieldValue("pagesRead", undefined);

    setMediaRecord(null);
    setIsLoadingSeasonInfo(false);
  };

  const handleTypeClick: MouseEventHandler<HTMLInputElement> = (event) => {
    if (!isAddMode) event.stopPropagation();
  };

  const clearCatalogSelection = () => {
    form.setFieldValue("description", undefined);
    form.setFieldValue("metadata", undefined);
    if (isAddMode) form.setFieldValue("seasonsProgress", []);
    form.setFieldValue("pagesRead", undefined);
    setMediaRecord(null);
  };

  const applyCatalogMetadata = (metadata?: CatalogMetadata) => {
    if (!metadata || !Object.keys(metadata).length) return;

    form.setFieldValue("metadata", metadata);

    if (form.values.type === "show" && getCatalogRuntimeMinutes(metadata)) {
      form.setFieldValue(
        "timeSpent",
        getEstimatedTimeSpentMinutes(
          "show",
          metadata,
          form.values.seasonsProgress,
        ),
      );
    }

    const calculatedProgress = calculateBookProgress(
      form.values.pagesRead,
      metadata,
    );
    if (
      form.values.type === "book" &&
      calculatedProgress !== undefined &&
      calculatedProgress !== form.values.progress
    ) {
      form.setFieldValue("progress", calculatedProgress);
    }
  };

  const handleTitleChange = async (record: SourceMediaRecord | null) => {
    setIsLoadingSeasonInfo(false);
    setMediaRecord(record);
    form.setFieldValue("description", undefined);
    form.setFieldValue("metadata", undefined);
    form.setFieldValue("pagesRead", undefined);

    if (isAddMode) form.setFieldValue("seasonsProgress", []);

    if (record) {
      form.setFieldValue("title", record.title);
      form.setFieldValue("type", record.type);

      const loadingSeasonInfo = record.type === "show" && !!record.externalId;
      setIsLoadingSeasonInfo(loadingSeasonInfo);

      try {
        const hydrated = await hydrateMediaRecord(record);
        if (hydrated.description) {
          form.setFieldValue("description", hydrated.description);
        }
        applyCatalogMetadata(hydrated.metadata);

        if (isAddMode && hydrated.seasonsProgress?.length) {
          form.setFieldValue("seasonsProgress", hydrated.seasonsProgress);
        }
      } finally {
        setIsLoadingSeasonInfo(false);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    if (mediaRecord && mediaRecord.title !== value) {
      clearCatalogSelection();
    }
  };

  const canSyncSeasons =
    !isAddMode &&
    props.catalogSource === "tmdb_tv" &&
    Boolean(props.catalogExternalId);

  const handleSyncSeasons = async () => {
    if (
      isAddMode ||
      props.catalogSource !== "tmdb_tv" ||
      !props.catalogExternalId
    ) {
      return;
    }

    setIsLoadingSeasonInfo(true);

    try {
      const hydrated = await hydrateMediaRecord({
        id: "",
        source: "tmdb_tv",
        externalId: props.catalogExternalId,
        title: form.values.title,
        type: "show",
        imageUrl: null,
      });

      applyCatalogMetadata(hydrated.metadata);
      form.setFieldValue(
        "seasonsProgress",
        mergeTmdbSeasons(
          form.values.seasonsProgress ?? [],
          hydrated.seasonsProgress ?? [],
        ),
      );
      showSuccessNotification({
        title: "Seasons synced",
        message: "Review the updated season counts, then save your changes.",
      });
    } catch (error) {
      showErrorNotification({
        title: "Could not sync seasons",
        message: getApiErrorMessage(error),
      });
    } finally {
      setIsLoadingSeasonInfo(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: UserMediaFormSchema) => {
      if (props.mode === "add") {
        return api<MediaDetailedRecord>("/user-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            mediaId: mediaRecord?.id,
            title: mediaRecord?.title ?? data.title,
            type: mediaRecord?.type ?? data.type,
            externalId: mediaRecord?.externalId,
            imageUrl: mediaRecord?.imageUrl,
            mediaSource: mediaRecord?.source ?? "manual",
            description: data.description,
          }),
        });
      }

      return api<MediaDetailedRecord>(`/user-media/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },

    onSuccess: async (data) => {
      form.resetDirty();

      showSuccessNotification({
        title: isAddMode
          ? "Media Added Successfully"
          : "Media Updated Successfully",
        message: `${data.title} has been ${isAddMode ? "added to your list" : "updated"}`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userMedia.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries(userMediaDropdownOptions),
        queryClient.invalidateQueries({
          queryKey: queryKeys.userMedia.statusHistory(data.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sources.all }),
        ...(!isAddMode
          ? [queryClient.invalidateQueries(userMediaDetailedOptions(data.id))]
          : []),
      ]);

      if (isAddMode) {
        navigate({ to: "/media" });
        return;
      }

      returnToLibrary();
    },

    onError: (error: Error) => {
      showErrorNotification({
        title: isAddMode ? "Could not add media" : "Could not update media",
        message: getApiErrorMessage(error),
      });
    },
  });

  const handleSubmit = (values: UserMediaFormSchema) => {
    saveMutation.mutate(values);
  };

  const { requestDelete: requestDeleteMedia, isDeletePending } =
    useDeleteMedia();

  const handleDelete = () => {
    if (isAddMode || isDeletePending) return;

    requestDeleteMedia(props.id, props.initialValues.title, () => {
      form.resetDirty();
      returnToLibrary();
    });
  };

  const handleCancel = () => {
    if (canGoBack) {
      router.history.back();
      return;
    }

    navigate(
      isAddMode
        ? { to: "/media" }
        : {
            to: "/media/view/$id",
            params: { id: props.id },
          },
    );
  };

  return (
    <FormProvider form={form}>
      <Container pt="sm" px={{ base: "xs", md: "sm" }}>
        <Stack gap="lg" pb="lg">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Grid gap="sm">
              <FormHeader mode={mode} />
              <MediaDetailsSection
                mode={mode}
                mediaRecord={mediaRecord}
                onTypeChange={handleTypeChange}
                onTypeClick={handleTypeClick}
                onTitleChange={handleTitleChange}
                onSearchChange={handleSearchChange}
              />
              <StatusDetailsSection />
              <ProgressTrackingSection
                dropdowns={props.dropdowns}
                catalogMetadata={catalogMetadataForTimeSpent}
                numberOfPages={getBookPageCount(catalogMetadataForTimeSpent)}
                isLoadingSeasonInfo={isLoadingSeasonInfo}
                canSyncSeasons={canSyncSeasons}
                onSyncSeasons={handleSyncSeasons}
              />
              <PersonalNotesSection />
              <FormActions
                mode={mode}
                onCancel={handleCancel}
                isPending={saveMutation.isPending}
                onDelete={isAddMode ? undefined : handleDelete}
                isDeletePending={isDeletePending}
              />
            </Grid>
          </form>
        </Stack>
      </Container>
    </FormProvider>
  );
}
