import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'dark' | 'light';

const ACCENT = '#00E5C8';

/** Max app width — the app renders as a centered phone-width frame, letterboxed on desktop. */
export const PHONE_MAX_WIDTH = 430;

export function buildTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: ACCENT, contrastText: '#04241f' },
      secondary: { main: '#FF4D8D' },
      ...(mode === 'dark'
        ? {
            background: { default: '#0a0a0a', paper: '#141414' },
          }
        : {
            background: { default: '#fafafa', paper: '#ffffff' },
          }),
    },
    typography: {
      fontFamily: '"Space Grotesk", system-ui, -apple-system, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { minHeight: 44 } },
      },
      MuiBottomNavigationAction: {
        // Ensure ≥44px tap targets (SPEC accessibility).
        styleOverrides: { root: { minWidth: 44, minHeight: 56 } },
      },
      // Portaled overlays render at <body>, escaping the phone frame — constrain them
      // to the same width + center so they letterbox too, matching the app frame.
      MuiDrawer: {
        styleOverrides: {
          paperAnchorBottom: {
            maxWidth: PHONE_MAX_WIDTH,
            marginLeft: 'auto',
            marginRight: 'auto',
            left: 0,
            right: 0,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paperFullScreen: {
            maxWidth: PHONE_MAX_WIDTH,
            marginLeft: 'auto',
            marginRight: 'auto',
          },
        },
      },
    },
  });
}
