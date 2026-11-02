import { EmptyState } from "#/components/EmptyState";
import { getTypeColor } from "#/features/media/display";
import { libraryConstellationOptions } from "#/features/media/queries";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { useAppTheme } from "#/theme/ThemeProvider";
import { THEMES } from "#/theme/themes";
import { capitalizeWords } from "#/utils/strings";
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import type {
  LibraryConstellation,
  LibraryConstellationNode,
} from "@media-voyage/shared/api";
import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type {
  ForceGraphMethods,
  GraphData,
  LinkObject,
} from "react-force-graph-2d";

type ConstellationLink = Pick<
  LibraryConstellation["links"][number],
  "similarity"
>;

function otherNodeId(
  link: LinkObject<LibraryConstellationNode, ConstellationLink>,
  id: string,
): string | null {
  const source = typeof link.source === "object" ? link.source.id : link.source;
  const target = typeof link.target === "object" ? link.target.id : link.target;
  if (source === id && typeof target === "string") return target;
  if (target === id && typeof source === "string") return source;
  return null;
}

export default function LibraryConstellation({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const { data, isPending, isFetching, isError, refetch } = useQuery(
    libraryConstellationOptions,
  );
  const theme = useMantineTheme();
  const { themeId } = useAppTheme();
  const reducedMotion = useAppReducedMotion();
  const { ref, width, height } = useElementSize();
  const graph = useRef<
    ForceGraphMethods<LibraryConstellationNode, ConstellationLink> | undefined
  >(undefined);
  const fitted = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The graph library mutates its objects; keep the query cache untouched.
  const graphData = useMemo<
    GraphData<LibraryConstellationNode, ConstellationLink>
  >(
    () => ({
      nodes: (data?.nodes ?? []).map((node) => ({ ...node })),
      links: (data?.links ?? []).map((link) => ({ ...link })),
    }),
    [data],
  );
  const graphVisible = width > 0 && height > 0 && graphData.nodes.length > 0;
  const fitGraph = (duration = 0) => {
    // The renderer can stop before warmup initializes node coordinates.
    if (
      !graph.current ||
      !graphVisible ||
      graphData.nodes.some(
        (node) => !Number.isFinite(node.x) || !Number.isFinite(node.y),
      )
    ) {
      return false;
    }
    graph.current.zoomToFit(duration, Math.min(72, width / 6));
    return true;
  };
  useLayoutEffect(() => {
    if (!graphVisible || !graph.current) return;
    fitted.current = false;
    graph.current.d3Force("charge")?.strength(-85).distanceMax(180);
    graph.current
      .d3Force("link")
      ?.distance(
        (link: LinkObject<LibraryConstellationNode, ConstellationLink>) =>
          42 + (1 - (link.similarity ?? 0.5)) * 75,
      );
    // Keep isolated titles and long chains in the same field.
    graph.current.d3Force("constellation", (alpha) => {
      for (const node of graphData.nodes) {
        node.vx = (node.vx ?? 0) - (node.x ?? 0) * alpha * 0.025;
        node.vy = (node.vy ?? 0) - (node.y ?? 0) * alpha * 0.025;
      }
    });
  }, [graphData, graphVisible]);
  useEffect(() => {
    if (fitted.current && width > 0 && height > 0) {
      graph.current?.zoomToFit(0, Math.min(72, width / 6));
    }
  }, [width, height]);

  const selected = data?.nodes.find((node) => node.id === selectedId);
  const connections =
    selected && data
      ? data.links
          .flatMap((link) => {
            const id = otherNodeId(link, selected.id);
            const node = id
              ? data.nodes.find((node) => node.id === id)
              : undefined;
            return node ? [{ node, similarity: link.similarity }] : [];
          })
          .sort(
            (a, b) =>
              (b.similarity ?? -1) - (a.similarity ?? -1) ||
              a.node.title.localeCompare(b.node.title),
          )
      : [];
  const graphText = THEMES[themeId].text;

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Stack gap={4} align="center" ta="center">
          <Title order={2}>Library Constellation</Title>
          <Text size="sm" c="dimmed">
            Explore connections in your library.
          </Text>
        </Stack>

        {isError && data && (
          <Alert color="red" title="Library could not be refreshed">
            Showing your last loaded constellation. Try refreshing again.
          </Alert>
        )}

        {isPending ? (
          <Center h={240}>
            <Loader role="status" aria-label="Loading constellation" />
          </Center>
        ) : !data ? (
          <EmptyState
            title="Constellation could not be loaded"
            description="Try refreshing to load your library again."
          />
        ) : !data.nodes.length ? (
          <EmptyState
            title="No titles ready yet"
            description="Titles appear here once their search data is ready. Try refreshing in a moment."
          />
        ) : (
          <>
            <Select
              label="Find a title"
              placeholder="Search your library"
              leftSection={<IconSearch size={16} />}
              searchable
              clearable
              w="100%"
              maw={520}
              mx="auto"
              value={selected?.id ?? null}
              data={data.nodes.map((node) => ({
                value: node.id,
                label: node.title + " · " + capitalizeWords(node.type),
              }))}
              onChange={setSelectedId}
            />

            <Card withBorder p={0} style={{ overflow: "hidden" }}>
              <Box
                ref={ref}
                h={{ base: 360, sm: 480 }}
                role="region"
                aria-label="Interactive constellation"
              >
                {graphVisible && (
                  <ForceGraph2D<LibraryConstellationNode, ConstellationLink>
                    ref={graph}
                    graphData={graphData}
                    width={width}
                    height={height}
                    backgroundColor={THEMES[themeId].surface}
                    nodeRelSize={6}
                    nodeVal={(node) => (node.id === selected?.id ? 3 : 1)}
                    nodeColor={(node) =>
                      theme.colors[getTypeColor(node.type)][6]
                    }
                    nodeLabel={(node) => {
                      const label = document.createElement("span");
                      label.textContent = node.title;
                      return label.outerHTML;
                    }}
                    linkColor={(link) =>
                      selected && otherNodeId(link, selected.id) !== null
                        ? theme.colors.accent[5]
                        : graphText + "40"
                    }
                    linkWidth={(link) =>
                      selected && otherNodeId(link, selected.id) !== null
                        ? 1.5
                        : 0.6
                    }
                    maxZoom={4}
                    warmupTicks={160}
                    cooldownTicks={0}
                    enableNodeDrag={false}
                    onNodeClick={(node) => setSelectedId(node.id)}
                    onBackgroundClick={() => setSelectedId(null)}
                    onEngineStop={() => {
                      if (!fitted.current) fitted.current = fitGraph();
                    }}
                  />
                )}
              </Box>
              <Group
                justify="space-between"
                px="sm"
                py={6}
                gap="xs"
                style={{
                  borderTop: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <Text size="xs" c="dimmed">
                  {data.nodes.length} titles · {data.links.length} connections
                </Text>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => {
                    setSelectedId(null);
                    fitGraph(reducedMotion ? 0 : 350);
                  }}
                >
                  Reset view
                </Button>
              </Group>
            </Card>

            <Card
              withBorder
              p="md"
              role="region"
              aria-label="Selected media details"
            >
              {selected ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                        {selected.title}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {capitalizeWords(selected.type)}
                      </Text>
                    </Group>
                    <Button size="sm" onClick={() => onOpen(selected.id)}>
                      Open media
                    </Button>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Connected titles
                    </Text>
                    {connections.length ? (
                      connections.map(({ node }) => (
                        <Button
                          key={node.id}
                          size="compact-sm"
                          variant="default"
                          maw="100%"
                          onClick={() => setSelectedId(node.id)}
                        >
                          {node.title}
                        </Button>
                      ))
                    ) : (
                      <Text size="sm" c="dimmed">
                        No connections yet.
                      </Text>
                    )}
                  </Group>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  Choose a title or select a node to see its connections.
                </Text>
              )}
            </Card>
          </>
        )}

        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">
            {data?.nodes.length
              ? "Drag to pan · Scroll to zoom. Only titles with search data are shown."
              : ""}
            {data?.truncated && " Showing the latest 200 titles."}
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            loading={isFetching && !isPending}
            disabled={isPending}
            onClick={() => void refetch()}
          >
            Refresh library
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
