import { userMediaFilterQueryOptions } from "#/features/media/queries";
import {
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  Flex,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MediaCard } from "#/features/media/components/MediaCard";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { showErrorNotification } from "#/utils/notifications";
import { useDisclosure, useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";
import { MediaFilterCard } from "#/features/media/components/MediaFilterCard";
import { capitalizeWords } from "#/utils/stringFunctions";
import { IconFilter } from "@tabler/icons-react";

export const Route = createFileRoute("/_authenticated/media/")({
  validateSearch: userMediaQuerySchema,
  loaderDeps: ({ search: { favorite, search, status, type } }) => ({
    status,
    type,
    favorite,
    search,
  }),
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(userMediaFilterQueryOptions(deps));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { data, isFetching, isError } = useQuery({
    ...userMediaFilterQueryOptions(search),
    placeholderData: keepPreviousData,
  });
  const navigate = useNavigate();
  const isMdDown = useMediaQuery("(max-width: 47.99em)");
  const [view, setView] = useLocalStorage({
    key: "media-view",
    defaultValue: "grid",
  });

  const [opened, { open, close }] = useDisclosure();

  const [filters, setFilters] = useState<UserMediaQuerySchema>(search);

  const updateFilters = (newFilters: UserMediaQuerySchema) => {
    setFilters(newFilters);
  };

  const applyFilters = () => {
    navigate({ to: "/media", search: filters });
    close();
  };

  const resetFilters = () => {
    setFilters({
      favorite: undefined,
      search: undefined,
      status: [],
      type: [],
    });
    close();
    navigate({ to: "/media", search: undefined });
  };

  useEffect(() => {
    if (isError) {
      showErrorNotification({
        message: "Failed to load data",
        title: "Please try again later",
      });
    }
  }, [isError]);

  useEffect(() => {
    if (isMdDown && view !== "grid") {
      setView("grid");
    }
  }, [isMdDown, view, setView]);

  return (
    <Container fluid pt="md" pb="md">
      <Stack gap="xs">
        <Group justify="apart" align="center" mb="md">
          <Stack gap={2}>
            <Group justify="space-between" align="center">
              <Group>
                <Text size="lg" fw={700}>
                  Library
                </Text>
                {isFetching && <Loader size="xs" />}
              </Group>
              <Box hiddenFrom="lg">
                <Button
                  size="xs"
                  leftSection={<IconFilter size={16} />}
                  onClick={open}
                >
                  Filters
                </Button>
              </Box>
            </Group>
            <Text color="dimmed" size="sm">
              Click any card to view the full details, or use the action button
              to update.
            </Text>
            <Group mt="sm" wrap="wrap">
              {search.status?.map((val) => (
                <Badge key={val} color="teal">
                  {capitalizeWords(val)}
                </Badge>
              ))}
              {search.type?.map((val) => (
                <Badge key={val} color="teal">
                  {capitalizeWords(val)}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Group>

        {/* <Box>
          <SegmentedControl
            visibleFrom="md"
            size="sm"
            data={[
              {
                label: <IconGridDots />,
                value: "grid",
              },
              {
                label: <IconList />,
                value: "list",
              },
            ]}
            value={view}
            onChange={setView}
          />
        </Box> */}

        <Flex gap="sm">
          <Box flex="1">
            <SimpleGrid
              hidden={view !== "grid"}
              cols={{
                base: 1,
                sm: 2,
                lg: 3,
                xl: 4,
              }}
            >
              <AnimatePresence mode="popLayout">
                {data?.data.map((record) => (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      duration: 0.2,
                      layout: {
                        duration: 0.25,
                      },
                    }}
                  >
                    <MediaCard
                      key={record.id}
                      media={record}
                      onView={(id) =>
                        navigate({
                          to: "/media/view/$id",
                          params: { id },
                          viewTransition: true,
                        })
                      }
                      onEdit={(id) =>
                        navigate({ to: "/media/update/$id", params: { id } })
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </SimpleGrid>
          </Box>

          <Box visibleFrom="lg">
            <MediaFilterCard
              filters={filters}
              applyFilters={applyFilters}
              resetFilters={resetFilters}
              updateFilters={updateFilters}
            />
          </Box>
        </Flex>
      </Stack>

      <Drawer opened={opened} onClose={close}>
        <MediaFilterCard
          filters={filters}
          applyFilters={applyFilters}
          resetFilters={resetFilters}
          updateFilters={updateFilters}
        />
      </Drawer>
    </Container>
  );
}
