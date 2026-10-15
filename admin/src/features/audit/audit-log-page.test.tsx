import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogPage } from './audit-log-page';
import type { AuditLogListParams, AuditLogPageResult } from './queries';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAuditLogs =
  vi.fn<(params: AuditLogListParams) => { data?: AuditLogPageResult; isLoading: boolean }>();

vi.mock('./queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./queries')>();
  return {
    ...actual,
    useAuditLogs: (params: AuditLogListParams) => mockUseAuditLogs(params),
  };
});

describe('AuditLogPage component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockUseAuditLogs.mockReset();
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the 5 essential columns and audit log rows', () => {
    mockUseAuditLogs.mockReturnValue({
      isLoading: false,
      data: {
        total: 1,
        page: 1,
        pageSize: 25,
        items: [
          {
            id: 'aud-1',
            createdAt: new Date(Date.now() - 120_000).toISOString(),
            actor: {
              id: 'usr-1',
              name: 'Yusuf Demir',
              email: 'yusuf@tavkil.com',
              type: 'user',
            },
            action: 'product.published',
            resourceType: 'product',
            resourceId: 'prod-1',
            target: 'HP-AX100',
            summary: 'Published product "HP-AX100"',
            ipAddress: '203.0.113.10',
          },
        ],
      },
    });

    const root = createRoot(container);
    act(() => {
      root.render(<AuditLogPage />);
    });

    const headers = Array.from(container.querySelectorAll('th')).map((th) => th.textContent);
    expect(headers).toEqual(['Time', 'Actor', 'Action', 'Target', 'Summary']);

    expect(container.textContent).toContain('Yusuf Demir');
    expect(container.textContent).toContain('yusuf@tavkil.com');
    expect(container.textContent).toContain('product.published');
    expect(container.textContent).toContain('HP-AX100');
    expect(container.textContent).toContain('Published product "HP-AX100"');

    act(() => {
      root.unmount();
    });
  });

  it('filters by resource type pill and search query', () => {
    mockUseAuditLogs.mockReturnValue({
      isLoading: false,
      data: { total: 0, page: 1, pageSize: 25, items: [] },
    });

    const root = createRoot(container);
    act(() => {
      root.render(<AuditLogPage />);
    });

    expect(mockUseAuditLogs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 25,
      resourceType: undefined,
      search: undefined,
    });

    const productsBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Products',
    );
    expect(productsBtn).toBeDefined();

    act(() => {
      productsBtn!.click();
    });

    expect(mockUseAuditLogs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 25,
      resourceType: 'product',
      search: undefined,
    });

    expect(container.textContent).toContain('No audit log entries match the current filters.');

    act(() => {
      root.unmount();
    });
  });
});
