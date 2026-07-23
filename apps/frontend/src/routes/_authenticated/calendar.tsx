import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Badge,
  Box,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { MonthView } from "@mantine/schedule";
import type { ScheduleEventData } from "@mantine/schedule";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { IconChevronRight } from "@tabler/icons-react";
import { z } from "zod";
import { calendarActivityOptions } from "#/features/media/queries";
import { getStatusColor } from "#/features/media/functions";
import { capitalizeWords } from "#/utils/stringFunctions";
import { statusEnumValues } from "@media-voyage/shared/userMediaSchema";
import type { CalendarActivityEvent } from "@media-voyage/shared/api";

const calendarSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

function currentMonthToken() {
  return dayjs().format("YYYY-MM");
}

export const Route = createFileRoute("/_authenticated/calendar")({
  validateSearch: calendarSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(
      calendarActivityOptions(deps.month ?? currentMonthToken()),
    );
  },
  component: RouteComponent,
});

const EVENT_LABEL: Record<CalendarActivityEvent["eventType"], string> = {
  started: "Started",
  completed: "Completed",
  status_change: "Status changed",
};

type EventPayload = {
  userMediaId: string;
  eventType: CalendarActivityEvent["eventType"];
  toStatus: CalendarActivityEvent["toStatus"];
};

function MonthStat({ label, value }: { label: string; value: number }) {
  return (
    <Card withBorder radius="md" p="sm">
      <Stack gap={0}>
        <Text size="xl" fw={700}>
          {value}
        </Text>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Stack>
    </Card>
  );
}

function StatusLegend() {
  return (
    <Group gap="md" wrap="wrap">
      {statusEnumValues.map((status) => (
        <Group key={status} gap={6} wrap="nowrap">
          <Box
            w={8}
            h={8}
            style={{
              borderRadius: "50%",
              flexShrink: 0,
              background: `var(--mantine-color-${getStatusColor(status)}-6)`,
            }}
          />
          <Text size="xs" c="dimmed">
            {capitalizeWords(status)}
          </Text>
        </Group>
      ))}
    </Group>
  );
}

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const month = search.month ?? currentMonthToken();

  const { data, isFetching } = useQuery({
    ...calendarActivityOptions(month),
    placeholderData: keepPreviousData,
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const goToMonth = (nextMonth: string) => {
    navigate({ to: "/calendar", search: { month: nextMonth } });
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarActivityEvent[]>();

    for (const event of data?.events ?? []) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }

    return map;
  }, [data]);

  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];

  const scheduleEvents = useMemo<ScheduleEventData<EventPayload>[]>(() => {
    return (data?.events ?? []).map((event) => ({
      id: `${event.userMediaId}-${event.eventType}-${event.occurredAt}`,
      title: event.title,
      start: event.occurredAt,
      end: event.occurredAt,
      color: getStatusColor(event.status),
      payload: {
        userMediaId: event.userMediaId,
        eventType: event.eventType,
        toStatus: event.toStatus,
      },
    }));
  }, [data]);

  const monthStats = useMemo(() => {
    const events = data?.events ?? [];

    return {
      started: events.filter((event) => event.eventType === "started").length,
      completed: events.filter((event) => event.eventType === "completed")
        .length,
      statusChanges: events.filter(
        (event) => event.eventType === "status_change",
      ).length,
      activeTitles: new Set(events.map((event) => event.mediaId)).size,
    };
  }, [data]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Activity Calendar</Title>
          {isFetching && <Loader size="xs" />}
        </Group>

        <Text c="dimmed" size="sm">
          Days you started, completed, or changed the status of something in
          your library.
        </Text>

        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="sm">
          <MonthStat label="Started" value={monthStats.started} />
          <MonthStat label="Completed" value={monthStats.completed} />
          <MonthStat label="Status changes" value={monthStats.statusChanges} />
          <MonthStat label="Titles active" value={monthStats.activeTitles} />
        </SimpleGrid>

        <StatusLegend />

        <Card withBorder radius="md" p="md">
          <MonthView
            date={`${month}-01`}
            onDateChange={(newDate) =>
              goToMonth(dayjs(newDate).format("YYYY-MM"))
            }
            events={scheduleEvents}
            renderEventBody={(event) =>
              `${event.title} · ${EVENT_LABEL[(event.payload as EventPayload).eventType]}`
            }
            onEventClick={(event) =>
              navigate({
                to: "/media/view/$id",
                params: { id: (event.payload as EventPayload).userMediaId },
              })
            }
            onDayClick={(date) => {
              if (eventsByDate.get(date)?.length) setSelectedDate(date);
            }}
            maxEventsPerDay={3}
            viewSelectProps={{ views: ["month"] }}
            styles={{ monthView: { minHeight: 600 } }}
          />
        </Card>
      </Stack>

      <Modal
        opened={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        title={
          selectedDate
            ? dayjs(selectedDate).format("dddd, MMMM D, YYYY")
            : undefined
        }
      >
        <Stack gap="sm">
          {selectedEvents.map((event, index) => (
            <UnstyledButton
              key={`${event.userMediaId}-${event.eventType}-${index}`}
              role="link"
              onClick={() => {
                setSelectedDate(null);
                navigate({
                  to: "/media/view/$id",
                  params: { id: event.userMediaId },
                });
              }}
            >
              <Card
                component={motion.div}
                withBorder
                radius="md"
                p="sm"
                whileHover={
                  reduceMotion
                    ? undefined
                    : { backgroundColor: "var(--mantine-color-default-hover)" }
                }
                transition={{ duration: 0.15 }}
                style={{ cursor: "pointer" }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      {event.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {EVENT_LABEL[event.eventType]}
                      {event.eventType === "status_change" && event.toStatus
                        ? ` to ${capitalizeWords(event.toStatus)}`
                        : ""}
                    </Text>
                  </Stack>
                  <Group gap="xs" wrap="nowrap">
                    <Badge color={getStatusColor(event.status)}>
                      {capitalizeWords(event.status)}
                    </Badge>
                    <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                  </Group>
                </Group>
              </Card>
            </UnstyledButton>
          ))}
        </Stack>
      </Modal>
    </Container>
  );
}
