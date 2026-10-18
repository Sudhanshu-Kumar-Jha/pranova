import { defaultTheme, RaThemeOptions } from 'react-admin';
import { deepmerge } from '@mui/utils';
import { color, darkColor, radius, elevation, font, motion } from './design/tokens.js';

type Palette = {
  ink: string; inkSoft: string; muted: string; subtle: string; canvas: string; surface: string;
  surfaceSunken: string; line: string; lineSoft: string; primary: string; primaryHover: string;
  primaryPressed: string; primarySoft: string; primaryLine: string;
};

const SIDEBAR_WIDTH = 252;
const SIDEBAR_CLOSED_WIDTH = 64;

/**
 * Height of the sticky AppBar, including its 1px bottom border. The fixed
 * sidebar is anchored below this, so the two must stay in step — these are the
 * `Toolbar` minHeights set in `components/AppBar.tsx`.
 */
export const APPBAR_HEIGHT = 61; // 60 toolbar + 1px border (sm and up)
export const APPBAR_HEIGHT_XS = 57; // 56 toolbar + 1px border (phones)

function buildTheme(mode: 'light' | 'dark'): RaThemeOptions {
  const c: Palette = mode === 'light' ? color : darkColor;

  const focusRing = {
    outline: 'none',
    boxShadow: mode === 'light' ? elevation.focus : '0 0 0 3px rgba(79,179,174,0.35)',
  };

  const theme: RaThemeOptions = {
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1440,
      },
    },
    palette: {
      mode,
      primary: { main: c.primary, dark: c.primaryPressed, light: c.primaryHover, contrastText: '#FFFFFF' },
      secondary: { main: color.info, contrastText: '#FFFFFF' },
      success: { main: color.success, light: color.successSoft },
      warning: { main: color.warning, light: color.warningSoft },
      error: { main: color.error, light: color.errorSoft },
      info: { main: color.info, light: color.infoSoft },
      background: { default: c.canvas, paper: c.surface },
      text: { primary: c.ink, secondary: c.muted, disabled: c.subtle },
      divider: c.line,
      action: { hover: mode === 'light' ? 'rgba(19,33,47,0.04)' : 'rgba(231,238,241,0.05)', selected: c.primarySoft },
    },
    shape: { borderRadius: radius.control },
    typography: {
      fontFamily: font.family,
      fontSize: 14,
      h4: { fontSize: '1.625rem', lineHeight: 1.25, fontWeight: 600, letterSpacing: '-0.015em' },
      h5: { fontSize: '1.3rem', lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontSize: '1.0625rem', lineHeight: 1.4, fontWeight: 600, letterSpacing: '-0.005em' },
      subtitle1: { fontSize: '0.9375rem', lineHeight: 1.45, fontWeight: 600 },
      subtitle2: { fontSize: '0.8438rem', lineHeight: 1.45, fontWeight: 600 },
      body1: { fontSize: '0.9063rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8438rem', lineHeight: 1.5 },
      caption: { fontSize: '0.7813rem', lineHeight: 1.4, color: c.muted },
      overline: { fontSize: '0.7813rem', lineHeight: 1.4, fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    },
    sidebar: { width: SIDEBAR_WIDTH, closedWidth: SIDEBAR_CLOSED_WIDTH },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: c.canvas, color: c.ink },
        },
      },

      /* ---------------- Surfaces ---------------- */
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: c.line },
          rounded: { borderRadius: radius.panel },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${c.line}`, borderRadius: radius.panel } },
      },
      MuiMenu: {
        styleOverrides: { paper: { border: `1px solid ${c.line}`, boxShadow: elevation.menu, borderRadius: radius.panel } },
      },
      MuiPopover: {
        styleOverrides: { paper: { border: `1px solid ${c.line}`, boxShadow: elevation.menu, borderRadius: radius.panel } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: radius.dialog, boxShadow: elevation.overlay, border: `1px solid ${c.line}` },
        },
      },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.0625rem', fontWeight: 600, padding: '20px 24px 8px' } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 16px' } } },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } },
      },

      /* ---------------- Controls ---------------- */
      MuiButtonBase: { defaultProps: { disableRipple: false } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radius.control,
            fontWeight: 600,
            paddingInline: 14,
            transition: `background-color ${motion.fast} ${motion.ease}, border-color ${motion.fast} ${motion.ease}, transform ${motion.fast} ${motion.ease}`,
            '&:active': { transform: 'translateY(0.5px)' },
            '&.Mui-focusVisible': focusRing,
          },
          containedPrimary: { '&:hover': { backgroundColor: c.primaryHover } },
          outlined: { borderColor: c.line, color: c.inkSoft, '&:hover': { borderColor: c.subtle, backgroundColor: 'transparent' } },
          outlinedPrimary: { borderColor: c.primaryLine, color: c.primary, '&:hover': { borderColor: c.primary, backgroundColor: c.primarySoft } },
          sizeSmall: { paddingInline: 10, fontSize: '0.8125rem' },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: radius.control, '&.Mui-focusVisible': focusRing },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius.control,
            backgroundColor: c.surface,
            transition: `box-shadow ${motion.fast} ${motion.ease}`,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.line },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.subtle },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.primary, borderWidth: 1 },
            '&.Mui-focused': { boxShadow: focusRing.boxShadow },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: color.error },
          },
          input: { paddingTop: 9, paddingBottom: 9 },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: c.muted, '&.Mui-focused': { color: c.primary } },
          asterisk: { color: color.error },
        },
      },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, fontSize: '0.75rem' } } },
      MuiSwitch: {
        styleOverrides: {
          switchBase: { '&.Mui-checked + .MuiSwitch-track': { opacity: 1 } },
          track: { opacity: 0.35 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: radius.control, fontWeight: 600, height: 24, fontSize: '0.75rem' },
          label: { paddingInline: 8 },
          outlined: { borderColor: c.line, color: c.inkSoft },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: { backgroundColor: color.ink, fontSize: '0.75rem', fontWeight: 500, borderRadius: radius.control, padding: '6px 10px' },
          arrow: { color: color.ink },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: radius.panel, alignItems: 'flex-start' },
          standardInfo: { backgroundColor: color.infoSoft, color: color.info },
          standardSuccess: { backgroundColor: color.successSoft, color: color.success },
          standardWarning: { backgroundColor: color.warningSoft, color: color.warning },
          standardError: { backgroundColor: color.errorSoft, color: color.error },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: { backgroundColor: color.ink, borderRadius: radius.panel, fontWeight: 500, boxShadow: elevation.overlay },
        },
      },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: radius.pill, height: 6 } } },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.875rem' } } },
      MuiDivider: { styleOverrides: { root: { borderColor: c.lineSoft } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },

      /* ---------------- Tables ---------------- */
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${c.lineSoft}`,
            padding: '12px 16px',
            fontVariantNumeric: 'tabular-nums',
          },
          head: {
            backgroundColor: c.surfaceSunken,
            color: c.muted,
            fontWeight: 600,
            fontSize: '0.8125rem',
            whiteSpace: 'nowrap',
            borderBottom: `1px solid ${c.line}`,
          },
          sizeSmall: { padding: '10px 16px' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: `background-color ${motion.fast} ${motion.ease}`,
            '&:last-child td': { borderBottom: 0 },
          },
          hover: { '&:hover': { backgroundColor: mode === 'light' ? '#F6F9F9' : 'rgba(231,238,241,0.03)' } },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { borderTop: `1px solid ${c.lineSoft}` },
          selectLabel: { fontSize: '0.8125rem', color: c.muted },
          displayedRows: { fontSize: '0.8125rem', color: c.muted, fontVariantNumeric: 'tabular-nums' },
        },
      },

      /* ---------------- React-Admin ---------------- */
      RaLayout: {
        styleOverrides: {
          root: {
            backgroundColor: c.canvas,
            // Our AppBar is sticky (in flow), so drop RA's spacer for a fixed bar.
            '& .RaLayout-appFrame': { marginTop: 0 },
            '& .RaLayout-content': {
              backgroundColor: c.canvas,
              padding: '20px 24px 80px',
              minWidth: 0,
            },
            '@media (min-width: 1440px)': {
              '& .RaLayout-content': { padding: '24px 32px 80px' },
            },
            '@media (max-width: 899.95px)': {
              '& .RaLayout-content': { padding: '16px 14px 60px' },
            },
          },
        },
      },
      RaSidebar: {
        styleOverrides: {
          root: {
            // React-Admin anchors this at ~0.8em from the viewport top, which
            // assumes its own fixed AppBar. Ours is sticky and in flow, so
            // without this the first menu items sit behind the header with no
            // way to scroll them back into view.
            '& .RaSidebar-fixed': {
              top: `${APPBAR_HEIGHT}px`,
              height: `calc(100vh - ${APPBAR_HEIGHT}px)`,
              // eslint-disable-next-line
              maxHeight: `calc(100dvh - ${APPBAR_HEIGHT}px)`,
              backgroundColor: c.surface,
              borderRight: `1px solid ${c.line}`,
              paddingBottom: 80,
              overflowY: 'auto',
              overflowX: 'hidden',
              // Keep navigation scroll self-contained so wheeling over nav does not drag details screen
              overscrollBehavior: 'contain',
              // Restore elegant, visible scrollbar that React-Admin hides by default
              scrollbarWidth: 'thin',
              scrollbarColor: `${c.subtle} transparent`,
              '&::-webkit-scrollbar': {
                display: 'block',
                width: 6,
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: c.line,
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: c.subtle,
              },
            },
            '@media (max-width: 599.95px)': {
              '& .RaSidebar-fixed': {
                top: `${APPBAR_HEIGHT_XS}px`,
                height: `calc(100vh - ${APPBAR_HEIGHT_XS}px)`,
                maxHeight: `calc(100dvh - ${APPBAR_HEIGHT_XS}px)`,
                paddingBottom: 80,
              },
            },
            '& .MuiDrawer-paper': {
              backgroundColor: c.surface,
              overflow: 'hidden',
            },
          },
        },
      },
      RaMenu: {
        styleOverrides: {
          root: { marginTop: 8, '&.RaMenu-open': { width: SIDEBAR_WIDTH }, '&.RaMenu-closed': { width: SIDEBAR_CLOSED_WIDTH } },
        },
      },
      RaMenuItemLink: {
        styleOverrides: {
          root: {
            margin: '1px 10px',
            padding: '7px 10px',
            borderRadius: radius.control,
            color: c.inkSoft,
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: `background-color ${motion.fast} ${motion.ease}, color ${motion.fast} ${motion.ease}`,
            '& .RaMenuItemLink-icon': { minWidth: 32, color: c.subtle },
            '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
            '&:hover': { backgroundColor: mode === 'light' ? '#F1F5F6' : 'rgba(231,238,241,0.05)', color: c.ink },
            '&:hover .RaMenuItemLink-icon': { color: c.inkSoft },
            '&.RaMenuItemLink-active': {
              backgroundColor: c.primarySoft,
              color: c.primary,
              fontWeight: 600,
              '& .RaMenuItemLink-icon': { color: c.primary },
            },
            '&.Mui-focusVisible': focusRing,
          },
        },
      },
      RaList: {
        styleOverrides: {
          root: {
            '& .RaList-main': { gap: 0 },
            '& .RaList-content': {
              border: `1px solid ${c.line}`,
              borderRadius: radius.panel,
              overflow: 'hidden',
              backgroundColor: c.surface,
            },
          },
        },
      },
      RaListToolbar: {
        styleOverrides: { root: { alignItems: 'center', paddingBottom: 12, minHeight: 56 } },
      },
      RaTopToolbar: {
        styleOverrides: { root: { gap: 8, paddingTop: 0, paddingBottom: 0, minHeight: 0, alignItems: 'center' } },
      },
      RaDatagrid: {
        styleOverrides: {
          root: {
            '& .RaDatagrid-headerCell': { backgroundColor: c.surfaceSunken },
            '& .RaDatagrid-rowCell': { verticalAlign: 'middle' },
            '& .RaDatagrid-clickableRow': { cursor: 'pointer' },
          },
        },
      },
      RaToolbar: {
        styleOverrides: {
          root: {
            // Keep form actions reachable on long forms.
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.94)' : 'rgba(19,31,41,0.94)',
            backdropFilter: 'blur(6px)',
            borderTop: `1px solid ${c.line}`,
            padding: '12px 24px',
            gap: 8,
            minHeight: 0,
          },
        },
      },
      RaSimpleShowLayout: {
        styleOverrides: { root: { padding: '20px 24px', gap: 4 } },
      },
      RaLabeled: {
        styleOverrides: {
          root: {
            '& .RaLabeled-label': { fontSize: '0.78rem', fontWeight: 500, color: c.muted, marginBottom: 2 },
          },
        },
      },
      RaCreate: { styleOverrides: { root: { '& .RaCreate-card': { overflow: 'visible' } } } },
      RaEdit: { styleOverrides: { root: { '& .RaEdit-card': { overflow: 'visible' } } } },
      RaShow: { styleOverrides: { root: { '& .RaShow-card': { overflow: 'visible' } } } },
    },
  } as RaThemeOptions;

  return deepmerge(defaultTheme, theme) as RaThemeOptions;
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
