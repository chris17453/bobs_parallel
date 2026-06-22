import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme, type ThemeMode } from '../theme';

const STORAGE_KEY = 'parallel.theme';

interface ColorModeValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeValue | undefined>(undefined);

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore
  }
  return 'dark'; // dark is the default (SPEC)
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStored);

  const value = useMemo<ColorModeValue>(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            // ignore
          }
          return next;
        }),
    }),
    [mode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}
