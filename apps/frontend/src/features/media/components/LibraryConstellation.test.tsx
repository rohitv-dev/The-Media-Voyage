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
  fit: vi.fn(),
  isError: false,
  height: 480,
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
    data,
    isPending: false,
    isError: state.isError,
    refetch: vi.fn(),
  }),
}));
vi.mock("#/theme/ThemeProvider", () => ({
  useAppTheme: () => ({ themeId: "classic" }),
}));
vi.mock("#/hooks/useAppReducedMotion", () => ({
  useAppReducedMotion: () => true,
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
        d3Force: () => ({
          strength: () => ({ distanceMax: vi.fn() }),
          distance: vi.fn(),
        }),
        zoomToFit: state.fit,
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

it("opens connected titles without changing the layout or cached graph data", () => {
  const { onOpen } = mount();
  const graphData = state.props?.graphData;
  if (!graphData) throw new Error("Graph did not mount");
  graphData.links[0].source = graphData.nodes[0];
  graphData.links[0].target = graphData.nodes[1];
  graphData.nodes[0].x = 123;

  fireEvent.click(screen.getByRole("button", { name: "Star Moonrise" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Starlight", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Open media" }));

  expect(onOpen).toHaveBeenCalledWith("b");
  expect(state.props?.graphData).toBe(graphData);
  expect(graphData.nodes[0].x).toBe(123);
  expect(data.nodes[0]).not.toHaveProperty("x");
  expect(data.links[0].source).toBe("a");
  expect(state.fit).not.toHaveBeenCalled();
});

it("waits for canvas dimensions and initialized coordinates before fitting once", () => {
  state.height = 0;
  const { rerender, onOpen } = mount();
  expect(state.props).toBeUndefined();
  state.height = 480;
  rerender(<LibraryConstellation onOpen={onOpen} />);
  const props = state.props;
  const nodes = props?.graphData?.nodes;
  if (!props || !nodes) throw new Error("Graph did not mount");

  expect(props.warmupTicks).toBe(160);
  expect(props.cooldownTicks).toBe(0);
  props.onEngineStop?.();
  expect(state.fit).not.toHaveBeenCalled();

  nodes.forEach((node, index) => {
    node.x = index * 40;
    node.y = 0;
  });
  props.onEngineStop?.();
  props.onEngineStop?.();
  expect(state.fit).toHaveBeenCalledExactlyOnceWith(0, 72);
});

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
