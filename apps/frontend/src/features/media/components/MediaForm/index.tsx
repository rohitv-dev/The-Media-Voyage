import type {
  IgdbGame,
  MediaDetailedRecord,
  OmdbMovie,
  OmdbShow,
  SourceMediaRecord,
  UserMediaDropdowns,
  UserMediaFormSchema,
} from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCanGoBack, useRouter, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { MouseEventHandler } from "react";
import { FormProvider, useForm } from "./context";
import { api } from "#/lib/api";
import { Container, Stack, Grid } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  userMediaDropdownOptions,
  userMediaDetailedOptions,
} from "../../queries";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import { useUnsavedChangesBlocker } from "#/hooks/useUnsavedChangesBlocker";
import { FormActions } from "./FormActions";
import { FormHeader } from "./FormHeader";
import { MediaDetailsSection } from "./MediaDetailsSection";
import { PersonalNotesSection } from "./PersonalNotesSection";
import { ProgressTrackingSection } from "./ProgressTrackingSection";
import { StatusDetailsSection } from "./StatusDetailsSection";

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
  rewatches: 0,
  timeSpent: undefined,
  tags: [],
  visibility: "private",
  customFields: undefined,
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

type MediaFormProps =
  | {
    mode: "add";
    dropdowns: UserMediaDropdowns;
    /** Account default that preselects the visibility field on new entries. */
    defaultVisibility?: UserMediaFormSchema["visibility"];
  }
  | {
    id: string;
    mode: "update";
    initialValues: UserMediaFormSchema;
    dropdowns: UserMediaDropdowns;
  };

export function MediaForm(props: MediaFormProps) {
  const { mode } = props;
  const isAddMode = mode === "add";
  const canGoBack = useCanGoBack();

  const [mediaRecord, setMediaRecord] = useState<SourceMediaRecord | null>(
    null,
  );
  const [search, setSearch] = useState(
    props.mode === "add" ? "" : props.initialValues.title,
  );
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: isAddMode
      ? { ...addInitialValues, visibility: props.defaultVisibility ?? "private" }
      : props.initialValues,
    transformValues: (values) => ({
      ...values,
      timeSpent: Number(values.timeSpent) === 0 ? undefined : values.timeSpent,
      tags: normalizeTags(values.tags ?? []),
    }),
    validate: {
      title: (value) =>
        isAddMode && !value.trim() ? "Title is required" : undefined,
    },
  });

  useUnsavedChangesBlocker(() => form.isDirty());

  form.watch("status", ({ value, previousValue }) => {
    if (value === "completed") {
      form.setFieldValue("progress", 100);
      form.setFieldValue("seasonsProgress", (prev = []) =>
        prev.map((entry) =>
          entry.status === "completed"
            ? entry
            : {
              ...entry,
              status: "completed",
              updatedAt: new Date().toISOString(),
            },
        ),
      );
    } else if (previousValue === "completed") {
      form.setFieldValue("completedAt", undefined);
    }
  });

  const handleTypeChange = (type: MediaType | null) => {
    if (!type) return;

    form.setFieldValue("type", type);
    form.setFieldValue("title", "");
    form.setFieldValue("description", undefined);
    setSearch("");
    setMediaRecord(null);
  };

  const handleTypeClick: MouseEventHandler<HTMLInputElement> = (event) => {
    if (!isAddMode) event.stopPropagation();
  };

  const handleTitleChange = async (record: SourceMediaRecord | null) => {
    setMediaRecord(record);
    form.setFieldValue("description", undefined);
    form.setFieldValue("metadata", undefined);
    if (isAddMode) form.setFieldValue("seasonsProgress", []);

    if (record) {
      form.setFieldValue("title", record.title);
      form.setFieldValue("type", record.type);

      if (record.source === "omdb" && record.externalId) {
        const details = await api<OmdbMovie | OmdbShow>(
          `/media/omdb/${record.externalId}`,
        );
        if (details.Plot) {
          form.setFieldValue("description", details.Plot);
        }

        const metadata = {
          ...(details.Genre ? { genre: details.Genre } : {}),
          ...(details.Runtime ? { runtime: details.Runtime } : {}),
          ...(details.imdbRating && details.imdbRating !== "N/A"
            ? { catalogRating: `${details.imdbRating}/10` }
            : {}),
        };
        if (Object.keys(metadata).length > 0) {
          form.setFieldValue("metadata", metadata);
        }

        if (isAddMode && record.type === "show" && "totalSeasons" in details) {
          const totalSeasons = Number(details.totalSeasons);
          if (Number.isInteger(totalSeasons) && totalSeasons > 0) {
            form.setFieldValue(
              "seasonsProgress",
              Array.from({ length: totalSeasons }, (_, index) => ({
                season: index + 1,
                status: "planned" as const,
                updatedAt: new Date().toISOString(),
              })),
            );
          }
        }
      }

      if (record.source === "igdb" && record.externalId) {
        const details = await api<IgdbGame | null>(
          `/media/igdb/${record.externalId}`,
        );
        if (details?.summary) {
          form.setFieldValue("description", details.summary);
        }

        const metadata = {
          ...(details?.genres?.length
            ? { genre: details.genres.map((g) => g.name).join(", ") }
            : {}),
          ...(details?.rating
            ? { catalogRating: `${(details.rating / 10).toFixed(1)}/10` }
            : {}),
        };
        if (Object.keys(metadata).length > 0) {
          form.setFieldValue("metadata", metadata);
        }
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    form.setFieldValue("title", value);
    setMediaRecord((current) => {
      if (current && current.title !== value) {
        form.setFieldValue("description", undefined);
        return null;
      }
      return current;
    });
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

      showNotification({
        title: isAddMode
          ? "Media Added Successfully"
          : "Media Updated Successfully",
        message: `${data.title} has been ${isAddMode ? "added to your list" : "updated"}`,
        color: "teal",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-media"] }),
        queryClient.invalidateQueries(userMediaDropdownOptions),
        ...(!isAddMode
          ? [queryClient.invalidateQueries(userMediaDetailedOptions(data.id))]
          : []),
      ]);

      navigate(
        isAddMode
          ? { to: "/media" }
          : {
            to: "/media/view/$id",
            params: { id: props.id },
          },
      );
    },

    onError: (error: Error) => {
      showNotification({
        title: isAddMode ? "Could not add media" : "Could not update media",
        message: error.message,
        color: "red",
        position: "top-center",
      });
    },
  });

  const handleSubmit = (values: UserMediaFormSchema) => {
    saveMutation.mutate(values);
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
            <Grid gap="xs">
              <FormHeader mode={mode} />
              <MediaDetailsSection
                mode={mode}
                mediaRecord={mediaRecord}
                search={search}
                onTypeChange={handleTypeChange}
                onTypeClick={handleTypeClick}
                onTitleChange={handleTitleChange}
                onSearchChange={handleSearchChange}
              />
              <StatusDetailsSection />
              <ProgressTrackingSection
                dropdowns={props.dropdowns}
              />
              <PersonalNotesSection />
              <FormActions
                mode={mode}
                onCancel={handleCancel}
                isPending={saveMutation.isPending}
              />
            </Grid>
          </form>
        </Stack>
      </Container>
    </FormProvider>
  );
}
