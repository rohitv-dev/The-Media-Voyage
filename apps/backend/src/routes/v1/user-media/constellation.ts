import type {
  LibraryConstellation,
  LibraryConstellationNode,
} from "@media-voyage/shared/api";

export const CONSTELLATION_NODE_LIMIT = 200;

export function buildLibraryConstellation(
  records: (LibraryConstellationNode & { embedding: number[] | null })[],
  similarityThreshold: number,
): LibraryConstellation {
  const stars = records
    .slice(0, CONSTELLATION_NODE_LIMIT)
    .flatMap(({ embedding, ...node }) => {
      const norm = Math.hypot(...(embedding ?? []));
      return embedding && norm > 0 && Number.isFinite(norm)
        ? [{ node, embedding, norm }]
        : [];
    });
  const links = new Map<string, LibraryConstellation["links"][number]>();
  const neighbours: { index: number; similarity: number }[][] = stars.map(
    () => [],
  );

  // shortcut: bounded pairwise scan; use pgvector neighbours if the 200-title cap grows.
  stars.forEach((star, index) => {
    for (let otherIndex = index + 1; otherIndex < stars.length; otherIndex++) {
      const other = stars[otherIndex];
      const similarity = Math.min(
        1,
        star.embedding.reduce(
          (sum, value, dimension) => sum + value * other.embedding[dimension],
          0,
        ) /
          (star.norm * other.norm),
      );
      if (similarity > similarityThreshold) {
        neighbours[index].push({ index: otherIndex, similarity });
        neighbours[otherIndex].push({ index, similarity });
      }
    }
  });

  neighbours.forEach((matches, index) => {
    for (const neighbour of matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)) {
      const source = stars[Math.min(index, neighbour.index)].node.id;
      const target = stars[Math.max(index, neighbour.index)].node.id;
      links.set(`${source}:${target}`, {
        source,
        target,
        similarity: neighbour.similarity,
      });
    }
  });

  return {
    nodes: stars.map((star) => star.node),
    links: [...links.values()],
    truncated: records.length > CONSTELLATION_NODE_LIMIT,
  };
}
