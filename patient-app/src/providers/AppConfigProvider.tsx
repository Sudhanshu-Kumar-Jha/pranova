import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAppConfig, FALLBACK_CONFIG, AppConfig } from '../api/config';

interface AppConfigContextValue {
  config: AppConfig;
  /** True while the first fetch is in flight — branding is the fallback. */
  isLoading: boolean;
  /** True when the API could not be reached and defaults are in use. */
  isFallback: boolean;
  refresh: () => void;
}

const AppConfigContext = createContext<AppConfigContextValue>({
  config: FALLBACK_CONFIG,
  isLoading: false,
  isFallback: true,
  refresh: () => {},
});

/**
 * Makes the administrator's branding and storefront rules available to every
 * screen. This is deliberately a public call: it runs before sign-in so the
 * login screen carries the right logo and colour.
 */
export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const query = useQuery({
    queryKey: ['app-config'],
    queryFn: getAppConfig,
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const value: AppConfigContextValue = {
    config: query.data ?? FALLBACK_CONFIG,
    isLoading: query.isLoading,
    isFallback: !query.data,
    refresh: () => void query.refetch(),
  };

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
};

export function useAppConfig(): AppConfigContextValue {
  return useContext(AppConfigContext);
}

/** Shorthand for the common case of only needing the values. */
export function useBrand(): AppConfig {
  return useContext(AppConfigContext).config;
}
