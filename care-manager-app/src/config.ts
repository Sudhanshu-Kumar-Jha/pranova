import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://pranova-production.up.railway.app/api/v1';
const PRODUCTION_SOCKET_URL = 'https://pranova-production.up.railway.app';

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const extraUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (extraUrl) return extraUrl;

  return PRODUCTION_API_URL;
}

function resolveSocketUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;

  const extraUrl = Constants.expoConfig?.extra?.socketUrl as string | undefined;
  if (extraUrl) return extraUrl;

  return PRODUCTION_SOCKET_URL;
}

export const API_URL: string = resolveApiUrl();
export const SOCKET_URL: string = resolveSocketUrl();
