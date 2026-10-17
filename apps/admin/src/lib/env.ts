// Build-time admin API configuration (defaults to same-origin / Vite proxy when VITE_API_URL is unset).
const apiOrigin = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

export const env = {
  apiBaseUrl: `${apiOrigin}/api`,
  authUrl: apiOrigin,
};
