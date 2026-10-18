import React from 'react';
import { Menu, useSidebarState } from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { color } from '../design/tokens.js';

/** Group heading; collapses to a hairline when the sidebar is closed. */
const Section: React.FC<{ label: string }> = ({ label }) => {
  const [open] = useSidebarState();
  if (!open) return <Divider sx={{ my: 1, mx: 1.5 }} />;
  return (
    <Box sx={{ px: 2.75, pt: 2, pb: 0.5 }}>
      <Typography
        component="div"
        sx={{ fontSize: '0.75rem', fontWeight: 600, color: color.subtle, letterSpacing: '0.01em' }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export const CustomMenu: React.FC = () => {
  return (
    <Menu aria-label="Main navigation" sx={{ pb: 4 }}>
      <Menu.Item to="/dashboard" primaryText="Dashboard" leftIcon={<SpaceDashboardOutlinedIcon />} />

      <Section label="Care delivery" />
      <Menu.ResourceItem name="appointments" />
      <Menu.ResourceItem name="doctors" />
      <Menu.ResourceItem name="specialties" />

      <Section label="Pharmacy" />
      <Menu.ResourceItem name="orders" />
      <Menu.ResourceItem name="medicines" />

      <Section label="Diagnostics" />
      <Menu.ResourceItem name="lab-bookings" />
      <Menu.ResourceItem name="diagnostic-tests" />

      <Section label="Coordination" />
      <Menu.ResourceItem name="cases" />
      <Menu.ResourceItem name="patients" />
      <Menu.ResourceItem name="documents" />
      <Menu.ResourceItem name="care-managers" />
      <Menu.ResourceItem name="providers" />

      <Section label="Administration" />
      <Menu.ResourceItem name="admins" />
      <Menu.Item to="/settings" primaryText="Settings" leftIcon={<SettingsOutlinedIcon />} />

      {/* Clean bottom clearance spacer so all links can be scrolled comfortably above viewport bottom */}
      <Box sx={{ height: 80, flexShrink: 0 }} aria-hidden="true" />
    </Menu>
  );
};
