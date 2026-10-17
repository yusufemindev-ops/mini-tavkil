import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './protected-route';
import { RequirePermission } from './require-permission';
import { NotFoundPage } from './not-found-page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface MockSession {
  data?: {
    id: string;
    email: string;
    name: string;
    permissions: string[];
  };
  isLoading: boolean;
  isError: boolean;
}

const mockUseSession = vi.fn<() => MockSession>();

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => mockUseSession(),
}));

function LocationDisplay({ label }: { label: string }) {
  const location = useLocation();
  return (
    <div data-testid="page">
      {label} ({location.pathname})
    </div>
  );
}

describe('Admin Router Guards & Global 404', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockUseSession.mockReset();
  });

  afterEach(() => {
    container.remove();
  });

  function renderTestRouter(initialEntry: string) {
    const root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<LocationDisplay label="Login Screen" />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<LocationDisplay label="Dashboard Screen" />} />
              <Route element={<RequirePermission permission="buyers:view" />}>
                <Route path="/buyer-accounts" element={<LocationDisplay label="Buyers Screen" />} />
              </Route>
              <Route element={<RequirePermission permission="orders:view" />}>
                <Route path="/orders" element={<LocationDisplay label="Orders Screen" />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    });
    return root;
  }

  it('shows Loading state while session is being fetched', () => {
    mockUseSession.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    const root = renderTestRouter('/buyer-accounts');
    expect(container.textContent).toContain('Loading…');
    act(() => root.unmount());
  });

  it('redirects unauthenticated users to /login even on unknown routes', () => {
    mockUseSession.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    });

    const root1 = renderTestRouter('/orders');
    expect(container.textContent).toContain('Login Screen (/login)');
    act(() => root1.unmount());

    const root2 = renderTestRouter('/does-not-exist');
    expect(container.textContent).toContain('Login Screen (/login)');
    act(() => root2.unmount());
  });

  it('redirects index route (/) to /dashboard for authenticated admins', () => {
    mockUseSession.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'adm-1',
        email: 'admin@tavkil.com',
        name: 'Admin',
        permissions: ['dashboard:view'],
      },
    });

    const root = renderTestRouter('/');
    expect(container.textContent).toContain('Dashboard Screen (/dashboard)');
    act(() => root.unmount());
  });

  it('blocks routes when admin lacks required permission and redirects to /dashboard', () => {
    mockUseSession.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'adm-1',
        email: 'editor@tavkil.com',
        name: 'Editor',
        permissions: ['products:view'],
      },
    });

    const root = renderTestRouter('/orders');
    expect(container.textContent).toContain('Dashboard Screen (/dashboard)');
    act(() => root.unmount());
  });

  it('allows access when admin holds exact permission or wildcard (*)', () => {
    mockUseSession.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'adm-1',
        email: 'sales@tavkil.com',
        name: 'Sales',
        permissions: ['orders:view'],
      },
    });

    const root1 = renderTestRouter('/orders');
    expect(container.textContent).toContain('Orders Screen (/orders)');
    act(() => root1.unmount());

    mockUseSession.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'adm-2',
        email: 'owner@tavkil.com',
        name: 'Owner',
        permissions: ['*'],
      },
    });

    const root2 = renderTestRouter('/buyer-accounts');
    expect(container.textContent).toContain('Buyers Screen (/buyer-accounts)');
    act(() => root2.unmount());
  });

  it('renders Global 404 NotFoundPage on unknown routes and navigates back to /dashboard', () => {
    mockUseSession.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'adm-1',
        email: 'owner@tavkil.com',
        name: 'Owner',
        permissions: ['*'],
      },
    });

    const root = renderTestRouter('/unknown-feature/123');
    expect(container.textContent).toContain('Error 404');
    expect(container.textContent).toContain('Page not found');
    expect(container.textContent).toContain('/unknown-feature/123');

    const backToDashboardBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Back to dashboard'),
    );
    expect(backToDashboardBtn).toBeDefined();

    act(() => {
      backToDashboardBtn!.click();
    });

    expect(container.textContent).toContain('Dashboard Screen (/dashboard)');
    act(() => root.unmount());
  });
});
