// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import type * as MantineHooks from "@mantine/hooks";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  LibraryConstellation as ConstellationData,
  LibraryConstellationNode,
} from "@media-voyage/shared/api";
import type { ForceGraphProps } from "react-force-graph-2d";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildMantineTheme, THEMES } from "#/theme/themes";
import LibraryConstellation from "./LibraryConstellation";

type GraphProps = ForceGraphProps<LibraryConstellationNode>;
const state = vi.hoisted(() => ({
  props: undefined as GraphProps | undefined,
  center: vi.fn(),
  zoom: vi.fn(),
  isError: false,
  height: 480,
  data: undefined as ConstellationData | undefined,
}));
const data: ConstellationData = {
  nodes: [
    {
      id: "a",
      title: "Moonrise",
      type: "movie",
      status: "completed",
      imageUrl: null,
    },
    {
      id: "b",
      title: "Starlight",
      type: "book",
      status: "planned",
      imageUrl: null,
    },
  ],
  links: [{ source: "a", target: "b", similarity: 0.82 }],
  truncated: false,
};
vi.mock("#/features/media/queries", () => ({
  libraryConstellationOptions: {},
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: state.data ?? data,
    isPending: false,
    isError: state.isError,
    refetch: vi.fn(),
  }),
}));
vi.mock("#/theme/ThemeProvider", () => ({
  useAppTheme: () => ({ themeId: "classic" }),
}));
vi.mock("@mantine/hooks", async (original) => ({
  ...(await original<typeof MantineHooks>()),
  useElementSize: () => ({ ref: undefined, width: 800, height: state.height }),
}));
vi.mock("react-force-graph-2d", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  return {
    default: forwardRef((props: GraphProps, ref) => {
      state.props = props;
      useImperativeHandle(ref, () => ({
        centerAt: state.center,
        zoom: state.zoom,
      }));
      return props.graphData?.nodes.map((node) => (
        <button
          key={node.id}
          onClick={() => props.onNodeClick?.(node, new MouseEvent("click"))}
        >
          {"Star " + node.title}
        </button>
      ));
    }),
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  state.props = undefined;
  state.isError = false;
  state.height = 480;
  state.data = undefined;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  const onOpen = vi.fn();
  const view = render(<LibraryConstellation onOpen={onOpen} />, {
    wrapper: ({ children }) => (
      <MantineProvider theme={buildMantineTheme(THEMES.classic)}>
        {children}
      </MantineProvider>
    ),
  });
  return { ...view, onOpen };
}

it("opens connected titles without mutating the overview or cached graph data", () => {
  const { onOpen } = mount();
  const graphData = state.props?.graphData;
  if (!graphData) throw new Error("Graph did not mount");
  const positions = graphData.nodes.map(({ x, y }) => ({ x, y }));

  fireEvent.click(screen.getByRole("button", { name: "Star Moonrise" }));
  const focused = state.props?.graphData;
  if (!focused) throw new Error("Focused graph did not mount");
  focused.links[0].source = focused.nodes[0];
  focused.links[0].target = focused.nodes[1];
  focused.nodes[0].x = 123;
  fireEvent.click(
    screen.getByRole("button", { name: "Starlight", exact: true }),
  );
  expect(screen.getByText("2 of 2 titles · 1 connection")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Open media" }));

  expect(onOpen).toHaveBeenCalledWith("b");
  expect(state.props?.graphData?.nodes[0]).toMatchObject({
    id: "b",
    x: 0,
    y: 0,
  });
  expect(data.nodes[0]).not.toHaveProperty("x");
  expect(data.links[0].source).toBe("a");
  fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
  expect(state.props?.graphData?.nodes.map(({ x, y }) => ({ x, y }))).toEqual(
    positions,
  );
});

it.each([0, 1])(
  "waits for canvas size and centers a title with %i connections",
  (count) => {
    state.height = 0;
    state.data = { ...data, links: data.links.slice(0, count) };
    const { rerender, onOpen } = mount();
    expect(state.props).toBeUndefined();
    expect(state.center).not.toHaveBeenCalled();
    state.height = 480;
    rerender(<LibraryConstellation onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Star Moonrise" }));
    const nodes = state.props?.graphData?.nodes;
    expect(nodes).toHaveLength(count + 1);
    expect(nodes?.[0]).toMatchObject({
      id: "a",
      x: 0,
      y: 0,
      fx: 0,
      fy: 0,
    });
    expect(state.center).toHaveBeenLastCalledWith(0, 0);
    expect(state.zoom.mock.lastCall?.[0]).toBeGreaterThan(0);
    expect(state.props?.cooldownTicks).toBe(0);
  },
);

it("keeps the loaded graph and selection after a failed refresh", () => {
  const { rerender, onOpen } = mount();
  fireEvent.click(screen.getByRole("button", { name: "Star Moonrise" }));
  const graphData = state.props?.graphData;
  state.isError = true;
  rerender(<LibraryConstellation onOpen={onOpen} />);

  expect(screen.getByRole("alert").textContent).toContain(
    "last loaded constellation",
  );
  expect(screen.getByRole("button", { name: "Open media" })).toBeTruthy();
  expect(state.props?.graphData).toBe(graphData);
});

it("renders hover titles as text rather than HTML", () => {
  mount();
  const node = state.props?.graphData?.nodes[0];
  const label = state.props?.nodeLabel;
  if (!node || typeof label !== "function")
    throw new Error("Graph did not mount");
  const title = '<img src=x onerror="alert(1)"> & a title';
  const content = label({ ...node, title });
  if (typeof content !== "string") throw new Error("Expected a text label");
  const tooltip = document.createElement("div");
  tooltip.innerHTML = content;
  expect(tooltip.textContent).toBe(title);
  expect(tooltip.querySelector("img")).toBeNull();
});

it("labels focused nodes at a fixed screen size and prioritizes the selected title", () => {
  mount();
  const labels: { title: string; font: string }[] = [];
  // Only the canvas text operations used by the label renderer are needed here.
  const ctx = {
    save() {},
    restore() {},
    strokeText() {},
    measureText: (text: string) => ({
      width: text.length * parseFloat(ctx.font.split(" ")[1]) * 0.6,
    }),
    fillText: (title: string) => labels.push({ title, font: ctx.font }),
  } as CanvasRenderingContext2D;
  const draw = (scale = 1) => {
    labels.length = 0;
    state.props?.onRenderFramePost?.(ctx, scale);
  };
  draw();
  expect(labels).toHaveLength(0);

  fireEvent.click(screen.getByRole("button", { name: "Star Moonrise" }));
  const nodes = state.props?.graphData?.nodes;
  if (!nodes) throw new Error("Graph did not mount");
  for (const scale of [0.5, 1, 4]) {
    draw(scale);
    expect(labels.map(({ title }) => title)).toEqual(["Moonrise", "Starlight"]);
    expect(parseFloat(labels[0].font.split(" ")[1]) * scale).toBe(13);
    expect(parseFloat(labels[1].font.split(" ")[1]) * scale).toBe(12);
    expect(labels[0].font).toMatch(/^600 /);
  }

  nodes[1].title = "A much longer connected title that needs truncating";
  draw();
  expect(labels[1].title).toMatch(/…$/);
  nodes[1].title = "Starlight";
  fireEvent.click(screen.getByRole("button", { name: "Star Starlight" }));
  const neighbour = state.props?.graphData?.nodes[1];
  if (!neighbour) throw new Error("Connected title is missing");
  neighbour.x = 0;
  neighbour.y = 0;
  draw();
  expect(labels.map(({ title }) => title)).toEqual(["Starlight"]);

  fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
  draw();
  expect(labels).toHaveLength(0);
});

it("centers a title and spaces its neighbours evenly without changing the 155-title overview", () => {
  const nodes = [
    ...data.nodes,
    ...Array.from({ length: 153 }, (_, index) => ({
      ...data.nodes[0],
      id: "extra-" + index,
      title: "Title " + (index + 3),
    })),
  ];
  state.data = {
    nodes,
    links: [
      ...data.links,
      { source: "a", target: "extra-0", similarity: 0.75 },
      { source: "a", target: "extra-1", similarity: 0.6 },
      ...Array.from({ length: 343 }, (_, index) => ({
        source: nodes[4 + (index % 151)].id,
        target: nodes[4 + ((index + 1 + Math.floor(index / 151)) % 151)].id,
        similarity: 0.6,
      })),
    ],
    truncated: false,
  };
  mount();
  const graphData = state.props?.graphData;
  if (!graphData) throw new Error("Graph did not mount");
  expect(state.data.links).toHaveLength(346);
  expect(graphData.links).toHaveLength(0);
  expect(screen.getAllByRole("button", { name: /^Star / })).toHaveLength(155);
  const positions = graphData.nodes.map(({ x, y }) => ({ x, y }));

  fireEvent.click(screen.getByRole("button", { name: "Star Moonrise" }));
  const focused = state.props?.graphData;
  if (!focused) throw new Error("Focused graph did not mount");
  expect(screen.getAllByRole("button", { name: /^Star / })).toHaveLength(4);
  expect(focused.links).toHaveLength(3);
  expect(screen.getByText("4 of 155 titles · 3 connections")).toBeTruthy();
  expect(focused.nodes[0]).toMatchObject({
    id: "a",
    x: 0,
    y: 0,
    fx: 0,
    fy: 0,
  });
  const neighbours = focused.nodes.slice(1);
  const radii = neighbours.map((node) => Math.hypot(node.x ?? 0, node.y ?? 0));
  const gaps = neighbours.map((node, index) => {
    const next = neighbours[(index + 1) % neighbours.length];
    return Math.hypot(
      (node.x ?? 0) - (next.x ?? 0),
      (node.y ?? 0) - (next.y ?? 0),
    );
  });
  expect(radii[0]).toBeGreaterThan(0);
  expect(gaps[0]).toBeGreaterThan(0);
  neighbours.forEach((node, index) => {
    expect(radii[index]).toBeCloseTo(radii[0]);
    expect(gaps[index]).toBeCloseTo(gaps[0]);
    expect(node.fx).toBe(node.x);
    expect(node.fy).toBe(node.y);
  });
  expect(data.nodes[0]).not.toHaveProperty("x");
  state.props?.onEngineStop?.();
  expect(state.center).toHaveBeenCalledWith(0, 0);
  expect(state.zoom.mock.lastCall?.[0]).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
  expect(screen.getAllByRole("button", { name: /^Star / })).toHaveLength(155);
  expect(state.props?.graphData?.nodes.map(({ x, y }) => ({ x, y }))).toEqual(
    positions,
  );
});
