import { SectionHeading } from "#/components/SectionHeading";
import {
  Grid,
  Card,
  Stack,
  SimpleGrid,
  Select,
  TextInput,
} from "@mantine/core";
import type { SourceMediaRecord } from "@media-voyage/shared/api";
import { IconMovie, IconLock } from "@tabler/icons-react";
import { MediaTitleSelect } from "../MediaTitleSelect";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import { mediaTypeOptions, visibilityOptions } from "../../options";
import { useFormContext } from "./context";
import type { MouseEventHandler } from "react";

type MediaDetailsSectionProps = {
  mode: "add" | "update";
  mediaRecord: SourceMediaRecord | null;
  search: string;
  onTypeChange: (type: MediaType | null) => void;
  onTypeClick: MouseEventHandler<HTMLInputElement>;
  onTitleChange: (record: SourceMediaRecord | null) => void;
  onSearchChange: (value: string) => void;
};

export function MediaDetailsSection({
  mode,
  mediaRecord,
  search,
  onTypeChange,
  onTypeClick,
  onTitleChange,
  onSearchChange,
}: MediaDetailsSectionProps) {
  const form = useFormContext();
  const isAddMode = mode === "add";

  return (
    <Grid.Col span={{ xs: 12, md: 7 }}>
      <Card withBorder shadow="sm" p={{ base: "md", md: "lg" }} h="100%">
        <Stack gap="md">
          <SectionHeading
            icon={<IconMovie size={20} stroke={2} />}
            title="Media Details"
            description="Basic information about the media you want to track"
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Type"
              placeholder="Select media type"
              variant="filled"
              data={mediaTypeOptions}
              readOnly={!isAddMode}
              rightSection={
                !isAddMode ? (
                  <IconLock size={18} stroke={1.5} color="#868e96" />
                ) : undefined
              }
              onClick={onTypeClick}
              {...form.getInputProps("type")}
              onChange={onTypeChange}
            />

            <Select
              label="Visibility"
              placeholder="Who can see this?"
              variant="filled"
              data={visibilityOptions}
              {...form.getInputProps("visibility")}
            />
          </SimpleGrid>

          {isAddMode ? (
            <MediaTitleSelect
              value={mediaRecord}
              type={form.values.type}
              search={search}
              error={form.errors.title}
              onChange={onTitleChange}
              onSearchChange={onSearchChange}
            />
          ) : (
            <TextInput
              label="Title"
              variant="filled"
              readOnly
              value={form.values.title}
              rightSection={<IconLock size={18} stroke={1.5} color="#868e96" />}
            />
          )}
        </Stack>
      </Card>
    </Grid.Col>
  );
}
