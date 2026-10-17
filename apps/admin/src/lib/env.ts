function resolveApiOrigin(): string {
  const configured = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(
    /\/$/,
    '',
  );
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'admin-dev.tavkil.com') return 'https://api-dev.tavkil.com';
    if (host === 'admin.tavkil.com') return 'https://api.tavkil.com';
  }
  return '';
}

const apiOrigin = resolveApiOrigin();

export const env = {
  apiBaseUrl: `${apiOrigin}/api`,
  authUrl: apiOrigin || undefined,
};
