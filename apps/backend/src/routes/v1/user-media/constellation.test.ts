import { expect, it } from "vitest";
import {
  buildLibraryConstellation,
  CONSTELLATION_NODE_LIMIT,
} from "./constellation";

function record(id: number, embedding: number[] | null) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    title: `Title ${id}`,
    type: "movie" as const,
    imageUrl: null,
    status: "planned" as const,
    embedding,
  };
}

it("uses cosine similarity without self links, duplicate edges or unusable vectors", () => {
  const records = [
    record(1, [1, 0]),
    record(2, [2, 0]),
    record(3, [0, 1]),
    record(4, [-1, 0]),
    record(5, [0, 0]),
    record(6, null),
  ];
  const graph = buildLibraryConstellation(records, 0.4);

  expect(graph.nodes.map((node) => node.id)).toEqual(
    records.slice(0, 4).map((node) => node.id),
  );
  expect(graph.nodes.every((node) => !("embedding" in node))).toBe(true);
  expect(graph.links).toEqual([
    { source: records[0].id, target: records[1].id, similarity: 1 },
  ]);
  expect(graph.truncated).toBe(false);
  expect(buildLibraryConstellation([], 0.4)).toEqual({
    nodes: [],
    links: [],
    truncated: false,
  });
});

it("uses the configured similarity cutoff", () => {
  const records = [record(1, [1, 0]), record(2, [0.6, 0.8])];

  expect(buildLibraryConstellation(records, 0.5).links).toHaveLength(1);
  expect(
    buildLibraryConstellation(records, 0.5).links[0].similarity,
  ).toBeCloseTo(0.6);
  expect(buildLibraryConstellation(records, 0.7).links).toHaveLength(0);
  expect(
    buildLibraryConstellation([record(1, [1, 0]), record(2, [1, 0])], 1).links,
  ).toEqual([]);
});

it("limits neighbour choices, preserves incoming links and caps the library", () => {
  const ranked = [
    record(1, [1, 0]),
    record(2, [0.99, 0.01]),
    record(3, [0.9, 0.1]),
    record(4, [0.8, 0.2]),
    record(5, [0.36, 0.64]),
  ];
  expect(
    buildLibraryConstellation(ranked, 0.4).links.some(
      (link) => link.source === ranked[0].id && link.target === ranked[4].id,
    ),
  ).toBe(false);

  const records = Array.from({ length: CONSTELLATION_NODE_LIMIT + 1 }, (_, i) =>
    record(i, [1, 0]),
  );
  const graph = buildLibraryConstellation(records, 0.4);

  expect(graph.truncated).toBe(true);
  expect(graph.nodes).toHaveLength(CONSTELLATION_NODE_LIMIT);
  expect(
    graph.links.some(
      (link) => link.source === records[10].id || link.target === records[10].id,
    ),
  ).toBe(true);
  expect(graph.links.some((link) => link.target === records.at(-1)?.id)).toBe(
    false,
  );
});
