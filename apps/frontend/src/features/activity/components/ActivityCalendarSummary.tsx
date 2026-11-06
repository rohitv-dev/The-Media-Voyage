import { calendarActivityOptions } from "#/features/activity/queries";
import { getStatusColor } from "#/features/media/display";
import { capitalizeWords } from "#/utils/strings";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { MobileMonthView } from "@mantine/schedule";
import type { ScheduleEventData } from "@mantine/schedule";
import type { CalendarActivityEvent } from "@media-voyage/shared/api";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

const EVENT_LABEL: Record<CalendarActivityEvent["eventType"], string> = {
  started: "Started",
  completed: "Completed",
  status_change: "Status changed",
};

interface ActivityCalendarSummaryProps {
  month: string;
  onMonthChange: (month: string) => void;
  onView: (id: string) => void;
}

export function ActivityCalendarSummary({
  month,
  onMonthChange,
  onView,
}: ActivityCalendarSummaryProps) {
  const firstDay = `${month}-01`;
  const monthDate = dayjs(firstDay);
  const { data, isFetching, isError, refetch } = useQuery(
    calendarActivityOptions(month),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const days = new Map<string, CalendarActivityEvent[]>();

    for (const event of data?.events ?? []) {
      const events = days.get(event.date) ?? [];
      events.push(event);
      days.set(event.date, events);
    }

    return days;
  }, [data]);
  const selectedEvents = selectedDate
    ? eventsByDate.get(selectedDate)
    : undefined;

  useEffect(() => {
    if (selectedDate && !selectedEvents) setSelectedDate(null);
  }, [selectedDate, selectedEvents]);

  const scheduleEvents = useMemo<ScheduleEventData[]>(
    () =>
      (data?.events ?? []).map((event) => ({
        id: `${event.userMediaId}-${event.eventType}-${event.occurredAt}`,
        title: event.title,
        start: event.date,
        end: event.date,
        color: getStatusColor(event.status),
      })),
    [data],
  );

  return (
    <Card withBorder radius="md" p="sm">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2}>
            <Title order={3} size="h4" aria-live="polite">
              {monthDate.format("MMMM YYYY")}
            </Title>
            <Text size="xs" c="dimmed">
              Library milestones
            </Text>
          </Stack>
          <Group gap={4} wrap="nowrap">
            {isFetching && <Loader size="xs" aria-label="Loading milestones" />}
            <ActionIcon
              variant="default"
              size="xl"
              aria-label="Previous month"
              onClick={() =>
                onMonthChange(monthDate.subtract(1, "month").format("YYYY-MM"))
              }
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="xl"
              aria-label="Next month"
              onClick={() =>
                onMonthChange(monthDate.add(1, "month").format("YYYY-MM"))
              }
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <MobileMonthView
          date={firstDay}
          selectedDate={selectedEvents ? selectedDate : null}
          events={scheduleEvents}
          consistentWeeks={false}
          weekdayFormat="ddd"
          getDayProps={(date) => {
            const hasMilestones = eventsByDate.has(date);
            return {
              // Focusable day cells let the calendar handle arrow keys.
              "aria-disabled": !hasMilestones,
              "aria-selected": undefined,
              "aria-pressed": hasMilestones ? date === selectedDate : undefined,
              style: hasMilestones ? undefined : { cursor: "default" },
            };
          }}
          onDayClick={(date) => {
            if (eventsByDate.has(date)) setSelectedDate(date);
          }}
          styles={{
            mobileMonthViewHeader: { display: "none" },
            mobileMonthViewEventsList: { display: "none" },
            mobileMonthViewWeekday: { fontSize: "var(--mantine-font-size-xs)" },
            mobileMonthViewDay: { fontSize: "var(--mantine-font-size-sm)" },
          }}
        />

        {isError ? (
          <Alert color="red" title="Monthly recap could not be loaded">
            <Button size="xs" variant="subtle" onClick={() => void refetch()}>
              Try again
            </Button>
          </Alert>
        ) : data?.events.length === 0 ? (
          <Text size="sm" c="dimmed">
            No milestones this month
          </Text>
        ) : null}

        {selectedDate && selectedEvents && (
          <Stack
            component="section"
            aria-labelledby="selected-day-milestones"
            gap="xs"
          >
            <Group justify="space-between" wrap="nowrap">
              <Title order={4} size="h5" id="selected-day-milestones">
                On {dayjs(selectedDate).format("dddd, MMMM D")}
              </Title>
              <ActionIcon
                variant="subtle"
                aria-label="Close day milestones"
                onClick={() => setSelectedDate(null)}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
            {[...selectedEvents]
              .sort((left, right) =>
                left.occurredAt.localeCompare(right.occurredAt),
              )
              .map((event) => (
                <UnstyledButton
                  key={`${event.userMediaId}-${event.eventType}-${event.occurredAt}`}
                  onClick={() => onView(event.userMediaId)}
                  p="xs"
                  bd="1px solid var(--mantine-color-default-border)"
                  style={{ borderRadius: "var(--mantine-radius-sm)" }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2} miw={0}>
                      <Text size="sm" fw={600} lineClamp={2}>
                        {event.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {EVENT_LABEL[event.eventType]}
                        {event.eventType === "status_change" && event.toStatus
                          ? ` to ${capitalizeWords(event.toStatus)}`
                          : ""}
                      </Text>
                    </Stack>
                    <IconChevronRight size={16} />
                  </Group>
                </UnstyledButton>
              ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
