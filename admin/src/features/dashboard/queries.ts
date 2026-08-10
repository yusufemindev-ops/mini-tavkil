import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api/client';
import type { ActivityItem, DashKpi, PublishStat } from './fixtures';

// The dashboard endpoint returns all three sections in one payload so the page
// can render with a single query/loading state.
export interface DashboardData {
  kpis: DashKpi[];
  publishSummary: PublishStat[];
  activity: ActivityItem[];
}

const EMPTY_DASHBOARD: DashboardData = { kpis: [], publishSummary: [], activity: [] };

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    // The backend `/dashboard` endpoint isn't built yet (deferred to its own
    // ticket). Until it exists, treat 404 as "no metrics yet" so the page shows
    // its empty states instead of surfacing an error on every load.
    queryFn: async () => {
      try {
        return await api.get<DashboardData>('/dashboard');
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return EMPTY_DASHBOARD;
        throw err;
      }
    },
  });
}
