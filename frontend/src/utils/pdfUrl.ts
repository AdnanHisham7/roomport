import { API_URL } from '@/store/api/baseApi';

/**
 * Resolves any agreement or document PDF URL so it never mistakenly opens
 * against the frontend domain.
 *
 * - Cloudinary or full external URLs (https://...) are returned as-is.
 * - Relative URLs (/uploads/...) are prepended with the backend origin from VITE_API_URL.
 */
export function resolvePdfUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Strip trailing /api/v1 (or /api/...) from API_URL to obtain the backend base origin
  const backendBase = API_URL.replace(/\/api(\/v\d+)?\/?$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendBase}${path}`;
}
