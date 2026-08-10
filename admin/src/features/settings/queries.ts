import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// Mirrors the backend GeneralSettings (admin view). The IndexNow key is NOT here
// — it's developer-controlled via the INDEXNOW_API_KEY env var, not admin-managed.
export interface GeneralSettings {
  siteName: string;
  logoUrl: string;
  ogImageUrl: string;
  whatsappNumber: string;
  contactEmail: string;
  address: string;
  mapsEmbedUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
}

export const settingsKeys = { all: ['settings'] as const };

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => api.get<GeneralSettings>('/admin/settings'),
  });
}

// PATCH accepts any subset; the backend merges it over the stored blob.
export function updateSettings(payload: Partial<GeneralSettings>): Promise<GeneralSettings> {
  return api.patch<GeneralSettings>('/admin/settings', payload);
}
