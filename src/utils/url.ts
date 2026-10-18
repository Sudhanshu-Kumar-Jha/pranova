import { config } from '../config/env.config.js';

/**
 * Generate fully qualified application URLs using APP_URL from .env
 */
export function appUrl(relativePath: string = ''): string {
  const base = (config.app.url || process.env.APP_URL || 'http://localhost:5000').replace(/\/+$/, '');
  if (!relativePath) return base;
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${cleanPath}`;
}

/**
 * Resolves document, asset, and image URLs:
 * - If fileUrl points to legacy mock placeholder (storage.pranova.health), rewrites to local view endpoint.
 * - If fileUrl is a relative path (/uploads/..., /api/v1/...), prepends APP_URL.
 * - If fileUrl points to a localhost or LAN IP on a previous port, dynamically re-bases to the active APP_URL.
 * - Otherwise leaves valid external URLs (e.g. AWS S3, Cloudinary) intact.
 */
export function resolveFileUrl(fileUrl?: string | null, fallbackPathOrDocId?: string): string {
  if (!fileUrl || !fileUrl.trim()) {
    if (!fallbackPathOrDocId) return '';
    return fallbackPathOrDocId.startsWith('/')
      ? appUrl(fallbackPathOrDocId)
      : appUrl(`/api/v1/documents/${fallbackPathOrDocId}/view`);
  }

  const trimmed = fileUrl.trim();

  // Fictitious mock domain used during initial audit testing: rewrite to active site url
  if (trimmed.includes('storage.pranova.health')) {
    if (fallbackPathOrDocId && !fallbackPathOrDocId.startsWith('/')) {
      return appUrl(`/api/v1/documents/${fallbackPathOrDocId}/view`);
    }
    try {
      const parsed = new URL(trimmed);
      return appUrl(parsed.pathname || '/api/v1/documents');
    } catch {
      return appUrl('/api/v1/documents');
    }
  }

  // Relative path (e.g., /uploads/documents/..., /uploads/medicines/...)
  if (trimmed.startsWith('/')) {
    return appUrl(trimmed);
  }

  // If local host or LAN IP, re-base to current appUrl() so ports/LAN IPs match configured APP_URL
  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        /^192\.168\./.test(parsed.hostname) ||
        /^10\./.test(parsed.hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)) &&
      (parsed.pathname.startsWith('/uploads') || parsed.pathname.startsWith('/api'))
    ) {
      return appUrl(`${parsed.pathname}${parsed.search}`);
    }
  } catch {
    // Treat as relative path fallback
    return appUrl(`/${trimmed}`);
  }

  return trimmed;
}
