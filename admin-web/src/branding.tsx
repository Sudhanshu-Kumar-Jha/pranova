import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from './providers/dataProvider.js';

export interface Branding {
  app_name: string;
  app_tagline: string;
  app_logo: string;
  app_favicon: string;
  primary_color: string;
  support_email: string;
  [key: string]: string;
}

const DEFAULTS: Branding = {
  app_name: 'PRANOVA',
  app_tagline: 'Operations console',
  app_logo: '',
  app_favicon: '',
  primary_color: '#0B6E6E',
  support_email: '',
};

const BrandingCtx = createContext<{ branding: Branding; refresh: () => Promise<void> }>({
  branding: DEFAULTS,
  refresh: async () => {},
});

export const useBranding = () => useContext(BrandingCtx);

function applyFavicon(href: string) {
  try {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (href) link.href = href;
  } catch {
    /* ignore */
  }
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get('/settings');
      const data = (res.data?.data || {}) as Partial<Branding>;
      const merged = { ...DEFAULTS, ...data } as Branding;
      setBranding(merged);
      if (merged.app_favicon) applyFavicon(merged.app_favicon);
      document.title = `${merged.app_name} — ${merged.app_tagline || 'Console'}`;
    } catch {
      /* keep defaults; settings is a public endpoint but may be briefly unavailable */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <BrandingCtx.Provider value={{ branding, refresh }}>{children}</BrandingCtx.Provider>;
};
