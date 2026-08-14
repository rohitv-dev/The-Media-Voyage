import type {
  MediaDetailedRecord,
  SeasonProgressEntry,
  SourceMediaRecord,
  SystemRecommendationPreviewResponse,
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
import { useEffect, useRef, useState } from "react";
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
import { FormActions, MobileFormActions } from "./FormActions";
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
import {
  parseProviderIdentity,
  resolveMediaSelection,
} from "../../providers/resolveMedia";
import { hydrateTmdb, mergeTmdbSeasons } from "../../providers/tmdb";
import { getLibraryReturnDepth } from "../../libraryNavigation";
import {
  hasDuplicateSeasonNumbers,
  normalizeNullableNumber,
  normalizeProgress,
  normalizeTimeSpent,
} from "./formUtils";

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
      recommendationSelection?: SourceMediaRecord;
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
    isAddMode ? (props.recommendationSelection ?? null) : null,
  );
  const [isCatalogRequestPending, setIsCatalogRequestPending] = useState(false);
  const catalogSelectionRequestRef = useRef(0);
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
          ...(props.recommendationSelection
            ? {
                title: props.recommendationSelection.title,
                type: props.recommendationSelection.type,
              }
            : {}),
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
      progress: normalizeProgress(values.progress),
      rating: normalizeNullableNumber(values.rating),
      timeSpent: normalizeTimeSpent(values.timeSpent),
      pagesRead: normalizeNullableNumber(values.pagesRead),
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

  const invalidateCatalogSelection = () => {
    catalogSelectionRequestRef.current += 1;
    setIsCatalogRequestPending(false);
  };

  const clearCatalogDependentValues = () => {
    form.setFieldValue("description", undefined);
    form.setFieldValue("metadata", undefined);
    form.setFieldValue("progress", 0);
    form.setFieldValue("timeSpent", undefined);
    form.setFieldValue("pagesRead", undefined);
    form.setFieldValue("seasonsProgress", []);
  };

  const handleTypeChange = (type: MediaType | null) => {
    if (!type) return;

    invalidateCatalogSelection();
    clearCatalogDependentValues();
    form.setFieldValue("type", type);
    if (type !== "game" && form.values.status === "playing") {
      form.setFieldValue("status", "planned");
    }
    form.setFieldValue("title", "");

    setMediaRecord(null);

    if (type === "game") {
      showNotification({
        title: "Choose a game status",
        message:
          "Use In Progress for campaigns or games with endings. Use Playing for open-ended games.",
        autoClose: 10_000,
      });
    }
  };

  const handleTypeClick: MouseEventHandler<HTMLInputElement> = (event) => {
    if (!isAddMode) event.stopPropagation();
  };

  const clearCatalogSelection = () => {
    invalidateCatalogSelection();
    clearCatalogDependentValues();
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
    const requestId = ++catalogSelectionRequestRef.current;
    const providerIdentity = record ? parseProviderIdentity(record) : null;

    clearCatalogDependentValues();
    setMediaRecord(record);

    if (!record) {
      form.setFieldValue("title", "");
      setIsCatalogRequestPending(false);
      return;
    }

    setIsCatalogRequestPending(providerIdentity !== null);
    form.setFieldValue("title", record.title);
    form.setFieldValue("type", record.type);

    try {
      const hydrated = await resolveMediaSelection(record);
      if (requestId !== catalogSelectionRequestRef.current) return;

      setMediaRecord(hydrated.record);
      if (hydrated.description) {
        form.setFieldValue("description", hydrated.description);
      }
      applyCatalogMetadata(hydrated.metadata);

      if (hydrated.seasonsProgress?.length) {
        form.setFieldValue("seasonsProgress", hydrated.seasonsProgress);
      }
    } catch (error) {
      if (requestId !== catalogSelectionRequestRef.current) return;

      showErrorNotification({
        title: "Could not load catalog details",
        message: getApiErrorMessage(error),
      });
    } finally {
      if (requestId === catalogSelectionRequestRef.current) {
        setIsCatalogRequestPending(false);
      }
    }
  };

  useEffect(() => {
    if (!isAddMode || !props.recommendationSelection) return;

    void handleTitleChange(props.recommendationSelection);
  }, []);

  const handleSearchChange = (value: string) => {
    if (mediaRecord && mediaRecord.title !== value) {
      clearCatalogSelection();
    }
  };

  const canSyncSeasons =
    !isAddMode &&
    props.catalogSource === "tmdb_tv" &&
    props.catalogExternalId !== null;

  const handleSyncSeasons = async () => {
    if (
      isAddMode ||
      props.catalogSource !== "tmdb_tv" ||
      props.catalogExternalId === null
    ) {
      return;
    }

    setIsCatalogRequestPending(true);

    try {
      const hydrated = await hydrateTmdb({
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
      setIsCatalogRequestPending(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: UserMediaFormSchema) => {
      if (props.mode === "add") {
        const mediaId = mediaRecord?.id || undefined;

        return api<MediaDetailedRecord>("/user-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            mediaId,
            title: mediaRecord?.title ?? data.title,
            type: mediaRecord?.type ?? data.type,
            externalId: mediaRecord?.externalId,
            imageUrl: mediaRecord?.imageUrl,
            mediaSource: mediaId
              ? undefined
              : (mediaRecord?.source ?? "manual"),
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
        if (props.recommendationSelection) {
          queryClient.setQueryData<SystemRecommendationPreviewResponse>(
            queryKeys.recommendations.preview,
            (preview) =>
              preview
                ? {
                    ...preview,
                    recommendations: preview.recommendations.filter(
                      ({ media }) =>
                        media.source !== data.catalogSource ||
                        media.externalId !== data.catalogExternalId,
                    ),
                  }
                : preview,
          );

          if (canGoBack) {
            router.history.back();
          } else {
            navigate({ to: "/recommendations" });
          }
          return;
        }

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
    if (saveMutation.isPending || isCatalogRequestPending) return;

    if (hasDuplicateSeasonNumbers(values.seasonsProgress)) {
      showErrorNotification({
        title: "Duplicate seasons",
        message:
          "Use Manage Seasons to give each season a unique number before saving.",
      });
      return;
    }

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
          <form
            onSubmit={form.onSubmit(handleSubmit, (errors) => {
              if (errors.completedAt) {
                showErrorNotification({
                  title: "Completed date is required",
                  message:
                    "Select a completed date in Progress & Tracking before saving.",
                });
              }
            })}
          >
            <Grid gap="sm">
              <FormHeader
                mode={mode}
                mobileActions={
                  <MobileFormActions
                    mode={mode}
                    onCancel={handleCancel}
                    isPending={
                      saveMutation.isPending || isCatalogRequestPending
                    }
                    onDelete={isAddMode ? undefined : handleDelete}
                    isDeletePending={isDeletePending}
                  />
                }
              />
              <MediaDetailsSection
                mode={mode}
                mediaRecord={mediaRecord}
                onTypeChange={handleTypeChange}
                onTypeClick={handleTypeClick}
                onTitleChange={handleTitleChange}
                onSearchChange={handleSearchChange}
              />
              <StatusDetailsSection
                isCatalogPending={isCatalogRequestPending}
              />
              <ProgressTrackingSection
                dropdowns={props.dropdowns}
                catalogMetadata={catalogMetadataForTimeSpent}
                numberOfPages={getBookPageCount(catalogMetadataForTimeSpent)}
                isCatalogPending={isCatalogRequestPending}
                canSyncSeasons={canSyncSeasons}
                onSyncSeasons={handleSyncSeasons}
              />
              <PersonalNotesSection />
              <FormActions
                mode={mode}
                onCancel={handleCancel}
                isPending={saveMutation.isPending || isCatalogRequestPending}
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
