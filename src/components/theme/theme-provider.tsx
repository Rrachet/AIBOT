'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Theme state, shared by the switcher and anything that needs to know which
 * way round the page currently is.
 *
 * `theme` is the *choice* — including "system", which is not a colour. When
 * something needs the colour that is actually on screen, that is `resolved`.
 */

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'aibot-theme';

interface ThemeState {
  theme: Theme;
  /** The colour actually rendering, with "system" already resolved. */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Private windows and blocked site data throw here. Fall through.
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at the server-rendered assumption. The inline ThemeScript has
  // already put the right attribute on <html>, so the first paint is correct
  // whatever this says; the effect below reconciles the React state to it.
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setThemeState(readStored());
    setSystemDark(systemPrefersDark());

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this page; it just will not be remembered.
    }
    const root = document.documentElement;
    // "system" removes the attribute rather than setting one, so the CSS
    // preference query takes over again.
    if (next === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      resolved: theme === 'system' ? (systemDark ? 'dark' : 'light') : theme,
      setTheme,
    }),
    [theme, systemDark, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Safe outside a provider: returns a fixed light reading and a no-op setter
 * rather than throwing, so a component can be dropped anywhere.
 */
export function useTheme(): ThemeState {
  return (
    useContext(ThemeContext) ?? {
      theme: 'system',
      resolved: 'light',
      setTheme: () => {},
    }
  );
}
