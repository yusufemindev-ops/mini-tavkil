import { describe, expect, it } from 'vitest';
import { deduplicateFxRuns, type FxRun } from './currencies-queries';

describe('deduplicateFxRuns', () => {
  it('collapses consecutive runs in the same minute with identical status, source, and rates', () => {
    const runs: FxRun[] = [
      {
        id: '1',
        ranAt: '2026-10-15T00:01:06.100Z',
        status: 'success',
        source: 'frankfurter',
        error: null,
        rates: { TRY: 49.39 },
      },
      {
        id: '2',
        ranAt: '2026-10-15T00:01:06.850Z',
        status: 'success',
        source: 'frankfurter',
        error: null,
        rates: { TRY: 49.39 },
      },
      {
        id: '3',
        ranAt: '2026-10-14T00:01:11.000Z',
        status: 'success',
        source: 'frankfurter',
        error: null,
        rates: { TRY: 49.367 },
      },
    ];

    const deduped = deduplicateFxRuns(runs);
    expect(deduped.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('retains runs in the same minute if status or rate differs', () => {
    const runs: FxRun[] = [
      {
        id: '1',
        ranAt: '2026-10-15T10:00:15.000Z',
        status: 'success',
        source: 'frankfurter',
        error: null,
        rates: { TRY: 49.417 },
      },
      {
        id: '2',
        ranAt: '2026-10-15T10:00:05.000Z',
        status: 'failed',
        source: null,
        error: 'HTTP 502',
        rates: null,
      },
    ];

    const deduped = deduplicateFxRuns(runs);
    expect(deduped).toHaveLength(2);
  });
});
