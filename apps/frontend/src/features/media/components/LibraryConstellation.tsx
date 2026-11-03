import { EmptyState } from "#/components/EmptyState";
import { getTypeColor } from "#/features/media/display";
import { libraryConstellationOptions } from "#/features/media/queries";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { ForceGraphMethods, GraphData } from "react-force-graph-2d";

type ConstellationLink = Pick<
  LibraryConstellation["links"][number],
  "similarity"
>;

const FOCUS_RADIUS = 120;

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
  const { ref, width, height } = useElementSize();
  const graph = useRef<
    ForceGraphMethods<LibraryConstellationNode, ConstellationLink> | undefined
  >(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data?.nodes.find((node) => node.id === selectedId);
  const connections = useMemo(() => {
    if (!selected || !data) return [];
    return data.links
      .flatMap((link) => {
        if (link.source !== selected.id && link.target !== selected.id)
          return [];
        const id = link.source === selected.id ? link.target : link.source;
        const node = data.nodes.find((candidate) => candidate.id === id);
        return node ? [{ node, similarity: link.similarity }] : [];
      })
      .sort(
        (a, b) =>
          (b.similarity ?? -1) - (a.similarity ?? -1) ||
          a.node.title.localeCompare(b.node.title),
      );
  }, [data, selected]);
  // The graph library mutates its objects; keep the query cache untouched.
  const graphData = useMemo<
    GraphData<LibraryConstellationNode, ConstellationLink>
  >(() => {
    const nodes = selected
      ? [selected, ...connections.map(({ node }) => node)]
      : (data?.nodes ?? []);
    return {
      nodes: nodes.map((node, index) => {
        if (selected && index === 0)
          return { ...node, x: 0, y: 0, fx: 0, fy: 0 };
        // Spread overview dots in a fixed spiral without running a simulation.
        const angle = selected
          ? ((index - 1) * 2 * Math.PI) / connections.length - Math.PI / 2
          : index * Math.PI * (3 - Math.sqrt(5));
        const radius = selected ? FOCUS_RADIUS : 20 * Math.sqrt(index);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return { ...node, x, y, fx: x, fy: y };
      }),
      links: selected
        ? connections.map(({ node, similarity }) => ({
            source: selected.id,
            target: node.id,
            similarity,
          }))
        : [],
    };
  }, [data, selected, connections]);
  const graphVisible = width > 0 && height > 0 && graphData.nodes.length > 0;
  const fitGraph = useCallback(() => {
    if (!graph.current || !graphVisible) return;
    const padding = Math.min(72, width / 6, height / 6);
    const radius =
      Math.max(
        FOCUS_RADIUS,
        ...graphData.nodes.map((node) => Math.hypot(node.x ?? 0, node.y ?? 0)),
      ) + 12;
    graph.current.centerAt(0, 0);
    graph.current.zoom((Math.min(width, height) - padding * 2) / (2 * radius));
  }, [graphData, graphVisible, width, height]);
  useEffect(() => {
    fitGraph();
  }, [fitGraph]);

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Stack gap={4} align="center" ta="center">
          <Title order={2}>Library Constellation</Title>
          <Text size="sm" c="dimmed">
            Explore one title and its connections at a time.
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
                    onRenderFramePost={(ctx, scale) => {
                      if (!selected) return;
                      const labels: { x: number; y: number; width: number }[] =
                        [];
                      const maxLabelWidth = Math.min(160, width / 3) / scale;
                      ctx.save();
                      ctx.textAlign = "center";
                      ctx.textBaseline = "top";
                      ctx.fillStyle = THEMES[themeId].text;
                      ctx.strokeStyle = THEMES[themeId].surface;
                      ctx.lineWidth = 3 / scale;
                      ctx.lineJoin = "round";
                      for (const node of graphData.nodes) {
                        if (node.x === undefined || node.y === undefined)
                          continue;
                        const active = node.id === selected.id;
                        ctx.font = `${active ? 600 : 400} ${(active ? 13 : 12) / scale}px ${theme.fontFamily}`;
                        const letters = Array.from(node.title);
                        let label = node.title;
                        while (
                          letters.length > 1 &&
                          ctx.measureText(label).width > maxLabelWidth
                        ) {
                          letters.pop();
                          label = letters.join("").trimEnd() + "…";
                        }
                        const labelWidth = ctx.measureText(label).width;
                        const x = node.x;
                        const y =
                          node.y + 6 * Math.sqrt(active ? 3 : 1) + 5 / scale;
                        if (
                          labels.some(
                            (previous) =>
                              Math.abs(x - previous.x) <
                                (labelWidth + previous.width) / 2 + 4 / scale &&
                              Math.abs(y - previous.y) < 18 / scale,
                          )
                        )
                          continue;
                        labels.push({ x, y, width: labelWidth });
                        ctx.strokeText(label, x, y);
                        ctx.fillText(label, x, y);
                      }
                      ctx.restore();
                    }}
                    linkColor={() => theme.colors.accent[5]}
                    linkWidth={1.5}
                    maxZoom={4}
                    cooldownTicks={0}
                    enableNodeDrag={false}
                    onNodeClick={(node) => setSelectedId(node.id)}
                    onBackgroundClick={() => setSelectedId(null)}
                    onEngineStop={fitGraph}
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
                  {selected
                    ? `${graphData.nodes.length} of ${data.nodes.length} titles · ${connections.length} connection${connections.length === 1 ? "" : "s"}`
                    : `${data.nodes.length} titles · Choose a title`}
                </Text>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => {
                    setSelectedId(null);
                    if (!selected) fitGraph();
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
                  Choose a title or select a node to focus on its connections.
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
