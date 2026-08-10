import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ── Types (mirror the backend currencies module: AdminCurrency) ──────────────
// All prices are stored in the base currency (USD); other currencies are a
// display-only conversion driven by `rateToUsd`.

export interface AdminCurrency {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isBase: boolean;
  rateToUsd: number | null;
  rateSource: string | null;
  rateFetchedAt: string | null;
}

// Query keys for the currencies resource. Centralized so the list cache can be
// invalidated after a toggle mutation.
export const currenciesKeys = {
  all: ['currencies'] as const,
};

// ── Reads ─────────────────────────────────────────────────────────────────

export function useCurrencies() {
  return useQuery({
    queryKey: currenciesKeys.all,
    queryFn: () => api.get<AdminCurrency[]>('/admin/currencies'),
    staleTime: 0,
  });
}

// ── Mutations (plain fn; the page wraps it in useMutation) ───────────────────
// The base currency (USD) can't be disabled — the backend rejects that with a 400.

export function toggleCurrency(code: string, isActive: boolean): Promise<AdminCurrency> {
  return api.patch<AdminCurrency>(`/admin/currencies/${code}`, { isActive });
}

// ── FX refresh worker monitoring ─────────────────────────────────────────────
// The worker fetches the floating rate (TRY) daily; this log surfaces each run so
// silent failures are visible. `refreshFx` triggers a run on demand.

export interface FxRun {
  id: string;
  ranAt: string;
  status: 'success' | 'failed';
  source: string | null;
  error: string | null;
  rates: Record<string, number> | null;
}

export const fxKeys = {
  runs: ['fx', 'runs'] as const,
};

export function useFxRuns() {
  return useQuery({
    queryKey: fxKeys.runs,
    queryFn: () => api.get<FxRun[]>('/admin/fx/runs'),
    staleTime: 0,
  });
}

export function refreshFx(): Promise<FxRun> {
  return api.post<FxRun>('/admin/fx/refresh');
}
