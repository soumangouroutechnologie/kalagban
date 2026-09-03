/**
 * Safe Image URL Helper for Kalagban Mobile
 * Handles relative paths, empty URLs, local placeholder fallbacks and error boundaries.
 */

export const DEFAULT_PRODUCT_FALLBACK =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

export const DEFAULT_BANNER_FALLBACK =
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80';

export function getSafeImageUrl(url?: string | null, fallback = DEFAULT_PRODUCT_FALLBACK): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  const trimmed = url.trim();

  // If it's a relative path starting with '/', map known assets or fallback
  if (trimmed.startsWith('/')) {
    if (trimmed.includes('cousel1') || trimmed.includes('banner')) {
      return DEFAULT_BANNER_FALLBACK;
    }
    return fallback;
  }

  // If it's a valid remote URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Data URI
  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  return fallback;
}
