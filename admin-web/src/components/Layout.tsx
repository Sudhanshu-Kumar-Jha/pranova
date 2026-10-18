import React from 'react';
import { Layout, LayoutProps } from 'react-admin';
import { CustomAppBar } from './AppBar.js';
import { CustomSidebar } from './Sidebar.js';
import { CustomMenu } from './Menu.js';
import { CustomError } from './CustomError.js';
import { EmergencyAlertListener } from './EmergencyAlertListener.js';

export const CustomLayout: React.FC<LayoutProps> = (props) => {
  return (
    <>
      <Layout
        {...props}
        appBar={CustomAppBar}
        sidebar={CustomSidebar}
        menu={CustomMenu}
        error={CustomError}
      />
      <EmergencyAlertListener />
    </>
  );
};

export default CustomLayout;
