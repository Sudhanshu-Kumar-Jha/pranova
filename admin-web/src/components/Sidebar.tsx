import React, { useEffect, useRef } from 'react';
import { useSidebarState } from 'react-admin';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  useMediaQuery,
  Theme,
} from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import clsx from 'clsx';
import { useBranding } from '../branding.js';
import { BrandMark } from '../ui/BrandMark.js';
import { color } from '../design/tokens.js';
import { APPBAR_HEIGHT } from '../theme.js';

const PREFIX = 'RaSidebar';
export const SidebarClasses = {
  docked: `${PREFIX}-docked`,
  paper: `${PREFIX}-paper`,
  modal: `${PREFIX}-modal`,
  fixed: `${PREFIX}-fixed`,
};

const OPEN_CLASS = `${PREFIX}-open`;
const CLOSED_CLASS = `${PREFIX}-closed`;
const SIDEBAR_WIDTH = 252;
const SIDEBAR_CLOSED_WIDTH = 64;

export interface CustomSidebarProps {
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * Mobile-first responsive sidebar:
 * - On phones & tablets (< 900px, down('md')): temporary modal drawer with full-height touch scrolling,
 *   a clean header with PRANOVA logo and close button, and independent smooth scrolling (never trapped or stuck).
 * - On desktop (>= 900px): permanent collapsible sidebar with smooth transition and self-contained scrolling.
 */
export const CustomSidebar: React.FC<CustomSidebarProps> = ({ children, ...rest }) => {
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const [open, setOpen] = useSidebarState();
  const { branding } = useBranding();
  const initialMountRef = useRef(false);

  // When opening on mobile, start with the drawer closed so it doesn't cover the screen on first load
  useEffect(() => {
    if (!initialMountRef.current) {
      initialMountRef.current = true;
      if (isMobile && open) {
        setOpen(false);
      }
    }
  }, [isMobile, open, setOpen]);

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={Boolean(open)}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true, // Keep mounted for smooth and instant mobile touch responsiveness
        }}
        PaperProps={{
          elevation: 16,
          sx: {
            width: { xs: 280, sm: 320 },
            maxWidth: '85vw',
            height: '100dvh',
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            color: 'text.primary',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            zIndex: 1400,
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${color.line}`,
          },
        }}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 10,
        }}
        {...rest}
      >
        {/* Mobile Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            minHeight: { xs: 56, sm: 60 },
            borderBottom: `1px solid ${color.line}`,
            flexShrink: 0,
            bgcolor: 'background.paper',
          }}
        >
          <Box
            component="a"
            href="#/dashboard"
            onClick={() => setOpen(false)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {branding.app_logo ? (
              <Box component="img" src={branding.app_logo} alt="" sx={{ height: 26, maxWidth: 120, objectFit: 'contain' }} />
            ) : (
              <BrandMark size={26} />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
              {branding.app_name}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            sx={{ color: 'text.secondary', p: 0.75 }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Scrollable menu content - supports scrolling both up and down smoothly */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            pb: 'max(env(safe-area-inset-bottom, 24px), 32px)',
            scrollbarWidth: 'thin',
            scrollbarColor: `${color.subtle} transparent`,
            '&::-webkit-scrollbar': {
              display: 'block',
              width: 5,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: color.line,
              borderRadius: 4,
            },
          }}
        >
          {children}
        </Box>
      </Drawer>
    );
  }

  // Desktop permanent docked drawer
  return (
    <Drawer
      variant="permanent"
      open={Boolean(open)}
      onClose={() => setOpen(!open)}
      className={clsx(PREFIX, open ? OPEN_CLASS : CLOSED_CLASS)}
      PaperProps={{
        sx: {
          width: open ? SIDEBAR_WIDTH : SIDEBAR_CLOSED_WIDTH,
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          borderRight: `1px solid ${color.line}`,
          bgcolor: 'background.paper',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 'inherit',
        },
      }}
      sx={{
        width: open ? SIDEBAR_WIDTH : SIDEBAR_CLOSED_WIDTH,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        '& .RaSidebar-paper': {
          width: open ? SIDEBAR_WIDTH : SIDEBAR_CLOSED_WIDTH,
        },
      }}
      {...rest}
    >
      <Box
        className={SidebarClasses.fixed}
        sx={{
          position: 'fixed',
          top: `${APPBAR_HEIGHT}px`,
          width: open ? SIDEBAR_WIDTH : SIDEBAR_CLOSED_WIDTH,
          height: `calc(100vh - ${APPBAR_HEIGHT}px)`,
          maxHeight: `calc(100dvh - ${APPBAR_HEIGHT}px)`,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          bgcolor: 'background.paper',
          borderRight: `1px solid ${color.line}`,
          boxSizing: 'border-box',
          pb: 4,
          scrollbarWidth: 'thin',
          scrollbarColor: `${color.subtle} transparent`,
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          '&::-webkit-scrollbar': {
            display: 'block',
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: color.line,
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: color.subtle,
          },
        }}
      >
        {children}
      </Box>
    </Drawer>
  );
};

export default CustomSidebar;
