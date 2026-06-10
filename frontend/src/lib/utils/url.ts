/**
 * Extract clean, lowercase hostnames from URLs.
 * Strips 'www.' prefixes and handles invalid URL strings gracefully.
 */
export function extractDomain(url: string, fallback: string = ''): string {
  if (!url) return fallback;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    // If it's already a relative path or domain string without protocol, clean it directly
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return fallback;
  }
}
