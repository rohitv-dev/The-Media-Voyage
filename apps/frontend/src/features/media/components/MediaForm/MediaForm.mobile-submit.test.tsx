// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNavigation } from "#/features/app-shell/components/MobileBottomNavigation";
import { api } from "#/lib/api";
import { showErrorNotification } from "#/lib/notifications";
import { MediaForm } from "./index";
import { SetMediaFormStatusContext } from "./context";
import type { MediaFormStatus } from "./context";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
// A one-character title keeps these save tests independent of catalog search.
const manualTitle = "M";

vi.mock("@tanstack/react-router", () => ({
  useCanGoBack: () => false,
  useLocation: () => undefined,
  useNavigate: () => navigate,
  useRouter: () => ({ history: { back: vi.fn(), go: vi.fn() } }),
}));
vi.mock("#/hooks/useUnsavedChangesBlocker", () => ({
  useUnsavedChangesBlocker: vi.fn(),
}));
vi.mock("#/features/tutorials/useTutorial", () => ({
  useTutorial: () => ({ start: vi.fn() }),
}));
vi.mock("#/lib/api", () => ({
  api: vi.fn(),
  getApiErrorMessage: (error: Error) => error.message,
}));
vi.mock("#/lib/notifications", () => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn(),
}));
vi.mock("./StatusDetailsSection", () => ({
  StatusDetailsSection: () => null,
}));
vi.mock("./ProgressTrackingSection", () => ({
  ProgressTrackingSection: () => null,
}));
vi.mock("./PersonalNotesSection", () => ({
  PersonalNotesSection: () => null,
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function FormWithNavigation(props: ComponentProps<typeof MediaForm>) {
  const [status, setStatus] = useState<MediaFormStatus | null>(null);
  const pathname =
    props.mode === "add" ? "/media/add" : `/media/update/${props.id}`;

  return (
    <>
      <SetMediaFormStatusContext.Provider value={setStatus}>
        <MediaForm {...props} />
      </SetMediaFormStatusContext.Provider>
      <MobileBottomNavigation
        navbarOpened={false}
        pathname={pathname}
        mediaFormStatus={status}
        onNavigate={navigate}
        onToggleMore={vi.fn()}
      />
    </>
  );
}

function renderForm(
  props: ComponentProps<typeof MediaForm> = {
    mode: "add",
    dropdowns: { sources: [], tags: [] },
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider env="test">
      <QueryClientProvider client={queryClient}>
        <FormWithNavigation {...props} />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

function getBottomAction(name: "Save media" | "Update media") {
  return within(
    screen.getByRole("navigation", { name: "Primary navigation" }),
  ).getByRole<HTMLButtonElement>("button", { name });
}

describe("mobile form submission", () => {
  it("updates the edited entry from the bottom bar", async () => {
    vi.mocked(api).mockResolvedValueOnce({ id: "media-1", title: "Dune" });
    renderForm({
      mode: "update",
      id: "media-1",
      initialValues: { title: "Dune", type: "movie", favorite: false },
      catalogSource: null,
      catalogExternalId: null,
      dropdowns: { sources: [], tags: [] },
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /Mark as Favorite/ }));
    fireEvent.click(getBottomAction("Update media"));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/media" }),
    );
    expect(api).toHaveBeenCalledExactlyOnceWith(
      "/user-media/media-1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"favorite":true'),
      }),
    );
  });

  it("validates an untouched form and brings the title field into view", () => {
    renderForm();

    fireEvent.click(getBottomAction("Save media"));

    const title = screen.getByRole("textbox", { name: "Title" });
    expect(screen.getByText("Title is required")).toBeTruthy();
    expect(document.activeElement).toBe(title);
    expect(title.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    expect(api).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("uses the existing save flow and prevents another save while pending", async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    const saved = new Promise<unknown>((resolve) => {
      resolveSave = resolve;
    });
    vi.mocked(api).mockReturnValueOnce(saved);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: manualTitle },
    });
    const save = getBottomAction("Save media");
    fireEvent.click(save);

    await waitFor(() => expect(save.disabled).toBe(true));
    expect(save.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(save);
    expect(api).toHaveBeenCalledExactlyOnceWith(
      "/user-media",
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => resolveSave?.({ id: "media-1", title: manualTitle }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/media" }),
    );
  });

  it("keeps entered values and enables Save again after a failure", async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error("Could not save"));
    renderForm();
    const title = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Title",
    });
    const save = getBottomAction("Save media");
    fireEvent.change(title, { target: { value: manualTitle } });
    fireEvent.click(save);

    await waitFor(() => {
      expect(showErrorNotification).toHaveBeenCalledOnce();
      expect(save.disabled).toBe(false);
    });
    expect(title.value).toBe(manualTitle);
    expect(navigate).not.toHaveBeenCalled();
  });
});
