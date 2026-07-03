import { capitalizeWords } from "#/utils/stringFunctions";
import autoAnimate from "@formkit/auto-animate";
import { Badge, Group, Button } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { DataTable } from "mantine-datatable";
import type { DataTableSortStatus } from "mantine-datatable";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

type MediaTableProps = {
  data: MediaRecord[];
};

export function MediaTable({ data }: MediaTableProps) {
  const navigate = useNavigate();
  const autoAnimateInitialized = useRef(false);

  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<MediaRecord>
  >({
    columnAccessor: "title",
    direction: "asc",
  });

  const statusColor = (status: string) => {
    if (status === "in_progress") return "blue";
    if (status === "completed") return "green";
    if (status === "planned") return "orange";
    if (status === "dropped") return "red";
    return "gray";
  };

  const bodyRef = useCallback((node: HTMLTableSectionElement | null) => {
    if (node && !autoAnimateInitialized.current) {
      autoAnimate(node);
      autoAnimateInitialized.current = true;
    }
  }, []);

  return (
    <DataTable
      bodyRef={bodyRef}
      height={500}
      borderRadius="md"
      textSelectionDisabled
      withRowBorders
      withTableBorder
      withColumnBorders
      highlightOnHover
      records={data}
      columns={[
        {
          accessor: "title",
          width: 320,
          ellipsis: true,
          sortable: true,
        },
        {
          accessor: "type",
          render: (record) => capitalizeWords(record.type),
          sortable: true,
        },
        {
          accessor: "status",
          render: (record) => (
            <Badge color={statusColor(record.status)} variant="filled">
              {capitalizeWords(record.status)}
            </Badge>
          ),
          sortable: true,
        },
        {
          accessor: "rating",
          sortable: true,
        },
        {
          accessor: "",
          title: "Actions",
          render: (record) => (
            <Group gap="xs">
              <Button
                size="xs"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({
                    to: "/media/update/$id",
                    params: { id: record.id },
                  });
                }}
              >
                Update
              </Button>
            </Group>
          ),
        },
      ]}
      onRowClick={({ record }) =>
        navigate({ to: "/media/view/$id", params: { id: record.id } })
      }
      sortStatus={sortStatus}
      onSortStatusChange={setSortStatus}
    />
  );
}
