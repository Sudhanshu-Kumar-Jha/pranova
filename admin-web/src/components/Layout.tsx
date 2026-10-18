import React, { useEffect } from 'react';
import { Layout, LayoutProps, useSidebarState } from 'react-admin';
import { useMediaQuery, Theme } from '@mui/material';
import { CustomAppBar } from './AppBar.js';
import { CustomMenu } from './Menu.js';
import { CustomError } from './CustomError.js';
import { EmergencyAlertListener } from './EmergencyAlertListener.js';

/**
 * React-Admin defaults the sidebar to open and only closes it after a menu
 * click. On phones the sidebar is a modal drawer, so that default would cover
 * the page on first load. Start it closed whenever the viewport is phone-sized.
 */
const ClosedDrawerOnPhones: React.FC = () => {
  const isPhone = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  const [open, setOpen] = useSidebarState();
  useEffect(() => {
    if (isPhone && open) setOpen(false);
    // Only react to the viewport changing, not to the user opening the drawer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhone]);
  return null;
};

export const CustomLayout: React.FC<LayoutProps> = (props) => {
  return (
    <>
      <ClosedDrawerOnPhones />
      <Layout {...props} appBar={CustomAppBar} menu={CustomMenu} error={CustomError} />
      <EmergencyAlertListener />
    </>
  );
};
