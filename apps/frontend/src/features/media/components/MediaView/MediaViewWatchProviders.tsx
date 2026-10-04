import { authClient } from "#/auth/authClient";
import { sessionQueryKey, sessionQueryOptions } from "#/auth/session";
import { getApiErrorMessage } from "#/lib/api";
import { showErrorNotification } from "#/lib/notifications";
import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Image,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  DEFAULT_WATCH_COUNTRY,
  watchCountrySchema,
  watchOfferTypeValues,
} from "@media-voyage/shared/api";
import type { TmdbMediaType, WatchOfferType } from "@media-voyage/shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconExternalLink, IconInfoCircle } from "@tabler/icons-react";
import {
  tmdbWatchProvidersOptions,
  tmdbWatchRegionsOptions,
} from "../../queries";
import { accentText, defaultBorder } from "./constants";

const offerLabels: Record<WatchOfferType, string> = {
  flatrate: "Subscription",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

export function MediaViewWatchProviders({
  type,
  id,
}: {
  type: TmdbMediaType;
  id: number;
}) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(sessionQueryOptions);
  const session = sessionQuery.data;
  const savedCountry = watchCountrySchema.safeParse(session?.user.watchCountry);
  const country = savedCountry.success
    ? savedCountry.data
    : DEFAULT_WATCH_COUNTRY;
  const regions = useQuery({
    ...tmdbWatchRegionsOptions,
    enabled: !!session,
  });
  const availability = useQuery({
    ...tmdbWatchProvidersOptions(type, id, country),
    enabled: !!session,
  });
  const saveCountry = useMutation({
    mutationFn: async (value: string) => {
      const watchCountry = watchCountrySchema.parse(value);
      const result = await authClient.updateUser({ watchCountry });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not save watch country");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
    onError: (error) => {
      showErrorNotification({
        message: getApiErrorMessage(error, "Could not save watch country"),
      });
    },
  });

  const countries =
    regions.data?.map((region) => ({
      value: region.code,
      label: region.name,
    })) ?? [];
  if (!countries.some((option) => option.value === country)) {
    countries.unshift({ value: country, label: country });
  }
  const countryName = countries.find(
    (option) => option.value === country,
  )?.label;
  const offers = availability.data?.offers;
  const hasOffers =
    offers && watchOfferTypeValues.some((kind) => offers[kind].length);

  return (
    <Paper withBorder p="xs">
      <Group justify="space-between" align="center" px="md" py="sm" gap="xs">
        <Group gap={4} wrap="nowrap">
          <Text size="sm" fw={800} style={{ color: accentText }}>
            Where to watch
          </Text>
          {type === "show" && hasOffers && (
            <Tooltip
              label="Availability may vary by season."
              events={{ hover: true, focus: true, touch: true }}
            >
              <ActionIcon
                aria-label="Season availability information"
                variant="subtle"
                color="gray"
                size="sm"
              >
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <Group
          gap="sm"
          wrap="nowrap"
          justify="space-between"
          w={{ base: "100%", xs: "auto" }}
        >
          <Tooltip
            label={
              saveCountry.isPending
                ? "Saving country…"
                : "Saved to your account"
            }
            events={{ hover: true, focus: true, touch: true }}
          >
            <Select
              aria-label="Watch country"
              data={countries}
              value={country}
              searchable
              allowDeselect={false}
              w={150}
              size="xs"
              rightSection={
                saveCountry.isPending ? <Loader size={12} /> : undefined
              }
              disabled={!regions.data || saveCountry.isPending || !session}
              onChange={(value) => {
                if (value && value !== country) saveCountry.mutate(value);
              }}
            />
          </Tooltip>
          {!availability.isError && availability.data?.link && (
            <Anchor
              aria-label="View watch options"
              href={availability.data.link}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              View options
              <IconExternalLink size={14} />
            </Anchor>
          )}
        </Group>
      </Group>
      <Stack
        px="md"
        py="sm"
        gap="sm"
        style={{ borderTop: `1px solid ${defaultBorder}` }}
      >
        {regions.isError && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Could not load the country list.
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => void regions.refetch()}
            >
              Retry countries
            </Button>
          </Group>
        )}
        {!session && !sessionQuery.isPending ? (
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              Could not load your watch country.
            </Text>
            <Button
              size="xs"
              variant="light"
              loading={sessionQuery.isFetching}
              onClick={() => void sessionQuery.refetch()}
            >
              Try again
            </Button>
          </Group>
        ) : sessionQuery.isPending || availability.isPending ? (
          <Group gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading watch options…
            </Text>
          </Group>
        ) : availability.isError ? (
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              Could not load watch options.
            </Text>
            <Button
              size="xs"
              variant="light"
              loading={availability.isFetching}
              onClick={() => void availability.refetch()}
            >
              Try again
            </Button>
          </Group>
        ) : hasOffers ? (
          watchOfferTypeValues.map((kind) => {
            const providers = offers[kind];
            if (!providers.length) return null;
            return (
              <Group key={kind} gap="sm" align="flex-start" wrap="nowrap">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  w={88}
                  lh="24px"
                  style={{ flexShrink: 0 }}
                >
                  {offerLabels[kind]}
                </Text>
                <Group gap="md" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
                  {providers.map((provider) => (
                    <Group key={provider.id} gap="xs" wrap="nowrap" maw="100%">
                      {provider.logoUrl && (
                        <Image
                          src={provider.logoUrl}
                          alt=""
                          w={24}
                          h={24}
                          radius="sm"
                          style={{ flexShrink: 0 }}
                        />
                      )}
                      <Text size="sm" style={{ overflowWrap: "anywhere" }}>
                        {provider.name}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </Group>
            );
          })
        ) : (
          <Text size="sm" c="dimmed">
            No watch options found for {countryName}.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
