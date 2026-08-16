import { MantineProvider } from "@mantine/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { buildMantineTheme, DEFAULT_THEME, neuVars, THEMES } from "./themes";
import type { ThemeId } from "./themes";

const STORAGE_KEY = "media-voyage-theme";

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Read the saved theme once, synchronously, so the first paint is correct. */
function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved && saved in THEMES ? (saved as ThemeId) : DEFAULT_THEME;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(readInitialTheme);
  const def = THEMES[themeId];

  const mantineTheme = useMemo(() => buildMantineTheme(def), [def]);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode / storage disabled — theme just won't persist.
    }
  }, []);

  // Keep the raw page background in sync with the active theme so there's no
  // mismatch behind the app shell (and no flash on route transitions).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-bg", def.bg);
    root.style.colorScheme = def.scheme;

    // Neumorphic themes swap borders for soft extruded shadows. The whole
    // treatment lives in neumorphic.scss, gated on this one attribute — so
    // removing it is all that's needed to switch the treatment off. The custom
    // properties are cleared anyway rather than left as residue on <html>.
    const neu = neuVars(def);
    if (def.neu) {
      root.dataset.neu = "";
      for (const [name, value] of Object.entries(neu)) {
        root.style.setProperty(name, value);
      }
    } else {
      delete root.dataset.neu;
      for (const name of Object.keys(neu)) {
        root.style.removeProperty(name);
      }
    }
  }, [def]);

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId, setThemeId]);

  return (
    <ThemeContext.Provider value={value}>
      <MantineProvider forceColorScheme={def.scheme} theme={mantineTheme}>
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return ctx;
}
