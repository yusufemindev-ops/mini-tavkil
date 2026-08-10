// Resolves the "View on Google Maps" target for a supplier's internal address.
// Prefers an explicit Google Maps share link; otherwise falls back to a Maps
// search over the free-text address. Returns '' when neither is usable, which
// callers treat as "disable the button".
export function resolveMapsHref(mapUrl: string, address: string): string {
  const trimmedMapUrl = mapUrl.trim();
  if (trimmedMapUrl) return trimmedMapUrl;

  const trimmedAddress = address.trim();
  if (trimmedAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedAddress)}`;
  }

  return '';
}
