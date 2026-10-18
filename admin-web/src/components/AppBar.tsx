import React, { useEffect, useState } from 'react';
import { useSidebarState, UserMenu, Logout, TitlePortal } from 'react-admin';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { Box, Typography, Tooltip, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useBranding } from '../branding.js';
import { apiClient } from '../providers/dataProvider.js';
import { color } from '../design/tokens.js';
import { BrandMark } from '../ui/BrandMark.js';

type Conn = 'checking' | 'online' | 'offline';

/** Polls the real health endpoint so the indicator reflects actual API state. */
function useApiStatus(intervalMs = 30000): Conn {
  const [state, setState] = useState<Conn>('checking');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        await apiClient.get('/health', { timeout: 5000 });
        if (alive) setState('online');
      } catch {
        if (alive) setState('offline');
      }
    };
    check();
    const id = window.setInterval(check, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return state;
}

const ConnectionStatus: React.FC = () => {
  const state = useApiStatus();
  const meta = {
    checking: { dot: color.subtle, label: 'Connecting', tip: 'Checking connection to the PRANOVA API' },
    online: { dot: color.success, label: 'Live', tip: 'Connected to the PRANOVA API' },
    offline: { dot: color.error, label: 'Offline', tip: 'Cannot reach the PRANOVA API. Data may be out of date.' },
  }[state];

  return (
    <Tooltip title={meta.tip}>
      <Box
        role="status"
        aria-live="polite"
        aria-label={meta.tip}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.875,
          px: { xs: 0.75, sm: 1.25 },
          height: 30,
          borderRadius: '999px',
          border: `1px solid ${color.line}`,
          color: state === 'offline' ? color.error : color.muted,
          fontSize: '0.78rem',
          fontWeight: 600,
        }}
      >
        <Box
          component="span"
          aria-hidden
          sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: meta.dot, boxShadow: state === 'online' ? `0 0 0 3px ${color.successSoft}` : 'none' }}
        />
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{meta.label}</Box>
      </Box>
    </Tooltip>
  );
};

export const CustomAppBar: React.FC = () => {
  const [open, setOpen] = useSidebarState();
  const { branding } = useBranding();

  return (
    <MuiAppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        top: 0,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: `1px solid ${color.line}`,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 60 }, px: { xs: 1, sm: 2 }, gap: { xs: 0.5, sm: 1.5 } }}>
        <Tooltip title={open ? 'Collapse navigation' : 'Expand navigation'}>
          <IconButton
            aria-label={open ? 'Collapse navigation' : 'Expand navigation'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            sx={{ color: 'text.secondary' }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        <Box
          component="a"
          href="#/dashboard"
          aria-label={`${branding.app_name} dashboard`}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', color: 'inherit', flexShrink: 0, borderRadius: '6px' }}
        >
          {branding.app_logo ? (
            <Box component="img" src={branding.app_logo} alt="" sx={{ height: 28, maxWidth: 140, objectFit: 'contain' }} />
          ) : (
            <BrandMark size={28} />
          )}
          <Typography
            component="span"
            sx={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', display: { xs: 'none', md: 'inline' } }}
          >
            {branding.app_name}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 2, display: { xs: 'none', md: 'block' } }} />

        {/* React-Admin portals the current page title here. */}
        <Box sx={{ flex: 1, minWidth: 0, '& #react-admin-title': { fontSize: { xs: '0.95rem', sm: '1rem' }, fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}>
          <TitlePortal variant="h6" />
        </Box>

        <ConnectionStatus />

        <Tooltip title="Settings">
          <IconButton aria-label="Settings" href="#/settings" sx={{ color: 'text.secondary' }}>
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>

        <UserMenu icon={<AccountCircleOutlinedIcon />}>
          <Logout icon={<LogoutOutlinedIcon />} />
        </UserMenu>
      </Toolbar>
    </MuiAppBar>
  );
};

export default CustomAppBar;
