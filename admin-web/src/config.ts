/**
 * Central runtime config for the Admin Web client.
 *
 * Values dynamically resolve using the browser's current window.location.hostname
 * so that both `localhost:5173` and network IP `192.168.1.46:5173` communicate
 * directly with the backend on port 5000 without network errors or CORS blocks.
 */
const getHostUrl = (port: number, path: string = ''): string => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const currentPort = window.location.port;

    // In local development (Vite dev server on 5173/5174/etc.), communicate with backend on port 5000
    if (currentPort === '5173' || currentPort === '5174' || currentPort === '3000') {
      return `${protocol}//${hostname}:${port}${path}`;
    }

    // In production / cloud deployment (e.g. Railway), communicate on the active origin
    return `${window.location.origin}${path}`;
  }
  return `http://localhost:${port}${path}`;
};

export const API_URL: string =
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : getHostUrl(5000, '/api/v1');

export const SOCKET_URL: string =
  import.meta.env.VITE_SOCKET_URL
    ? import.meta.env.VITE_SOCKET_URL
    : getHostUrl(5000);

